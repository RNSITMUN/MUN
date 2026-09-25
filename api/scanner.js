import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase.js';
import { resolvePublicToken, getPublicToken, createStaffSession, verifyStaffSession } from '../lib/token.js';

// Local storage fallback for checkpoints
const LOCAL_STORE_PATH = path.resolve(process.cwd(), '.data', 'checkpoints.json');

function ensureDataDir() {
  const dir = path.dirname(LOCAL_STORE_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
}

function readLocalCheckpoints() {
  ensureDataDir();
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch (e) {}
  return {};
}

function writeLocalCheckpoints(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

const VALID_CHECKPOINTS = [
  'day1_entry',
  'day1_lunch',
  'day1_refreshment',
  'day2_entry',
  'day2_lunch',
  'day2_refreshment',
  'allocation'
];

function applyCors(req, res, methods = 'GET,POST,OPTIONS') {
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
    res.status(403).json({ success: false, error: 'Access forbidden: unauthorized origin.' });
    return false;
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  return true;
}

// ─────────────────────────────────────────────────────────────
// 1. Staff Authentication
// ─────────────────────────────────────────────────────────────
async function handleStaffAuth(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST supported.' });
  }

  const body = req.body || {};
  const submittedPin = String(body.pin || '').trim();

  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  let serverPin = (process.env.ORGANIZER_PIN || '').trim();

  if (!serverPin && !isProduction) {
    serverPin = '6078';
  }

  if (isProduction && !serverPin) {
    console.error('🚨 [Security Alert] ORGANIZER_PIN is not configured in production environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server security configuration error: Staff authentication is disabled until ORGANIZER_PIN is configured in production environment variables.'
    });
  }

  if (!submittedPin) {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  let isValid = false;
  try {
    const subBuf = Buffer.from(submittedPin);
    const srvBuf = Buffer.from(serverPin);
    if (subBuf.length === srvBuf.length && crypto.timingSafeEqual(subBuf, srvBuf)) {
      isValid = true;
    }
  } catch (e) {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid Organizer PIN.' });
  }

  const sessionToken = createStaffSession();
  return res.status(200).json({
    success: true,
    message: 'Staff authentication successful.',
    sessionToken,
    expiresIn: 86400,
    role: 'organizer'
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Checkpoint Update
// ─────────────────────────────────────────────────────────────
async function handleUpdateCheckpoint(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST supported.' });
  }

  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const sessionToken = tokenFromHeader || req.body?.sessionToken || '';

  if (!sessionToken || !verifyStaffSession(sessionToken)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid staff session required to update checkpoints.'
    });
  }

  const body = req.body || {};
  let { token, id, type, member_index, checkpoint_key, redeemed, redeemed_by, notes, allocated_committee, allocated_portfolio } = body;

  let recordType = type;
  let recordId = id;

  if (token) {
    const resolved = resolvePublicToken(token);
    if (resolved) {
      recordType = resolved.type;
      recordId = resolved.id;
    }
  }

  if (!recordId) {
    return res.status(400).json({ success: false, error: 'Missing delegate identification (token or id).' });
  }

  recordType = String(recordType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';
  const cleanKey = String(checkpoint_key || '').trim().toLowerCase();
  const memberIdx = parseInt(member_index || 0, 10) || 0;
  const isRedeemed = redeemed !== false;
  const staffName = String(redeemed_by || 'Organizer').trim();

  if (!VALID_CHECKPOINTS.includes(cleanKey)) {
    return res.status(400).json({
      success: false,
      error: `Invalid checkpoint_key. Must be one of: ${VALID_CHECKPOINTS.join(', ')}`
    });
  }

  const localKey = `${recordType}_${recordId}_${memberIdx}`;
  const localStore = readLocalCheckpoints();
  if (!localStore[localKey]) localStore[localKey] = {};

  const nowIso = new Date().toISOString();
  let updatedRecord = {
    checkpoint_key: cleanKey,
    redeemed: isRedeemed,
    redeemed_at: isRedeemed ? nowIso : null,
    redeemed_by: isRedeemed ? staffName : null,
    notes: notes || null
  };

  if (allocated_committee !== undefined) updatedRecord.allocated_committee = allocated_committee;
  if (allocated_portfolio !== undefined) updatedRecord.allocated_portfolio = allocated_portfolio;

  localStore[localKey][cleanKey] = updatedRecord;
  writeLocalCheckpoints(localStore);

  if (supabase) {
    try {
      const matchCriteria = {
        record_type: recordType,
        record_id: String(recordId),
        member_index: memberIdx,
        checkpoint_key: cleanKey
      };

      const payload = {
        ...matchCriteria,
        redeemed: isRedeemed,
        redeemed_at: isRedeemed ? nowIso : null,
        redeemed_by: isRedeemed ? staffName : null,
        notes: notes || null
      };

      if (allocated_committee !== undefined) payload.allocated_committee = allocated_committee;
      if (allocated_portfolio !== undefined) payload.allocated_portfolio = allocated_portfolio;

      const { data, error } = await supabase
        .from('delegate_checkpoints')
        .upsert(payload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' })
        .select()
        .single();

      if (!error && data) {
        return res.status(200).json({
          success: true,
          source: 'database',
          checkpoint: data
        });
      }
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    source: 'local_store',
    checkpoint: updatedRecord
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Scan Statistics
// ─────────────────────────────────────────────────────────────
async function handleScanStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Only GET supported.' });
  }

  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const sessionToken = tokenFromHeader || req.query?.sessionToken || '';

  if (!sessionToken || !verifyStaffSession(sessionToken)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Staff session required to access stats.'
    });
  }

  const stats = {
    total_delegates: 0,
    checkpoints: {
      day1_entry: 0,
      day1_lunch: 0,
      day1_refreshment: 0,
      day2_entry: 0,
      day2_lunch: 0,
      day2_refreshment: 0
    }
  };

  const localStore = readLocalCheckpoints();
  const seenDelegates = new Set();

  for (const [key, checkpoints] of Object.entries(localStore)) {
    seenDelegates.add(key);
    for (const [cpKey, cpVal] of Object.entries(checkpoints)) {
      if (cpVal && cpVal.redeemed && stats.checkpoints[cpKey] !== undefined) {
        stats.checkpoints[cpKey]++;
      }
    }
  }
  stats.total_delegates = seenDelegates.size;

  if (supabase) {
    try {
      const { data: dbCheckpoints, error } = await supabase
        .from('delegate_checkpoints')
        .select('record_type, record_id, member_index, checkpoint_key, redeemed')
        .eq('redeemed', true);

      if (!error && Array.isArray(dbCheckpoints)) {
        const dbStats = {
          day1_entry: 0,
          day1_lunch: 0,
          day1_refreshment: 0,
          day2_entry: 0,
          day2_lunch: 0,
          day2_refreshment: 0
        };
        const dbUnique = new Set();

        dbCheckpoints.forEach(row => {
          dbUnique.add(`${row.record_type}_${row.record_id}_${row.member_index}`);
          if (dbStats[row.checkpoint_key] !== undefined) {
            dbStats[row.checkpoint_key]++;
          }
        });

        return res.status(200).json({
          success: true,
          source: 'database',
          stats: {
            total_delegates: Math.max(dbUnique.size, stats.total_delegates),
            checkpoints: dbStats
          }
        });
      }
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    source: 'local_store',
    stats
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Hub Data & Search
// ─────────────────────────────────────────────────────────────
async function handleHubData(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Only GET supported.' });
  }

  const tokenParam = (req.query?.t || req.query?.token || '').trim();
  const idParam = (req.query?.id || '').trim();
  const typeParam = (req.query?.type || '').trim();
  const queryParam = (req.query?.q || req.query?.query || '').trim();
  if (queryParam) {
    const rawQ = String(queryParam).trim();
    const cleanQ = rawQ.toLowerCase();
    const results = [];

    if (supabase) {
      try {
        const { data: regList } = await supabase
          .from('registrations')
          .select('id, name, email, phone, institution, committee1, portfolio1_1, status, usn, delegate_type')
          .limit(50);

        if (Array.isArray(regList)) {
          regList.forEach(r => {
            const rName = r.name || r.full_name || '';
            const match =
              (rName && rName.toLowerCase().includes(cleanQ)) ||
              (r.email && r.email.toLowerCase().includes(cleanQ)) ||
              (r.phone && r.phone.includes(cleanQ)) ||
              (r.usn && r.usn.toLowerCase().includes(cleanQ)) ||
              String(r.id) === rawQ;

            if (match) {
              const pubToken = getPublicToken('individual', r.id);
              results.push({
                type: 'individual',
                id: r.id,
                token: pubToken,
                name: rName,
                email: r.email,
                phone: r.phone,
                institution: r.institution || r.college || '',
                usn: r.usn || '',
                delegateType: r.delegate_type || 'Individual Delegate',
                status: r.status,
                allocated_committee: r.committee1 || '',
                allocated_portfolio: r.portfolio1_1 || ''
              });
            }
          });
        }

        const { data: delList } = await supabase
          .from('delegations')
          .select('id, delegation_name, head_name, email, phone, status, member_count')
          .limit(50);

        if (Array.isArray(delList)) {
          delList.forEach(d => {
            const dName = d.delegation_name || d.head_name || '';
            const match =
              (d.delegation_name && d.delegation_name.toLowerCase().includes(cleanQ)) ||
              (d.head_name && d.head_name.toLowerCase().includes(cleanQ)) ||
              (d.email && d.email.toLowerCase().includes(cleanQ)) ||
              (d.phone && d.phone.includes(cleanQ)) ||
              String(d.id) === rawQ;

            if (match) {
              const pubToken = getPublicToken('delegation', d.id);
              results.push({
                type: 'delegation',
                id: d.id,
                token: pubToken,
                name: dName,
                headName: d.head_name || '',
                email: d.email,
                phone: d.phone,
                institution: d.delegation_name,
                status: d.status,
                allocated_committee: 'Institutional Delegation',
                allocated_portfolio: `${d.member_count || 1} Member Delegation`
              });
            }
          });
        }
      } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      query: rawQ,
      results: results.slice(0, 15)
    });
  }

  // ── Single Pass Lookup ──
  let targetType = typeParam;
  let targetId = idParam;

  if (tokenParam) {
    const resolved = resolvePublicToken(tokenParam);
    if (resolved) {
      targetType = resolved.type;
      targetId = resolved.id;
    } else {
      targetType = 'individual';
      targetId = tokenParam;
    }
  }

  if (!targetId) {
    return res.status(400).json({ success: false, error: 'Missing token or id parameter.' });
  }

  targetType = String(targetType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';

  let record = null;
  let checkpoints = {};

  if (supabase) {
    try {
      if (targetType === 'individual') {
        const { data } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', targetId)
          .single();
        record = data;
      } else {
        const { data } = await supabase
          .from('delegations')
          .select('*')
          .eq('id', targetId)
          .single();
        record = data;
      }

      if (record) {
        const { data: cpRows } = await supabase
          .from('delegate_checkpoints')
          .select('*')
          .eq('record_type', targetType)
          .eq('record_id', String(targetId));

        if (Array.isArray(cpRows)) {
          cpRows.forEach(row => {
            const mIdx = row.member_index || 0;
            if (!checkpoints[mIdx]) checkpoints[mIdx] = {};
            checkpoints[mIdx][row.checkpoint_key] = row;
          });
        }
      }
    } catch (e) {}
  }

  // Merge local store checkpoints
  const localStore = readLocalCheckpoints();
  const maxScanIdx = Math.max(50, Array.isArray(record?.roster_data) ? record.roster_data.length : 0);
  for (let mIdx = 0; mIdx < maxScanIdx; mIdx++) {
    const lk = `${targetType}_${targetId}_${mIdx}`;
    if (localStore[lk]) {
      if (!checkpoints[mIdx]) checkpoints[mIdx] = {};
      for (const [cpKey, cpVal] of Object.entries(localStore[lk])) {
        if (!checkpoints[mIdx][cpKey] || cpVal.redeemed) {
          checkpoints[mIdx][cpKey] = cpVal;
        }
      }
    }
  }

  // Generate tokens
  const publicToken = getPublicToken(targetType, targetId);
  const passUrl = `https://mun.rnsit.ac.in/hub?t=${publicToken}`;

  // If no record found in db, provide clean fallback structure
  if (!record) {
    record = {
      id: targetId,
      name: `Delegate #${targetId}`,
      institution: 'Registered Institution',
      committee1: 'UNGA — United Nations General Assembly',
      portfolio1_1: 'Delegate Portfolio',
      status: 'confirmed'
    };
  }

  const delegateDisplayName = record.name || record.full_name || record.delegation_name || record.head_name || record.head_delegate_name || 'Official Delegate';
  const delegateInstitution = record.institution || record.college || '';
  const delegateType = record.delegate_type || record.delegation_type || (targetType === 'delegation' ? 'Delegation' : 'Individual Delegate');
  const allocComm = checkpoints[0]?.allocation?.allocated_committee || record.allocated_committee || record.committee1 || 'General Assembly';
  const allocPort = checkpoints[0]?.allocation?.allocated_portfolio || record.allocated_portfolio || record.portfolio1_1 || 'General Delegate';

  // Parse roster if delegation
  let roster = null;
  if (targetType === 'delegation' && Array.isArray(record.roster_data)) {
    roster = record.roster_data.map((m, idx) => ({
      index: idx,
      name: m.name || m['Delegate Name'] || `Delegate ${idx + 1}`,
      email: m.email || m.emailAddress || m['Email Address'] || '',
      phone: m.phone || m.mobileNumber || m['WhatsApp / Mobile Number'] || '',
      committee: checkpoints[idx]?.allocation?.allocated_committee || m.allocated_committee || m.committee || m.committee1 || m['Committee Preference 1'] || 'Delegate',
      portfolio: checkpoints[idx]?.allocation?.allocated_portfolio || m.allocated_portfolio || m.portfolio || m.portfolio1_1 || m['Portfolio Preference 1'] || 'Assigned Portfolio',
      checkpoints: checkpoints[idx] || {}
    }));
  }

  const passPayload = {
    type: targetType,
    id: record.id,
    token: publicToken,
    pass_url: passUrl,
    passUrl: passUrl,
    name: delegateDisplayName,
    institution: delegateInstitution,
    delegate_type: delegateType,
    delegateType: delegateType,
    usn: record.usn || '',
    city: record.city || 'Bengaluru',
    email: record.email || record.head_delegate_email || '',
    phone: record.phone || record.head_delegate_phone || '',
    status: record.status || 'Confirmed',
    allocated_committee: allocComm,
    allocatedCommittee: allocComm,
    allocated_portfolio: allocPort,
    allocatedPortfolio: allocPort,
    checkpoints: checkpoints[0] || {},
    allCheckpoints: checkpoints,
    roster: roster
  };

  return res.status(200).json({
    success: true,
    pass: passPayload,
    data: {
      type: targetType,
      pass: passPayload
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Unified Request Router
// ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = (req.url || '').split('?')[0];
  const action = req.query?.action || req.body?.action || '';

  if (url.endsWith('/staff-auth') || action === 'auth' || (req.method === 'POST' && req.body?.pin)) {
    return handleStaffAuth(req, res);
  }

  if (url.endsWith('/update-checkpoint') || action === 'update' || (req.method === 'POST' && req.body?.checkpoint_key)) {
    return handleUpdateCheckpoint(req, res);
  }

  if (url.endsWith('/scan-stats') || action === 'stats') {
    return handleScanStats(req, res);
  }

  return handleHubData(req, res);
}
