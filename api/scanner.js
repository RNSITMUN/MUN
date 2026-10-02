import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabase } from '../lib/supabase.js';
import { resolvePublicToken, decodePublicTokenPayload, getPublicToken, createStaffSession, verifyStaffSession, getStaffSessionName } from '../lib/token.js';
import { normalizeCommitteeName } from '../lib/committees.js';

// Local storage fallback for checkpoints
const LOCAL_STORE_PATH = process.env.VERCEL
  ? path.join(os.tmpdir(), 'checkpoints.json')
  : path.resolve(process.cwd(), '.data', 'checkpoints.json');

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
  const submittedName = String(body.staffName || body.name || '').trim().slice(0, 80);

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
  if (!submittedName) {
    return res.status(400).json({ success: false, error: 'Staff name is required.' });
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

  const sessionToken = createStaffSession(submittedName);
  return res.status(200).json({
    success: true,
    message: 'Staff authentication successful.',
    sessionToken,
    staffName: submittedName,
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

  const authenticatedStaffName = getStaffSessionName(sessionToken);
  if (!authenticatedStaffName) {
    return res.status(401).json({ success: false, error: 'Staff session has no authenticated name. Please sign in again.' });
  }

  const body = req.body || {};
  let token = body.token;
  let id = body.id;
  let type = body.type;
  let member_index = body.member_index ?? body.memberIndex ?? 0;
  let checkpoint_key = body.checkpoint_key || body.checkpointKey;
  let redeemed = body.redeemed !== undefined ? body.redeemed : (body.status !== undefined ? body.status : true);
  let redeemed_by = authenticatedStaffName;
  let force = body.force === true;
  let notes = body.notes || null;
  let allocated_committee = body.allocated_committee || body.allocatedCommittee;
  let allocated_portfolio = body.allocated_portfolio || body.allocatedPortfolio;

  let recordType = type;
  let recordId = id;

  if (token) {
    let resolved = resolvePublicToken(token);
    if (!resolved) {
      resolved = decodePublicTokenPayload(token);
    }
    if (resolved) {
      recordType = resolved.type;
      recordId = resolved.id;
    } else {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALID',
        error: 'This QR code is not a valid RNS MUN pass.'
      });
    }
  }

  if (!recordId) {
    return res.status(400).json({
      success: false,
      code: 'TOKEN_INVALID',
      error: 'Missing delegate identification (token or id).'
    });
  }

  recordType = String(recordType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';
  const cleanKey = String(checkpoint_key || '').trim().toLowerCase();
  const memberIdx = parseInt(member_index || 0, 10) || 0;
  const isRedeemed = redeemed !== false;
  const staffName = authenticatedStaffName;

  if (!VALID_CHECKPOINTS.includes(cleanKey)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_CHECKPOINT',
      error: `Invalid checkpoint_key. Must be one of: ${VALID_CHECKPOINTS.join(', ')}`
    });
  }

  let delegateName = '';
  let allocComm = allocated_committee || '';
  let allocPort = allocated_portfolio || '';
  let existingRedeemed = false;
  let existingRedeemedAt = null;
  let existingRedeemedBy = null;

  if (supabase) {
    try {
      const [regRes, cpRes] = await Promise.all([
        recordType === 'delegation'
          ? supabase.from('delegations').select('id, delegation_name, head_name, roster_data').eq('id', recordId).maybeSingle()
          : supabase.from('registrations').select('id, name, institution, committee1, portfolio1_1').eq('id', recordId).maybeSingle(),
        supabase.from('delegate_checkpoints')
          .select('record_type, record_id, member_index, checkpoint_key, redeemed, redeemed_at, redeemed_by, allocated_committee, allocated_portfolio')
          .eq('record_type', recordType)
          .eq('record_id', String(recordId))
          .eq('member_index', memberIdx)
          .eq('checkpoint_key', cleanKey)
          .maybeSingle()
      ]);

      if (regRes.error) {
        console.error('Supabase error verifying record in updateCheckpoint:', regRes.error);
        return res.status(502).json({
          success: false,
          code: 'DB_ERROR',
          error: 'Database error verifying delegate record: ' + regRes.error.message
        });
      }

      const rec = regRes.data;
      if (!rec) {
        return res.status(404).json({
          success: false,
          code: 'RECORD_NOT_FOUND',
          error: 'No registration found for this pass.'
        });
      }

      if (recordType === 'individual') {
        delegateName = rec.name || '';
        if (!allocComm) allocComm = rec.committee1 || '';
        if (!allocPort) allocPort = rec.portfolio1_1 || '';
      } else {
        const roster = Array.isArray(rec.roster_data) ? rec.roster_data : [];
        if (roster[memberIdx]) {
          delegateName = roster[memberIdx].name || roster[memberIdx]['Delegate Name'] || '';
          if (!allocComm) allocComm = roster[memberIdx].allocated_committee || roster[memberIdx].committee || '';
          if (!allocPort) allocPort = roster[memberIdx].allocated_portfolio || roster[memberIdx].portfolio || '';
        }
        if (!delegateName) delegateName = rec.head_name || rec.delegation_name || '';
      }

      if (cpRes.data) {
        if (cpRes.data.redeemed) {
          existingRedeemed = true;
          existingRedeemedAt = cpRes.data.redeemed_at;
          existingRedeemedBy = cpRes.data.redeemed_by;
        }
        if (cpRes.data.allocated_committee && !allocated_committee) {
          allocComm = cpRes.data.allocated_committee;
        }
        if (cpRes.data.allocated_portfolio && !allocated_portfolio) {
          allocPort = cpRes.data.allocated_portfolio;
        }
      }
    } catch (e) {
      console.error('Unexpected error checking record in updateCheckpoint:', e);
      return res.status(502).json({
        success: false,
        code: 'DB_ERROR',
        error: 'Database error verifying delegate record.'
      });
    }
  }

  const localKey = `${recordType}_${recordId}_${memberIdx}`;
  const baseLocalKey = `${recordType}_${recordId}`;
  const localStore = readLocalCheckpoints();
  const existingLocal = localStore[localKey]?.[cleanKey] || (memberIdx === 0 ? localStore[baseLocalKey]?.[cleanKey] : undefined);

  if (!existingRedeemed && existingLocal?.redeemed) {
    existingRedeemed = true;
    existingRedeemedAt = existingLocal.redeemed_at;
    existingRedeemedBy = existingLocal.redeemed_by;
  }

  if (!delegateName) {
    delegateName = recordType === 'delegation' ? `Delegation #${recordId} Member ${memberIdx + 1}` : `Delegate #${recordId}`;
  }

  // If already redeemed and not forced, return duplicate alert!
  if (existingRedeemed && !force && isRedeemed) {
    const timeFormatted = existingRedeemedAt ? new Date(existingRedeemedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    return res.status(200).json({
      success: false,
      duplicate: true,
      message: `Pass was already stamped for ${cleanKey} at ${timeFormatted} by ${existingRedeemedBy || 'Staff'}.`,
      delegateName,
      allocatedCommittee: allocComm,
      allocatedPortfolio: allocPort,
      redeemedAt: existingRedeemedAt,
      redeemed_at: existingRedeemedAt,
      redeemedBy: existingRedeemedBy,
      redeemed_by: existingRedeemedBy,
      checkpoint: existingLocal || { checkpoint_key: cleanKey, redeemed: true, redeemed_at: existingRedeemedAt, redeemed_by: existingRedeemedBy }
    });
  }

  const nowIso = new Date().toISOString();
  let updatedRecord = {
    checkpoint_key: cleanKey,
    redeemed: isRedeemed,
    redeemed_at: isRedeemed ? nowIso : null,
    redeemed_by: isRedeemed ? staffName : null,
    notes: notes || null
  };

  if (allocComm) updatedRecord.allocated_committee = allocComm;
  if (allocPort) updatedRecord.allocated_portfolio = allocPort;

  if (!localStore[localKey]) localStore[localKey] = {};
  localStore[localKey][cleanKey] = updatedRecord;
  if (memberIdx === 0) {
    if (!localStore[baseLocalKey]) localStore[baseLocalKey] = {};
    localStore[baseLocalKey][cleanKey] = updatedRecord;
  }
  writeLocalCheckpoints(localStore);

  if (supabase) {
    try {
      const payload = {
        record_type: recordType,
        record_id: String(recordId),
        member_index: memberIdx,
        checkpoint_key: cleanKey,
        redeemed: isRedeemed,
        redeemed_at: isRedeemed ? nowIso : null,
        redeemed_by: isRedeemed ? staffName : null,
        notes: notes || null
      };

      if (allocComm) payload.allocated_committee = allocComm;
      if (allocPort) payload.allocated_portfolio = allocPort;

      const { data, error } = await supabase
        .from('delegate_checkpoints')
        .upsert(payload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' })
        .select()
        .single();

      if (error) {
        console.error('Supabase error upserting checkpoint:', error);
        return res.status(502).json({
          success: false,
          code: 'DB_ERROR',
          error: 'Database error recording checkpoint stamp: ' + error.message
        });
      }

      if (data) {
        return res.status(200).json({
          success: true,
          duplicate: false,
          source: 'database',
          message: `Checkpoint ${cleanKey} successfully stamped.`,
          delegateName,
          allocatedCommittee: allocComm,
          allocatedPortfolio: allocPort,
          redeemedAt: nowIso,
          redeemed_at: nowIso,
          redeemedBy: staffName,
          redeemed_by: staffName,
          checkpoint: data
        });
      }
    } catch (e) {
      console.error('Unexpected exception during checkpoint upsert:', e);
      return res.status(502).json({
        success: false,
        code: 'DB_ERROR',
        error: 'Failed to record checkpoint stamp in database.'
      });
    }
  }

  return res.status(200).json({
    success: true,
    duplicate: false,
    source: 'local_store',
    message: `Checkpoint ${cleanKey} stamped in local cache.`,
    delegateName,
    allocatedCommittee: allocComm,
    allocatedPortfolio: allocPort,
    redeemedAt: nowIso,
    redeemed_at: nowIso,
    redeemedBy: staffName,
    redeemed_by: staffName,
    checkpoint: updatedRecord
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Scan Statistics
// ─────────────────────────────────────────────────────────────
let cachedMasterAllocations = null;
let cachedMasterAllocationsTime = 0;

function getMasterAllocations() {
  const now = Date.now();
  if (cachedMasterAllocations && now - cachedMasterAllocationsTime < 30000) {
    return cachedMasterAllocations;
  }
  const possiblePaths = [
    path.resolve(process.cwd(), 'data', 'allocations.json'),
    path.resolve(process.cwd(), 'public', 'allocations.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        cachedMasterAllocations = JSON.parse(raw);
        cachedMasterAllocationsTime = now;
        return cachedMasterAllocations;
      } catch (e) {}
    }
  }
  return [];
}

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

  // Load master delegate roster for canonical allocation totals
  const roster = getMasterAllocations();
  const delegateCommitteeMap = new Map(); // key -> normalized committee name
  const byCommittee = {};

  const canonicalCommittees = ['UNSC', 'Lok Sabha', 'UNHRC', 'UNODC', 'DISEC', 'IP'];
  canonicalCommittees.forEach(c => {
    byCommittee[c] = {
      total: 0,
      day1_entry: 0,
      day1_lunch: 0,
      day2_entry: 0,
      day2_lunch: 0,
      day1_remaining: 0,
      day2_remaining: 0
    };
  });

  roster.forEach(d => {
    const rawComm = d.allocated_committee || d.committee || '';
    const normComm = normalizeCommitteeName(rawComm) || rawComm || 'Unassigned';
    if (!byCommittee[normComm]) {
      byCommittee[normComm] = {
        total: 0,
        day1_entry: 0,
        day1_lunch: 0,
        day2_entry: 0,
        day2_lunch: 0,
        day1_remaining: 0,
        day2_remaining: 0
      };
    }
    byCommittee[normComm].total++;

    const recType = String(d.registration_type || '').toLowerCase().includes('delegation') ? 'delegation' : 'individual';
    const recId = String(d.record_id);
    const mIdx = d.member_index !== undefined ? d.member_index : 0;
    delegateCommitteeMap.set(`${recType}_${recId}_${mIdx}`, normComm);
  });

  const stats = {
    total_delegates: roster.length > 0 ? roster.length : 0,
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
  if (!stats.total_delegates) {
    stats.total_delegates = seenDelegates.size;
  }

  if (supabase) {
    try {
      const { data: dbCheckpoints, error } = await supabase
        .from('delegate_checkpoints')
        .select('record_type, record_id, member_index, checkpoint_key, redeemed, allocated_committee')
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
          const delegateKey = `${row.record_type}_${row.record_id}_${row.member_index}`;
          dbUnique.add(delegateKey);

          if (dbStats[row.checkpoint_key] !== undefined) {
            dbStats[row.checkpoint_key]++;
          }

          // Committee checkpoint tally
          const comm = delegateCommitteeMap.get(delegateKey) || normalizeCommitteeName(row.allocated_committee) || 'Unassigned';
          if (!byCommittee[comm]) {
            byCommittee[comm] = {
              total: 0,
              day1_entry: 0,
              day1_lunch: 0,
              day2_entry: 0,
              day2_lunch: 0,
              day1_remaining: 0,
              day2_remaining: 0
            };
          }
          if (byCommittee[comm][row.checkpoint_key] !== undefined) {
            byCommittee[comm][row.checkpoint_key]++;
          }
        });

        // Compute remaining counts
        Object.keys(byCommittee).forEach(cName => {
          const c = byCommittee[cName];
          c.day1_remaining = Math.max(0, c.total - (c.day1_entry || 0));
          c.day2_remaining = Math.max(0, c.total - (c.day2_entry || 0));
        });

        return res.status(200).json({
          success: true,
          source: 'database',
          stats: {
            total_delegates: Math.max(roster.length, dbUnique.size, stats.total_delegates),
            checkpoints: dbStats
          },
          byCommittee
        });
      }
    } catch (e) {}
  }

  // Local fallback: tally from localStore
  for (const [key, checkpoints] of Object.entries(localStore)) {
    const comm = delegateCommitteeMap.get(key) || 'Unassigned';
    if (!byCommittee[comm]) {
      byCommittee[comm] = {
        total: 0,
        day1_entry: 0,
        day1_lunch: 0,
        day2_entry: 0,
        day2_lunch: 0,
        day1_remaining: 0,
        day2_remaining: 0
      };
    }
    for (const [cpKey, cpVal] of Object.entries(checkpoints)) {
      if (cpVal && cpVal.redeemed && byCommittee[comm][cpKey] !== undefined) {
        byCommittee[comm][cpKey]++;
      }
    }
  }

  Object.keys(byCommittee).forEach(cName => {
    const c = byCommittee[cName];
    c.day1_remaining = Math.max(0, c.total - (c.day1_entry || 0));
    c.day2_remaining = Math.max(0, c.total - (c.day2_entry || 0));
  });

  return res.status(200).json({
    success: true,
    source: 'local_store',
    stats,
    byCommittee
  });
}


