import { supabase } from './_supabase.js';
import fs from 'fs';
import path from 'path';
import { resolvePublicToken, verifyStaffSession } from './_token.js';

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
  } catch (e) {
    console.warn('[update-checkpoint] Read error:', e.message);
  }
  return {};
}

function writeLocalCheckpoints(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[update-checkpoint] Write error:', e.message);
  }
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

export default async function handler(req, res) {
  // ─── CORS Guard ───────────────────────────────────────────────
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is supported.' });
  }

  // ─── Staff Authentication Check ───────────────────────────────
  // Verification is performed strictly via server-signed session token.
  // The frontend never possesses the secret PIN.
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

  let isAuthorized = verifyStaffSession(bearerToken);

  if (!isAuthorized && bearerToken && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser(bearerToken);
      if (authData?.user) isAuthorized = true;
    } catch (e) {}
  }

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Staff authentication required. Please sign in via the /scan portal.'
    });
  }

  const body = req.body || {};
  const {
    token: tokenParam,
    id: rawId,
    type: requestedType = 'individual',
    memberIndex = 0,
    checkpointKey,
    status = true,
    allocatedCommittee,
    allocatedPortfolio,
    force = false,
    staffName = 'Staff Member'
  } = body;

  let targetId = '';
  let targetType = (requestedType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';

  // Resolve target by public token or ID
  if (tokenParam) {
    const resolved = resolvePublicToken(tokenParam);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Unrecognized delegate pass token.' });
    }
    targetId = resolved.id;
    targetType = resolved.type;
  } else if (rawId) {
    targetId = String(rawId).trim();
  } else {
    return res.status(400).json({ success: false, error: 'Missing delegate token or ID.' });
  }

  if (!checkpointKey || !VALID_CHECKPOINTS.includes(checkpointKey)) {
    return res.status(400).json({
      success: false,
      error: `Invalid checkpoint key. Must be one of: ${VALID_CHECKPOINTS.join(', ')}`
    });
  }

  const nowIso = new Date().toISOString();
  const redeemedStatus = status === true || status === 'true';

  // ─── Verify Target Record Exists ──────────────────────────────
  let targetName = 'Delegate';
  let delegationName = null;
  let institution = 'Institutional Representative';
  let individualCommittee = allocatedCommittee || null;
  let individualPortfolio = allocatedPortfolio || null;
  const mIdx = parseInt(memberIndex, 10) || 0;

  try {
    const tableName = targetType === 'delegation' ? 'delegations' : 'registrations';
    const { data: rec } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (rec) {
      if (targetType === 'delegation') {
        delegationName = rec.delegation_name || rec.head_name;
        institution = rec.institution || rec.delegation_name;
        targetName = delegationName;

        let rd = rec.roster_data;
        if (typeof rd === 'string') {
          try { rd = JSON.parse(rd); } catch (e) {}
        }
        if (Array.isArray(rd) && rd[mIdx]) {
          const m = rd[mIdx];
          targetName = m.name || m.delegateName || ('Delegate ' + (mIdx + 1));
          individualCommittee = m.committee || individualCommittee;
          individualPortfolio = m.portfolio || individualPortfolio;
        }
      } else {
        targetName = rec.name;
        institution = rec.institution || 'Institutional Representative';
        individualCommittee = rec.committee1 || rec.committee2 || individualCommittee;
        individualPortfolio = rec.portfolio1_1 || rec.portfolio1_2 || individualPortfolio;
      }
    }
  } catch (e) {}

  // ─── Supabase delegate_checkpoints Persistent State & Duplicate Detection ───
  let isDuplicate = false;
  let prevRedeemedAt = null;

  if (supabase) {
    try {
      const { data: existingCp } = await supabase
        .from('delegate_checkpoints')
        .select('*')
        .eq('record_type', targetType)
        .eq('record_id', targetId)
        .eq('member_index', targetType === 'delegation' ? mIdx : 0)
        .eq('checkpoint_key', checkpointKey)
        .maybeSingle();

      if (redeemedStatus && existingCp?.redeemed && !force) {
        isDuplicate = true;
        prevRedeemedAt = existingCp.redeemed_at;
      }
    } catch (dbReadErr) {
      console.warn('[update-checkpoint] Supabase duplicate check warning:', dbReadErr.message);
    }
  }

  // ─── Local Store Fallback Check ───────────────────────────────
  const localData = readLocalCheckpoints();
  const localKey = `${targetType}_${targetId}`;
  if (!localData[localKey]) {
    localData[localKey] = {
      checkpoints: {},
      memberCheckpoints: {},
      allocatedCommittee: '',
      allocatedPortfolio: ''
    };
  }

  const entry = localData[localKey];

  if (!isDuplicate && redeemedStatus && !force) {
    if (targetType === 'delegation' && entry.memberCheckpoints?.[mIdx]?.[checkpointKey]?.redeemed) {
      isDuplicate = true;
      prevRedeemedAt = entry.memberCheckpoints[mIdx][checkpointKey].timestamp;
    } else if (targetType === 'individual' && entry.checkpoints?.[checkpointKey]?.redeemed) {
      isDuplicate = true;
      prevRedeemedAt = entry.checkpoints[checkpointKey].timestamp;
    }
  }

  // ─── Persist to PostgreSQL (Supabase delegate_checkpoints) ────
  if (supabase) {
    try {
      const payload = {
        record_type: targetType,
        record_id: targetId,
        member_index: targetType === 'delegation' ? mIdx : 0,
        checkpoint_key: checkpointKey,
        redeemed: redeemedStatus,
        redeemed_at: redeemedStatus ? nowIso : new Date(0).toISOString(),
        redeemed_by: staffName,
        allocated_committee: individualCommittee || null,
        allocated_portfolio: individualPortfolio || null
      };

      await supabase
        .from('delegate_checkpoints')
        .upsert(payload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });
    } catch (dbErr) {
      console.warn('[update-checkpoint] Supabase upsert non-blocking warning:', dbErr.message);
    }
  }

  // ─── Update Local Memory / Cache ──────────────────────────────
  if (targetType === 'delegation') {
    if (!entry.memberCheckpoints) entry.memberCheckpoints = {};
    if (!entry.memberCheckpoints[mIdx]) entry.memberCheckpoints[mIdx] = {};

    entry.memberCheckpoints[mIdx][checkpointKey] = {
      redeemed: redeemedStatus,
      timestamp: redeemedStatus ? nowIso : null,
      by: staffName
    };
    if (mIdx === 0) {
      if (!entry.checkpoints) entry.checkpoints = {};
      entry.checkpoints[checkpointKey] = entry.memberCheckpoints[0][checkpointKey];
    }
  } else {
    if (!entry.checkpoints) entry.checkpoints = {};
    entry.checkpoints[checkpointKey] = {
      redeemed: redeemedStatus,
      timestamp: redeemedStatus ? nowIso : null,
      by: staffName
    };
    if (allocatedCommittee) entry.allocatedCommittee = allocatedCommittee;
    if (allocatedPortfolio) entry.allocatedPortfolio = allocatedPortfolio;
  }

  // Gracefully attempt local write without throwing on read-only serverless disk
  try {
    writeLocalCheckpoints(localData);
  } catch (fsErr) {}

  return res.status(200).json({
    success: true,
    duplicate: isDuplicate,
    message: isDuplicate 
      ? `Warning: Checkpoint was already redeemed earlier at ${new Date(prevRedeemedAt).toLocaleTimeString()}`
      : `Successfully marked ${checkpointKey.replace(/_/g, ' ').toUpperCase()}`,
    checkpointKey,
    redeemed: redeemedStatus,
    redeemedAt: nowIso,
    redeemedBy: staffName,
    delegateName: targetName,
    delegationName,
    institution,
    allocatedCommittee: individualCommittee,
    allocatedPortfolio: individualPortfolio,
    memberIndex: targetType === 'delegation' ? mIdx : undefined,
    targetType,
    targetId
  });
}
