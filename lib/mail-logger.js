import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// ── Environment variable loader ──────────────────────────────────
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPaths = ['.env.local', '.env'];
    for (const file of envPaths) {
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length - 1);
          }
          process.env[k] = v;
          if (k === key) return v;
        }
      }
    }
  } catch (e) {}
  return process.env[key] || '';
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || '';

// Server-side privileged client — never exported to client or browser
export const privilegedSupabase = (supabaseUrl && serviceRoleKey)
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

// Local fallback store path (safe for both local dev and serverless read-only filesystems)
const LOCAL_STORE_PATH = process.env.VERCEL
  ? path.resolve(os.tmpdir(), 'mail_log.json')
  : path.resolve(process.cwd(), '.data', 'mail_log.json');

function ensureLocalStoreDir() {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {}
}

function readLocalStore() {
  try {
    ensureLocalStoreDir();
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[mail-logger] Could not read local store:', e.message);
  }
  return [];
}

function writeLocalStore(logs) {
  try {
    ensureLocalStoreDir();
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.warn('[mail-logger] Could not write local store:', e.message);
  }
}

let supabaseTableAvailable = null; // null: untested, true: exists, false: fallback

async function testSupabaseTable() {
  if (!privilegedSupabase) {
    supabaseTableAvailable = false;
    return false;
  }
  try {
    const { error } = await privilegedSupabase.from('mail_log').select('id').limit(1);
    if (!error) {
      supabaseTableAvailable = true;
      return true;
    }
    // Table missing or schema error
    supabaseTableAvailable = false;
    return false;
  } catch (e) {
    supabaseTableAvailable = false;
    return false;
  }
}

// ── Idempotency Check ─────────────────────────────────────────────
/**
 * Checks whether an email + registration_id has already been successfully sent.
 * Blocks duplicate sends unless explicitly overridden with resend=true.
 */
export async function checkAlreadySent(recipientEmail, registrationId) {
  if (!recipientEmail) return false;
  const cleanEmail = String(recipientEmail).trim().toLowerCase();
  const cleanRegId = registrationId ? String(registrationId).trim() : null;

  if (supabaseTableAvailable !== false && privilegedSupabase) {
    try {
      let query = privilegedSupabase
        .from('mail_log')
        .select('id, status')
        .ilike('recipient_email', cleanEmail)
        .eq('status', 'sent');

      if (cleanRegId) {
        query = query.eq('registration_id', cleanRegId);
      }

      const { data, error } = await query.limit(1);
      if (!error && data && data.length > 0) {
        return true;
      }
      if (error && (error.code === '42P01' || error.message?.includes('schema cache'))) {
        supabaseTableAvailable = false;
      }
    } catch (e) {}
  }

  // Check local fallback
  const local = readLocalStore();
  return local.some(item =>
    String(item.recipient_email || '').toLowerCase() === cleanEmail &&
    item.status === 'sent' &&
    (!cleanRegId || String(item.registration_id || '') === cleanRegId)
  );
}

// ── Create Mail Log Entry (Queued) ────────────────────────────────
export async function createMailLogEntry({
  batchId = null,
  registrationId = null,
  delegateName = '',
  recipientEmail,
  delegation = '',
  committee = '',
  whatsappLink = null,
  subject = '',
  status = 'queued',
  error = null,
  providerMessageId = null,
  attempts = 1,
  sentAt = null
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const record = {
    id,
    created_at: createdAt,
    batch_id: batchId,
    registration_id: registrationId ? String(registrationId) : null,
    delegate_name: delegateName || null,
    recipient_email: String(recipientEmail).trim().toLowerCase(),
    delegation: delegation || null,
    committee: committee || null,
    whatsapp_link: whatsappLink || null,
    subject: subject || null,
    status,
    error: error ? String(error) : null,
    provider_message_id: providerMessageId || null,
    attempts: typeof attempts === 'number' ? attempts : 1,
    sent_at: sentAt ? new Date(sentAt).toISOString() : null
  };

  // Always save to local fallback for safety
  const local = readLocalStore();
  local.unshift(record);
  writeLocalStore(local);

  if (supabaseTableAvailable !== false && privilegedSupabase) {
    try {
      const { error: insertErr } = await privilegedSupabase.from('mail_log').insert([record]);
      if (insertErr) {
        if (insertErr.code === '42P01' || insertErr.message?.includes('schema cache')) {
          supabaseTableAvailable = false;
        } else {
          console.warn('[mail-logger] Supabase insert warning:', insertErr.message);
        }
      } else {
        supabaseTableAvailable = true;
      }
    } catch (e) {}
  }

  return record;
}

// ── Update Mail Log Entry (Sent / Failed) ─────────────────────────
export async function updateMailLogEntry(id, updates) {
  if (!id) return null;

  const patch = { ...updates };
  if (patch.sent_at && typeof patch.sent_at === 'object') {
    patch.sent_at = patch.sent_at.toISOString();
  }

  // Update local store
  const local = readLocalStore();
  const idx = local.findIndex(l => l.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...patch };
    writeLocalStore(local);
  }

  if (supabaseTableAvailable !== false && privilegedSupabase) {
    try {
      const { error: updateErr } = await privilegedSupabase
        .from('mail_log')
        .update(patch)
        .eq('id', id);

      if (updateErr) {
        if (updateErr.code === '42P01' || updateErr.message?.includes('schema cache')) {
          supabaseTableAvailable = false;
        } else {
          console.warn('[mail-logger] Supabase update warning:', updateErr.message);
        }
      }
    } catch (e) {}
  }

  return idx !== -1 ? local[idx] : null;
}