// ─────────────────────────────────────────────────────────────
// Module-scoped Directory Cache for Warm Serverless Instances
// ─────────────────────────────────────────────────────────────
const DIRECTORY_CACHE_TTL_MS = 45000;
const directoryCache = {
  timestamp: 0,
  registrations: [],
  delegations: []
};

// ─────────────────────────────────────────────────────────────
// 4. Hub Data & Search
// ─────────────────────────────────────────────────────────────
async function handleHubData(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Only GET supported.' });
  }

  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
  const sessionToken = tokenFromHeader || req.query?.sessionToken || '';
  const isStaff = !!sessionToken && verifyStaffSession(sessionToken);

  const tokenParam = (req.query?.t || req.query?.token || '').trim();
  const idParam = (req.query?.id || '').trim();
  const typeParam = (req.query?.type || '').trim();
  const queryParam = (req.query?.q || req.query?.query || '').trim();

  if (queryParam) {
    if (!isStaff) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED' });
    }
    res.setHeader('Cache-Control', 'no-store');

    const rawQ = String(queryParam).trim();
    const cleanQ = rawQ.toLowerCase();
    const results = [];

    if (supabase) {
      try {
        const now = Date.now();
        if (now - directoryCache.timestamp > DIRECTORY_CACHE_TTL_MS || !directoryCache.registrations.length) {
          const [regRes, delRes] = await Promise.all([
            supabase
              .from('registrations')
              .select('id, name, institution, committee1, portfolio1_1, usn')
              .limit(300),
            supabase
              .from('delegations')
              .select('id, delegation_name, head_name, member_count, roster_data')
              .limit(100)
          ]);
          if (!regRes.error && Array.isArray(regRes.data)) {
            directoryCache.registrations = regRes.data;
          }
          if (!delRes.error && Array.isArray(delRes.data)) {
            directoryCache.delegations = delRes.data;
          }
          directoryCache.timestamp = now;
        }

        const regList = directoryCache.registrations || [];
        for (const r of regList) {
          const rName = r.name || '';
          const match =
            (rName && rName.toLowerCase().includes(cleanQ)) ||
            (r.usn && r.usn.toLowerCase().includes(cleanQ)) ||
            String(r.id) === rawQ;

          if (match) {
            results.push({
              type: 'individual',
              id: r.id,
              memberIndex: 0,
              name: rName,
              institution: r.institution || '',
              committee: r.committee1 || 'General Assembly',
              portfolio: r.portfolio1_1 || 'Delegate'
            });
            if (results.length >= 25) break;
          }
        }

        const delList = directoryCache.delegations || [];
        for (const d of delList) {
          if (results.length >= 30) break;
          const dName = d.delegation_name || d.head_name || '';
          const delMatch =
            (d.delegation_name && d.delegation_name.toLowerCase().includes(cleanQ)) ||
            (d.head_name && d.head_name.toLowerCase().includes(cleanQ)) ||
            String(d.id) === rawQ;

          if (delMatch) {
            results.push({
              type: 'delegation',
              id: d.id,
              memberIndex: 0,
              name: dName,
              institution: d.delegation_name || '',
              committee: 'Institutional Delegation',
              portfolio: `${d.member_count || 1} Member Delegation`
            });
          }

          if (Array.isArray(d.roster_data)) {
            for (let memIdx = 0; memIdx < d.roster_data.length; memIdx++) {
              if (results.length >= 30) break;
              const mem = d.roster_data[memIdx];
              const mName = mem.name || mem.delegateName || mem['Delegate Name'] || '';
              const mUsn = mem.slNo || mem.usn || mem['USN / Roll No'] || '';
              const mComm = mem.allocated_committee || mem.committee || mem.committee1 || mem['Committee Preference 1'] || '';
              const mPort = mem.allocated_portfolio || mem.portfolio || mem.portfolio1_1 || mem['Portfolio Preference 1'] || '';

              const memberMatch =
                (mName && mName.toLowerCase().includes(cleanQ)) ||
                (mUsn && mUsn.toLowerCase().includes(cleanQ));

              if (memberMatch) {
                const alreadyPresent = results.some(x => x.type === 'delegation' && x.id === d.id && x.memberIndex === memIdx);
                if (!alreadyPresent) {
                  results.push({
                    type: 'delegation',
                    id: d.id,
                    memberIndex: memIdx,
                    name: mName,
                    institution: d.delegation_name || '',
                    committee: mComm || 'Institutional Delegation',
                    portfolio: mPort || `Member #${memIdx + 1}`
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Unexpected error searching directory:', e);
      }
    }

    const topResults = results.slice(0, 10);
    const CHECKPOINT_KEYS = [
      'day1_entry',
      'day1_lunch',
      'day1_refreshment',
      'day2_entry',
      'day2_lunch',
      'day2_refreshment'
    ];

    topResults.forEach(r => {
      r.checkpoints = {};
      CHECKPOINT_KEYS.forEach(k => {
        r.checkpoints[k] = { redeemed: false, redeemed_at: null, redeemed_by: null };
      });
    });

    if (topResults.length > 0 && supabase) {
      try {
        const indIds = [...new Set(topResults.filter(r => r.type === 'individual').map(r => String(r.id)))];
        const delIds = [...new Set(topResults.filter(r => r.type === 'delegation').map(r => String(r.id)))];

        let cpFilters = [];
        if (indIds.length > 0) cpFilters.push(`and(record_type.eq.individual,record_id.in.(${indIds.join(',')}))`);
        if (delIds.length > 0) cpFilters.push(`and(record_type.eq.delegation,record_id.in.(${delIds.join(',')}))`);

        if (cpFilters.length > 0) {
          const { data: cpRows, error: cpErr } = await supabase
            .from('delegate_checkpoints')
            .select('record_type, record_id, member_index, checkpoint_key, redeemed, redeemed_at, redeemed_by, allocated_committee, allocated_portfolio')
            .or(cpFilters.join(','));

          if (!cpErr && Array.isArray(cpRows)) {
            cpRows.forEach(row => {
              const match = topResults.find(r =>
                r.type === row.record_type &&
                String(r.id) === String(row.record_id) &&
                (r.memberIndex || 0) === (row.member_index || 0)
              );
              if (match) {
                if (row.checkpoint_key === 'allocation' || row.allocated_committee || row.allocated_portfolio) {
                  if (row.allocated_committee) match.committee = row.allocated_committee;
                  if (row.allocated_portfolio) match.portfolio = row.allocated_portfolio;
                }
                if (match.checkpoints && row.checkpoint_key && CHECKPOINT_KEYS.includes(row.checkpoint_key)) {
                  match.checkpoints[row.checkpoint_key] = {
                    redeemed: !!row.redeemed,
                    redeemed_at: row.redeemed_at || null,
                    redeemed_by: row.redeemed_by || null
                  };
                }
              }
            });
          }
        }
      } catch (cpException) {
        console.error('Error fetching checkpoints for search results:', cpException);
      }
    }

    // Merge local checkpoints fallback if any
    try {
      const localStore = readLocalCheckpoints();
      topResults.forEach(r => {
        const lk = `${r.type}_${r.id}_${r.memberIndex || 0}`;
        const baseLk = `${r.type}_${r.id}`;
        const localEntry = localStore[lk] || ((r.memberIndex || 0) === 0 ? localStore[baseLk] : null);
        if (localEntry) {
          if (localEntry.allocation?.allocated_committee) {
            r.committee = localEntry.allocation.allocated_committee;
          } else if (localEntry.allocatedCommittee) {
            r.committee = localEntry.allocatedCommittee;
          }
          if (localEntry.allocation?.allocated_portfolio) {
            r.portfolio = localEntry.allocation.allocated_portfolio;
          } else if (localEntry.allocatedPortfolio) {
            r.portfolio = localEntry.allocatedPortfolio;
          }
          CHECKPOINT_KEYS.forEach(k => {
            if (localEntry[k] && typeof localEntry[k] === 'object' && localEntry[k].redeemed) {
              r.checkpoints[k] = {
                redeemed: true,
                redeemed_at: localEntry[k].redeemed_at || null,
                redeemed_by: localEntry[k].redeemed_by || null
              };
            }
          });
        }
      });
    } catch (e) {}

    return res.status(200).json({
      success: true,
      query: rawQ,
      matches: topResults,
      results: topResults
    });
  }

  // ── Single Pass Lookup ──
  let targetType = typeParam;
  let targetId = idParam;

  if (tokenParam) {
    let resolved = resolvePublicToken(tokenParam);
    if (!resolved && isStaff) {
      resolved = decodePublicTokenPayload(tokenParam);
    }
    if (resolved) {
      targetType = resolved.type;
      targetId = resolved.id;
    } else {
      return res.status(400).json({
        success: false,
        code: 'TOKEN_INVALID',
        error: 'This QR code is not a valid RNS MUN pass.'
      });
    }
  }

  if (!targetId) {
    return res.status(400).json({
      success: false,
      code: 'TOKEN_INVALID',
      error: 'Missing token or id parameter.'
    });
  }

  targetType = String(targetType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';

  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  let record = null;
  let checkpoints = {};

  if (supabase) {
    try {
      if (targetType === 'individual') {
        const { data, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', targetId)
          .single();
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            record = null;
          } else {
            console.error('Supabase error fetching individual registration:', error);
            return res.status(502).json({
              success: false,
              code: 'DB_ERROR',
              error: 'Database error fetching delegate record: ' + error.message
            });
          }
        } else {
          record = data;
        }
      } else {
        const { data, error } = await supabase
          .from('delegations')
          .select('*')
          .eq('id', targetId)
          .single();
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
            record = null;
          } else {
            console.error('Supabase error fetching delegation record:', error);
            return res.status(502).json({
              success: false,
              code: 'DB_ERROR',
              error: 'Database error fetching delegation record: ' + error.message
            });
          }
        } else {
          record = data;
        }
      }

      if (record) {
        const { data: cpRows, error: cpError } = await supabase
          .from('delegate_checkpoints')
          .select('*')
          .eq('record_type', targetType)
          .eq('record_id', String(targetId));

        if (cpError) {
          console.error('Supabase error fetching delegate checkpoints:', cpError);
        } else if (Array.isArray(cpRows)) {
          cpRows.forEach(row => {
            const mIdx = row.member_index || 0;
            if (!checkpoints[mIdx]) checkpoints[mIdx] = {};
            checkpoints[mIdx][row.checkpoint_key] = row;
          });
        }
      }
    } catch (e) {
      console.error('Unexpected exception during Supabase query:', e);
      return res.status(502).json({
        success: false,
        code: 'DB_ERROR',
        error: 'Database connection error.'
      });
    }
  }

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Accreditation credential not found in conference registry.'
    });
  }

  // Merge local store checkpoints
  const localStore = readLocalCheckpoints();
  const maxScanIdx = Math.max(50, Array.isArray(record?.roster_data) ? record.roster_data.length : 0);
  for (let mIdx = 0; mIdx < maxScanIdx; mIdx++) {
    const lk = `${targetType}_${targetId}_${mIdx}`;
    const baseLk = `${targetType}_${targetId}`;
    const localEntry = localStore[lk] || (mIdx === 0 ? localStore[baseLk] : null);

    if (localEntry) {
      if (!checkpoints[mIdx]) checkpoints[mIdx] = {};
      for (const [cpKey, cpVal] of Object.entries(localEntry)) {
        if (typeof cpVal === 'object' && cpVal !== null && (!checkpoints[mIdx][cpKey] || cpVal.redeemed)) {
          checkpoints[mIdx][cpKey] = cpVal;
        }
      }
      if (mIdx === 0 && (localEntry.allocatedCommittee || localEntry.allocatedPortfolio)) {
        if (!checkpoints[0].allocation) {
          checkpoints[0].allocation = {
            checkpoint_key: 'allocation',
            redeemed: true,
            allocated_committee: localEntry.allocatedCommittee,
            allocated_portfolio: localEntry.allocatedPortfolio
          };
        }
      }
    }
  }

  // If no record found in db, check fallback rule:
  // "Keep the old local-store fallback only when Supabase is not configured AND the environment is not production."
  if (!record) {
    if (!supabase && !isProduction) {
      record = {
        id: targetId,
        name: `Delegate #${targetId}`,
        institution: 'Registered Institution',
        committee1: 'UNGA — United Nations General Assembly',
        portfolio1_1: 'Delegate Portfolio',
        status: 'confirmed'
      };
    } else {
      return res.status(404).json({
        success: false,
        code: 'RECORD_NOT_FOUND',
        error: 'No registration found for this pass.'
      });
    }
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

  const publicToken = tokenParam || getPublicToken(targetType, record.id);
  const passUrl = `https://mun.rnsit.ac.in/hub?t=${publicToken}`;

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
    bg_guide_url: record.bg_guide_url || record.gdrive_link || 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY',
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
