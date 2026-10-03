import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  queryMailLogs,
  getMailLogById,
  updateMailLogEntry,
  createMailLogEntry,
  privilegedSupabase
} from './mail-logger.js';
import { resolveCommitteeWhatsApp, resolveCommitteeBgGuide } from './committees.js';

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

// ── Email template generator for pass resends ──────────────────────
function buildPassHtml(delegate) {
  const name = delegate.name || delegate.delegate_name || 'Delegate';
  const committee = delegate.allocated_committee || delegate.committee || 'UNSC';
  const portfolio = delegate.allocated_portfolio || delegate.portfolio || 'Delegate';
  const regId = delegate.allocation_id || delegate.registration_id || 'REG-2026';
  const institution = delegate.institution || 'RNSIT';
  const type = delegate.delegation_name || delegate.delegation || 'Individual';
  const hubUrl = delegate.hub_pass_url || delegate.hub_url || `https://mun.rnsit.ac.in/hub?id=${encodeURIComponent(regId)}`;
  const qrUrl = delegate.qr_badge_path || delegate.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(hubUrl)}`;
  const waLink = delegate.whatsapp_community_link || delegate.whatsapp_link || resolveCommitteeWhatsApp(committee) || 'https://chat.whatsapp.com/G5y1o155s6y9017';
  const bgGuideUrl = delegate.bg_guide_url || resolveCommitteeBgGuide(committee);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RNS MUN 2026 — Official Delegate Pass &amp; Committee Dossier</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF6F0; color: #221F1E; margin: 0; padding: 24px 12px; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1.5px solid #E8DDD0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(108, 13, 44, 0.06);">
    <div style="background: #6C0D2C; color: #FFF7EB; padding: 28px 20px; text-align: center; border-bottom: 3px solid #C89B3C;">
      <img src="https://mun.rnsit.ac.in/assets/Logos/RNS_MUN_2026.png" alt="RNS MUN 2026" style="max-width: 240px; width: 100%; height: auto; margin-bottom: 12px;" />
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #E8C882;">Core Secretariat • Official Dossier</div>
      <h1 style="font-size: 19px; font-weight: 800; color: #FFFFFF; margin: 4px 0 0 0;">Digital Delegate Pass &amp; Committee Credential</h1>
    </div>
    <div style="padding: 24px 20px;">
      <div style="font-size: 16px; font-weight: 700; color: #6C0D2C; margin-bottom: 8px;">Dear ${name},</div>
      <p style="font-size: 14px; color: #4A423F; margin-top: 0;">Greetings from the Core Secretariat of <strong>RNS Model United Nations 2026</strong>. Please find your verified credentials below:</p>
      
      <div style="background: #FFFDF9; border: 1.5px solid #E8DDD0; border-radius: 10px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 11px; font-weight: 800; color: #6C0D2C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">✦ Diplomatic Appointment Dossier</div>
        <div style="font-size: 13px; color: #7D736E;">Allocated Committee:</div>
        <div style="font-size: 17px; font-weight: 800; color: #6C0D2C; margin-bottom: 8px;">${committee}</div>
        <div style="font-size: 13px; color: #7D736E;">Allocated Portfolio / Representation:</div>
        <div style="font-size: 16px; font-weight: 700; color: #221F1E; margin-bottom: 10px;">${portfolio}</div>
        <div style="font-size: 12.5px; color: #555; border-top: 1px dashed #DDD; padding-top: 8px;">
          <div><strong>Pass Reference:</strong> #${regId}</div>
          <div><strong>Institution / Delegation:</strong> ${institution} (${type})</div>
        </div>
      </div>

      <div style="background: #FFF7EB; border: 2px solid #C89B3C; border-radius: 12px; padding: 20px; text-align: center; margin: 18px 0;">
        <div style="font-size: 15px; font-weight: 800; color: #6C0D2C; margin-bottom: 10px;">Official Digital Delegate Pass</div>
        <img src="${qrUrl}" alt="Delegate QR Pass" width="160" height="160" style="border: 2px solid #000; border-radius: 8px; margin-bottom: 10px;" />
        <div style="margin-top: 8px;">
          <a href="${hubUrl}" target="_blank" style="display: inline-block; background: #6C0D2C; color: #FFF7EB; font-weight: 800; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 6px;">Open Live Delegate Pass &rarr;</a>
        </div>
      </div>

      <div style="background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 10px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 14px; font-weight: 800; color: #166534; margin-bottom: 4px;">💬 Committee WhatsApp Caucus</div>
        <p style="font-size: 13px; color: #15803D; margin: 4px 0 10px 0;">Real-time session updates and unmoderated caucus collaboration take place in your committee channel:</p>
        <div style="text-align: center;">
          <a href="${waLink}" target="_blank" style="display: inline-block; background: #25D366; color: #FFFFFF; font-weight: 800; font-size: 13px; text-decoration: none; padding: 10px 18px; border-radius: 6px;">Join ${committee} WhatsApp Group &rarr;</a>
        </div>
      </div>

      <div style="font-size: 12.5px; color: #7D736E; border-top: 1px solid #E8DDD0; padding-top: 14px; margin-top: 20px; text-align: center;">
        <strong>Conference Dates:</strong> 06 - 07 October 2026 • 08:00 AM Registration<br>
        <strong>Venue:</strong> RNS Institute of Technology (RNSIT), Bengaluru • <a href="mailto:mun@rnsit.ac.in" style="color: #6C0D2C;">mun@rnsit.ac.in</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Main API Route Handler ─────────────────────────────────────────
export default async function handler(req, res) {
  // Ensure query params exist even if called from custom router
  if (!req.query && req.url && req.url.includes('?')) {
    const urlObj = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(urlObj.searchParams.entries());
  }

  // ── CORS Guard ──
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://mun.rnsit.ac.in',
    'https://www.mun.rnsit.ac.in',
    'https://mun-rnsit.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.rnsit.ac.in');

  if (!isAllowed) {
    return res.status(403).json({ success: false, error: 'Access forbidden: unauthorized origin.' });
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Authentication Check on EVERY request ────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Missing session token.'
    });
  }

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
  const anonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
  const authClient = (supabaseUrl && anonKey)
    ? createClient(supabaseUrl, anonKey, { auth: { persistSession: false } })
    : privilegedSupabase;

  if (!authClient) {
    return res.status(500).json({
      success: false,
      error: 'Auth client initialization failed.'
    });
  }

  try {
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session invalid or expired. Please sign in again.'
      });
    }
  } catch (e) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token validation failed.'
    });
  }

  // ── GET ?source=shared: the single, persistent mail log (Supabase mail_logs) ──
  // Every device reads this same table. Never cached; no per-instance file fallback.
  if (req.method === 'GET' && (req.query || {}).source === 'shared') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (!privilegedSupabase) {
      return res.status(503).json({ success: false, error: 'Shared mail log unavailable: server database credentials are not configured.' });
    }
    try {
      const { data, error } = await privilegedSupabase
        .from('mail_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) {
        return res.status(500).json({ success: false, error: 'Could not read mail_logs: ' + error.message });
      }
      return res.status(200).json({ success: true, logs: data || [], serverTime: new Date().toISOString() });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Shared mail log query failed.' });
    }
  }

  // ── GET: Query logs with filters & pagination ───────────────────
  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit = '50',
        status = 'all',
        committee = 'all',
        delegation = 'all',
        search = '',
        from = '',
        to = '',
        export_all = 'false'
      } = req.query || {};

      const result = await queryMailLogs({
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        status,
        committee,
        delegation,
        search,
        from,
        to,
        exportAll: export_all === 'true' || export_all === '1'
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('[admin-mail-log] Query error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal error querying mail logs.'
      });
    }
  }

  // ── POST: Actions (Resend / Retry All Failed) ────────────────────
  if (req.method === 'POST') {
    try {
      const { action, id, scriptUrl: customScriptUrl } = req.body || {};

      const scriptUrl = (customScriptUrl || getEnv('GOOGLE_SCRIPT_MAILER_URL') || '').trim();

      // Action 0: Recover records that only ever existed in an admin's browser (additive, never deletes).
      // Inserts entries missing from the shared mail_logs table, preserving their original timestamps.
      if (action === 'backfill_local') {
        if (!privilegedSupabase) {
          return res.status(503).json({ success: false, error: 'Shared mail log unavailable: server database credentials are not configured.' });
        }
        const incoming = Array.isArray((req.body || {}).entries) ? req.body.entries.slice(0, 5000) : [];
        const { data: existing, error: exErr } = await privilegedSupabase
          .from('mail_logs').select('recipient, created_at').limit(20000);
        if (exErr) return res.status(500).json({ success: false, error: 'Could not read mail_logs: ' + exErr.message });

        const WINDOW_MS = 120000; // same person + within 2 min = same send (server row vs. browser entry)
        const byRecipient = {};
        (existing || []).forEach(r => {
          const k = String(r.recipient || '').trim().toLowerCase();
          (byRecipient[k] = byRecipient[k] || []).push(new Date(r.created_at).getTime());
        });

        const toInsert = [];
        let duplicates = 0, invalid = 0;
        incoming.forEach(e => {
          const email = String((e && e.recipient) || '').trim();
          const ts = new Date(e && (e.sentAt || e.timestamp)).getTime();
          if (!email.includes('@') || isNaN(ts)) { invalid++; return; }
          const k = email.toLowerCase();
          const times = byRecipient[k] = byRecipient[k] || [];
          if (times.some(t => Math.abs(t - ts) <= WINDOW_MS)) { duplicates++; return; }
          times.push(ts); // also de-duplicates inside this batch
          const isMember = e.memberIndex !== null && e.memberIndex !== undefined && e.memberIndex !== '' && String(e.recordType) === 'delegation';
          toInsert.push({
            created_at: new Date(ts).toISOString(),
            recipient: email,
            recipient_name: String(e.recipientName || 'Unknown').trim(),
            record_type: String(e.recordType || 'individual').trim(),
            record_id: e.recordId ? (isMember ? `DEL-${e.recordId}-${String(Number(e.memberIndex) + 1).padStart(2, '0')}` : String(e.recordId)) : null,
            template_id: String(e.templateId || 'custom').trim(),
            template_name: String(e.templateName || 'Custom Email').trim(),
            subject: String(e.subject || '').trim(),
            status: 'sent'
          });
        });

        let inserted = 0;
        for (let i = 0; i < toInsert.length; i += 200) {
          const chunk = toInsert.slice(i, i + 200);
          const { error } = await privilegedSupabase.from('mail_logs').insert(chunk);
          if (error) {
            return res.status(500).json({ success: false, error: 'Backfill insert failed: ' + error.message, received: incoming.length, inserted, duplicates, invalid });
          }
          inserted += chunk.length;
        }
        return res.status(200).json({ success: true, received: incoming.length, inserted, duplicates, invalid });
      }

      // Action 1: Resend single log entry
      if (action === 'resend') {
        if (!id) {
          return res.status(400).json({ success: false, error: 'Log entry ID is required for resend.' });
        }

        const logEntry = await getMailLogById(id);
        if (!logEntry) {
          return res.status(404).json({ success: false, error: `Mail log entry ${id} not found.` });
        }

        if (!logEntry.recipient_email || !logEntry.recipient_email.includes('@')) {
          return res.status(400).json({ success: false, error: 'Recipient has no valid email address.' });
        }

        // Fetch master roster data if available
        let delegateDetails = {
          name: logEntry.delegate_name,
          allocated_committee: logEntry.committee,
          allocation_id: logEntry.registration_id,
          delegation_name: logEntry.delegation,
          email: logEntry.recipient_email,
          whatsapp_link: logEntry.whatsapp_link
        };

        const jsonPath = path.resolve(process.cwd(), 'data', 'allocations.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const roster = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            const found = roster.find(r =>
              String(r.allocation_id || r['Allocation ID']) === String(logEntry.registration_id) ||
              String(r.email || r['Email Address'] || '').toLowerCase() === String(logEntry.recipient_email).toLowerCase()
            );
            if (found) delegateDetails = { ...delegateDetails, ...found };
          } catch (e) {}
        }

        const subject = logEntry.subject || `Official Delegate Pass, QR Code & Committee WhatsApp Group — RNS MUN 2026 | ${delegateDetails.name || 'Delegate'}`;
        const htmlBody = buildPassHtml(delegateDetails);

        if (!scriptUrl) {
          await updateMailLogEntry(id, {
            status: 'failed',
            error: 'Google Apps Script URL is not configured on server.',
            attempts: (logEntry.attempts || 1) + 1
          });
          return res.status(400).json({
            success: false,
            error: 'Google Apps Script Mailer URL not configured. Configure it in Mail Templates tab.'
          });
        }

        // Update to queued
        await updateMailLogEntry(id, {
          status: 'queued',
          attempts: (logEntry.attempts || 1) + 1
        });

        // Dispatch email
        const payload = {
          recipient: logEntry.recipient_email,
          subject,
          htmlBody,
          from: 'mun@rnsit.ac.in',
          senderName: 'RNS MUN Secretariat',
          replyTo: 'mun@rnsit.ac.in'
        };

        const resp = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });

        const respText = await resp.text();
        let respData;
        try { respData = JSON.parse(respText); } catch (e) { respData = { raw: respText }; }

        if (resp.ok && respData.success !== false) {
          const updated = await updateMailLogEntry(id, {
            status: 'sent',
            sent_at: new Date().toISOString(),
            error: null,
            provider_message_id: respData.messageId || respData.id || null
          });
          return res.status(200).json({
            success: true,
            message: `Successfully resent pass to ${logEntry.recipient_email}`,
            entry: updated
          });
        } else {
          const errDetail = respData.error || `HTTP ${resp.status}: ${respText.slice(0, 150)}`;
          await updateMailLogEntry(id, {
            status: 'failed',
            error: errDetail
          });
          return res.status(500).json({
            success: false,
            error: `Dispatch failed: ${errDetail}`
          });
        }
      }

      // Action 2: Retry all failed rows
      if (action === 'retry_all_failed') {
        const queryRes = await queryMailLogs({ status: 'failed', limit: 500 });
        const failedItems = queryRes.items || [];

        if (failedItems.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No failed email logs found to retry.',
            retriedCount: 0
          });
        }

        if (!scriptUrl) {
          return res.status(400).json({
            success: false,
            error: 'Google Apps Script Mailer URL not configured. Configure it in Mail Templates tab.'
          });
        }

        let retried = 0;
        let succeeded = 0;
        let failedAgain = 0;

        for (const item of failedItems) {
          retried++;
          try {
            await updateMailLogEntry(item.id, {
              status: 'queued',
              attempts: (item.attempts || 1) + 1
            });

            const htmlBody = buildPassHtml({
              name: item.delegate_name,
              allocated_committee: item.committee,
              allocation_id: item.registration_id,
              delegation_name: item.delegation,
              email: item.recipient_email,
              whatsapp_link: item.whatsapp_link
            });

            const resp = await fetch(scriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                recipient: item.recipient_email,
                subject: item.subject || `Official Delegate Pass — RNS MUN 2026 | ${item.delegate_name || 'Delegate'}`,
                htmlBody,
                from: 'mun@rnsit.ac.in',
                senderName: 'RNS MUN Secretariat',
                replyTo: 'mun@rnsit.ac.in'
              })
            });

            const respText = await resp.text();
            let respData;
            try { respData = JSON.parse(respText); } catch (e) { respData = { raw: respText }; }

            if (resp.ok && respData.success !== false) {
              succeeded++;
              await updateMailLogEntry(item.id, {
                status: 'sent',
                sent_at: new Date().toISOString(),
                error: null
              });
            } else {
              failedAgain++;
              await updateMailLogEntry(item.id, {
                status: 'failed',
                error: respData.error || `HTTP ${resp.status}`
              });
            }
          } catch (itemErr) {
            failedAgain++;
            await updateMailLogEntry(item.id, {
              status: 'failed',
              error: itemErr.message
            });
          }
        }

        return res.status(200).json({
          success: true,
          message: `Retry batch complete: ${succeeded} sent, ${failedAgain} failed out of ${retried} attempted.`,
          succeeded,
          failedAgain,
          retried
        });
      }

      return res.status(400).json({
        success: false,
        error: `Unknown action: "${action}". Supported: "resend", "retry_all_failed".`
      });

    } catch (err) {
      console.error('[admin-mail-log] Action error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error processing mail log action.'
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed. Only GET, POST supported.' });
}