// ── Log Skipped Delegate ──────────────────────────────────────────
export async function logSkippedDelegate({
  batchId = null,
  registrationId = null,
  delegateName = '',
  recipientEmail,
  delegation = '',
  committee = '',
  whatsappLink = null,
  subject = '',
  reason = 'Missing required email or WhatsApp community link'
}) {
  return createMailLogEntry({
    batchId,
    registrationId,
    delegateName,
    recipientEmail: recipientEmail || 'missing_email@unassigned',
    delegation,
    committee,
    whatsappLink,
    subject,
    status: 'skipped',
    error: reason,
    attempts: 0,
    sentAt: null
  });
}

// ── Query Mail Logs with Filters & Pagination ─────────────────────
export async function queryMailLogs({
  page = 1,
  limit = 50,
  status = 'all',
  committee = 'all',
  delegation = 'all',
  search = '',
  from = '',
  to = '',
  exportAll = false
}) {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  const offset = (currentPage - 1) * pageSize;

  let items = [];
  let totalCount = 0;
  let summary = { total: 0, sent: 0, failed: 0, skipped: 0, queued: 0 };
  let distinctCommittees = new Set();
  let distinctDelegations = new Set();

  let useDb = false;
  if (supabaseTableAvailable !== false && privilegedSupabase) {
    try {
      // Fetch summary counts from DB
      const { data: allRows, error } = await privilegedSupabase
        .from('mail_log')
        .select('id, status, committee, delegation');

      if (!error && Array.isArray(allRows)) {
        useDb = true;
        supabaseTableAvailable = true;

        allRows.forEach(r => {
          summary.total++;
          if (r.status && summary[r.status] !== undefined) {
            summary[r.status]++;
          }
          if (r.committee) distinctCommittees.add(r.committee);
          if (r.delegation) distinctDelegations.add(r.delegation);
        });

        // Filter query
        let query = privilegedSupabase
          .from('mail_log')
          .select('*', { count: 'exact' });

        if (status && status !== 'all') {
          query = query.eq('status', status.toLowerCase());
        }
        if (committee && committee !== 'all') {
          query = query.eq('committee', committee);
        }
        if (delegation && delegation !== 'all') {
          query = query.eq('delegation', delegation);
        }
        if (search) {
          query = query.or(`delegate_name.ilike.%${search}%,recipient_email.ilike.%${search}%,registration_id.ilike.%${search}%`);
        }
        if (from) {
          query = query.gte('created_at', new Date(from).toISOString());
        }
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', toDate.toISOString());
        }

        query = query.order('created_at', { ascending: false });

        if (!exportAll) {
          query = query.range(offset, offset + pageSize - 1);
        }

        const { data, count, error: queryErr } = await query;
        if (!queryErr && Array.isArray(data)) {
          items = data;
          totalCount = count !== null ? count : data.length;
        }
      }
    } catch (e) {
      useDb = false;
    }
  }

  // Fallback to local store if DB was unreachable or empty while local store has records
  if (!useDb) {
    const all = readLocalStore();
    all.forEach(r => {
      summary.total++;
      if (r.status && summary[r.status] !== undefined) {
        summary[r.status]++;
      }
      if (r.committee) distinctCommittees.add(r.committee);
      if (r.delegation) distinctDelegations.add(r.delegation);
    });

    let filtered = all.filter(r => {
      if (status && status !== 'all' && String(r.status).toLowerCase() !== status.toLowerCase()) return false;
      if (committee && committee !== 'all' && r.committee !== committee) return false;
      if (delegation && delegation !== 'all' && r.delegation !== delegation) return false;
      if (search) {
        const s = search.toLowerCase();
        const matchesName = String(r.delegate_name || '').toLowerCase().includes(s);
        const matchesEmail = String(r.recipient_email || '').toLowerCase().includes(s);
        const matchesId = String(r.registration_id || '').toLowerCase().includes(s);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }
      if (from) {
        const d = new Date(r.created_at);
        if (d < new Date(from)) return false;
      }
      if (to) {
        const d = new Date(r.created_at);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        if (d > toDate) return false;
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    totalCount = filtered.length;

    if (exportAll) {
      items = filtered;
    } else {
      items = filtered.slice(offset, offset + pageSize);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return {
    success: true,
    summary,
    items,
    page: currentPage,
    limit: pageSize,
    totalCount,
    totalPages,
    distinctCommittees: Array.from(distinctCommittees).sort(),
    distinctDelegations: Array.from(distinctDelegations).sort(),
    source: useDb ? 'database' : 'local_fallback'
  };
}

// ── Get Single Log by ID ──────────────────────────────────────────
export async function getMailLogById(id) {
  if (!id) return null;

  if (supabaseTableAvailable !== false && privilegedSupabase) {
    try {
      const { data, error } = await privilegedSupabase
        .from('mail_log')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      if (!error && data) return data;
    } catch (e) {}
  }

  const local = readLocalStore();
  return local.find(item => item.id === id) || null;
}
