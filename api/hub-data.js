import { supabase } from './_supabase.js';
import fs from 'fs';
import path from 'path';
import { resolvePublicToken, getPublicToken, verifyStaffSession } from './_token.js';

// Local file store for checkpoints as a resilient fallback if Supabase table is not yet migrated
const LOCAL_STORE_PATH = path.resolve(process.cwd(), '.data', 'checkpoints.json');

function readLocalCheckpoints() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch (e) {
    console.warn('[hub-data] Error reading local checkpoints:', e.message);
  }
  return {};
}

const DEFAULT_CHECKPOINTS = () => ({
  day1_entry: { redeemed: false, timestamp: null, by: null },
  day1_lunch: { redeemed: false, timestamp: null, by: null },
  day1_refreshment: { redeemed: false, timestamp: null, by: null },
  day2_entry: { redeemed: false, timestamp: null, by: null },
  day2_lunch: { redeemed: false, timestamp: null, by: null },
  day2_refreshment: { redeemed: false, timestamp: null, by: null }
});

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only GET is supported.' });
  }

  const query = req.query || {};
  const tokenParam = String(query.t || '').trim();
  const rawId = String(query.id || '').trim();
  const requestedType = (query.type || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';

  // Check for Staff Authorization Bearer Session Token
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
  let isOrganizer = verifyStaffSession(bearerToken);

  // Check Supabase Admin Token as alternative staff auth
  if (!isOrganizer && bearerToken && supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser(bearerToken);
      if (authData?.user) isOrganizer = true;
    } catch (e) {}
  }

  const searchQuery = String(query.q || query.search || '').trim();

  // ─── Manual Search Directory by Name / Email / Phone / Institution ───
  if (searchQuery) {
    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        error: 'Staff authentication required for delegate directory search.'
      });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database service is currently unavailable.' });
    }

    const q = searchQuery.toLowerCase();
    if (q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search term must be at least 2 characters.' });
    }

    try {
      // 1. Search individual registrations
      const { data: matchedRegs, error: regErr } = await supabase
        .from('registrations')
        .select('id, name, email, phone, institution, committee1, committee2, portfolio1_1, portfolio1_2, portfolio2_1, status')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,institution.ilike.%${q}%`)
        .limit(25);

      if (regErr) console.warn('[hub-data] search registrations warning:', regErr.message);

      // 2. Search delegations (including nested roster_data)
      const { data: allDels, error: delErr } = await supabase
        .from('delegations')
        .select('id, delegation_name, head_name, email, phone, member_count, roster_data, status')
        .limit(50);

      if (delErr) console.warn('[hub-data] search delegations warning:', delErr.message);

      const matches = [];

      (matchedRegs || []).forEach(r => {
        const publicTok = getPublicToken('individual', r.id);
        matches.push({
          type: 'individual',
          id: String(r.id),
          rawId: r.id,
          memberIndex: 0,
          name: r.name,
          email: r.email,
          phone: r.phone,
          institution: r.institution || 'Institutional Representative',
          committee: r.committee1 || r.committee2 || 'General Assembly',
          portfolio: r.portfolio1_1 || r.portfolio1_2 || r.portfolio2_1 || 'Delegate',
          token: publicTok,
          passUrl: `/hub?t=${publicTok}`,
          status: r.status
        });
      });

      (allDels || []).forEach(d => {
        const publicTok = getPublicToken('delegation', d.id);
        let rd = d.roster_data;
        if (typeof rd === 'string') {
          try { rd = JSON.parse(rd); } catch (e) {}
        }

        let rosterMatched = false;
        if (Array.isArray(rd)) {
          rd.forEach((m, idx) => {
            const mName = m.name || m.delegateName || m['Delegate Name'] || '';
            const mEmail = m.email || m.emailAddress || m['Email Address'] || '';
            const mPhone = m.phone || m.mobileNumber || m['WhatsApp / Mobile Number'] || '';
            const mInst = m.institution || m['Institution / College Name'] || d.delegation_name || 'Institutional Delegation';

            if (
              mName.toLowerCase().includes(q) ||
              mEmail.toLowerCase().includes(q) ||
              mPhone.includes(q) ||
              mInst.toLowerCase().includes(q)
            ) {
              rosterMatched = true;
              matches.push({
                type: 'delegation',
                id: String(d.id),
                rawId: d.id,
                memberIndex: idx,
                name: mName || `Delegate #${idx + 1}`,
                email: mEmail,
                phone: mPhone,
                institution: mInst,
                delegationName: d.delegation_name,
                headName: d.head_name,
                committee: m.committee || m.committee1 || m['Committee Preference 1'] || 'General Assembly',
                portfolio: m.portfolio || m.portfolio1_1 || m['Portfolio Preference 1'] || 'Delegate',
                token: publicTok,
                passUrl: `/hub?t=${publicTok}&m=${idx}`,
                status: d.status
              });
            }
          });
        }

        // If roster didn't match specific member but delegation head / name matches
        if (!rosterMatched) {
          const dName = d.delegation_name || '';
          const hName = d.head_name || '';
          const dEmail = d.email || '';
          const dPhone = d.phone || '';

          if (
            dName.toLowerCase().includes(q) ||
            hName.toLowerCase().includes(q) ||
            dEmail.toLowerCase().includes(q) ||
            dPhone.includes(q)
          ) {
            matches.push({
              type: 'delegation',
              id: String(d.id),
              rawId: d.id,
              memberIndex: 0,
              name: hName ? `${hName} (Head)` : dName,
              email: dEmail,
              phone: dPhone,
              institution: dName,
              delegationName: dName,
              headName: hName,
              committee: 'Institutional Delegation',
              portfolio: 'Head of Delegation',
              token: publicTok,
              passUrl: `/hub?t=${publicTok}`,
              status: d.status
            });
          }
        }
      });

      return res.status(200).json({
        success: true,
        query: searchQuery,
        count: matches.length,
        matches
      });
    } catch (err) {
      console.error('[hub-data] search error:', err);
      return res.status(500).json({ success: false, error: 'Failed to search delegate records: ' + err.message });
    }
  }

  let recordId = '';
  let recordType = requestedType;
  let publicToken = tokenParam;

  // ─── IDOR Protection & Token Resolution ───────────────────────
  if (tokenParam) {
    // Resolve random unguessable public token (e.g. ?t=01SkYaqZI5vA0q)
    const resolved = resolvePublicToken(tokenParam);
    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or unrecognized delegate pass token. Please ensure you are using the official link sent to your email.'
      });
    }
    recordId = String(resolved.id);
    recordType = resolved.type;
  } else if (rawId) {
    // Direct sequential ID access (e.g. /hub?id=50)
    // To prevent IDOR enumeration, public anonymous requests cannot scrape sequential IDs!
    if (!isOrganizer) {
      return res.status(403).json({
        success: false,
        idorBlocked: true,
        error: 'Direct numeric ID access is restricted to protect delegate privacy. Please use the secure credential pass link (?t=...) sent to your registered email.'
      });
    }
    recordId = rawId;
    publicToken = getPublicToken(recordType, recordId);
  } else {
    return res.status(400).json({
      success: false,
      error: 'Pass token (?t=...), search query (?q=...), or credential ID is required.'
    });
  }

  if (!supabase) {
    return res.status(500).json({ success: false, error: 'Supabase client is not configured.' });
  }

  try {
    const tableName = recordType === 'delegation' ? 'delegations' : 'registrations';
    
    // Query database record
    const { data: record, error: fetchErr } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (fetchErr) {
      console.error(`[hub-data] Error fetching ${tableName} with ID ${recordId}:`, fetchErr);
      return res.status(500).json({ success: false, error: 'Database query failed: ' + fetchErr.message });
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'No registration record found for this credential.'
      });
    }

    // ─── Fetch Live Checkpoint Accreditations ───────────────────
    let checkpoints = DEFAULT_CHECKPOINTS();
    let memberCheckpoints = {};
    let customAllocatedCommittee = '';
    let customAllocatedPortfolio = '';

    const localData = readLocalCheckpoints();
    const localKey = `${recordType}_${recordId}`;
    if (localData[localKey]) {
      const entry = localData[localKey];
      if (entry.checkpoints) checkpoints = { ...checkpoints, ...entry.checkpoints };
      if (entry.memberCheckpoints) memberCheckpoints = { ...entry.memberCheckpoints };
      if (entry.allocatedCommittee) customAllocatedCommittee = entry.allocatedCommittee;
      if (entry.allocatedPortfolio) customAllocatedPortfolio = entry.allocatedPortfolio;

      // Ensure index 0 fallback for delegations
      if (recordType === 'delegation' && !memberCheckpoints[0] && entry.checkpoints) {
        memberCheckpoints[0] = { ...entry.checkpoints };
      }
    }

    // Attempt to query Supabase delegate_checkpoints table
    try {
      const { data: dbCheckpoints, error: cpErr } = await supabase
        .from('delegate_checkpoints')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId);

      if (!cpErr && Array.isArray(dbCheckpoints) && dbCheckpoints.length > 0) {
        dbCheckpoints.forEach(cp => {
          const mIdx = (cp.member_index !== null && cp.member_index !== undefined) ? Number(cp.member_index) : 0;
          if (recordType === 'delegation') {
            if (!memberCheckpoints[mIdx]) memberCheckpoints[mIdx] = DEFAULT_CHECKPOINTS();
            if (memberCheckpoints[mIdx][cp.checkpoint_key] !== undefined) {
              memberCheckpoints[mIdx][cp.checkpoint_key] = {
                redeemed: !!cp.redeemed,
                timestamp: cp.redeemed_at || null,
                by: cp.redeemed_by || 'Organizer'
              };
            }
            if (mIdx === 0 && checkpoints[cp.checkpoint_key] !== undefined) {
              checkpoints[cp.checkpoint_key] = {
                redeemed: !!cp.redeemed,
                timestamp: cp.redeemed_at || null,
                by: cp.redeemed_by || 'Organizer'
              };
            }
          } else {
            if (checkpoints[cp.checkpoint_key] !== undefined) {
              checkpoints[cp.checkpoint_key] = {
                redeemed: !!cp.redeemed,
                timestamp: cp.redeemed_at || null,
                by: cp.redeemed_by || 'Organizer'
              };
            }
            if (cp.allocated_committee) customAllocatedCommittee = cp.allocated_committee;
            if (cp.allocated_portfolio) customAllocatedPortfolio = cp.allocated_portfolio;
          }
        });
      }
    } catch (e) {
      // Non-blocking fallback to local store
    }

    // ─── Determine Official Allocated Committee & Portfolio ─────
    let allocatedCommittee = customAllocatedCommittee;
    let allocatedPortfolio = customAllocatedPortfolio;

    if (recordType === 'individual') {
      if (!allocatedCommittee) {
        allocatedCommittee = record.committee1 || record.committee2 || 'General Assembly';
      }
      if (!allocatedPortfolio) {
        allocatedPortfolio = record.portfolio1_1 || record.portfolio1_2 || record.portfolio2_1 || 'Delegate';
      }
    } else {
      if (!allocatedCommittee) {
        allocatedCommittee = 'Institutional Delegation';
      }
      if (!allocatedPortfolio) {
        allocatedPortfolio = `${record.member_count || 1} Delegates Delegation`;
      }
    }

    // Ensure public token is populated
    if (!publicToken) {
      publicToken = getPublicToken(recordType, recordId);
    }

    // Formatted masked Delegate ID for badges
    const formattedDelegateId = `RNS-MUN-26-${String(record.id).padStart(4, '0')}`;

    // Mask sensitive contact details for anonymous pass visitors
    const maskEmail = (em) => {
      if (!em || !em.includes('@')) return '***@***.***';
      const [u, d] = em.split('@');
      return u.length > 2 ? `${u[0]}***${u.slice(-1)}@${d}` : `*@${d}`;
    };
    const maskPhone = (ph) => {
      if (!ph) return '**********';
      const digits = String(ph).replace(/\D/g, '');
      return digits.length > 4 ? `+91 ******${digits.slice(-4)}` : '******';
    };

    // Roster for delegations
    let roster = [];
    if (recordType === 'delegation') {
      let rd = record.roster_data;
      if (typeof rd === 'string') {
        try { rd = JSON.parse(rd); } catch(e) {}
      }
      if (Array.isArray(rd)) {
        roster = rd.map((m, idx) => ({
          index: idx,
          name: m.name || m.delegateName || 'Delegate ' + (idx + 1),
          email: isOrganizer ? (m.email || '') : maskEmail(m.email),
          phone: isOrganizer ? (m.phone || '') : maskPhone(m.phone),
          committee: m.committee || 'Assigned Committee',
          portfolio: m.portfolio || 'Assigned Portfolio',
          checkpoints: { ...DEFAULT_CHECKPOINTS(), ...(memberCheckpoints[idx] || {}) }
        }));
      }
    }

    const responseData = {
      success: true,
      token: publicToken,
      delegateId: formattedDelegateId,
      rawId: isOrganizer ? record.id : undefined,
      type: recordType,
      name: recordType === 'individual' ? record.name : (record.delegation_name || record.head_name),
      headName: recordType === 'delegation' ? record.head_name : null,
      delegationName: recordType === 'delegation' ? record.delegation_name : null,
      email: isOrganizer ? record.email : maskEmail(record.email),
      phone: isOrganizer ? record.phone : maskPhone(record.phone),
      institution: record.institution || (recordType === 'delegation' ? record.delegation_name : 'Institutional Representative'),
      delegateType: record.delegate_type || (recordType === 'delegation' ? 'Delegation' : 'Individual'),
      status: record.status || 'Confirmed',
      allocatedCommittee,
      allocatedPortfolio,
      checkpoints,
      roster,
      isOrganizer,
      passUrl: `https://mun.rnsit.ac.in/hub?t=${publicToken}`
    };

    return res.status(200).json(responseData);

  } catch (err) {
    console.error('[hub-data] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
