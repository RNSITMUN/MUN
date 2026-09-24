import { supabase } from './_supabase.js';
import fs from 'fs';
import path from 'path';
import { verifyStaffSession } from './_token.js';

const LOCAL_STORE_PATH = path.resolve(process.cwd(), '.data', 'checkpoints.json');

function readLocalCheckpoints() {
  try {
    if (fs.existsSync(LOCAL_STORE_PATH)) {
      const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
      return JSON.parse(raw) || {};
    }
  } catch (e) {
    console.warn('[scan-stats] Error reading local checkpoints:', e.message);
  }
  return {};
}

function normalizeCommittee(raw) {
  if (!raw) return 'General Assembly';
  const s = String(raw).toUpperCase().trim();
  if (s.includes('UNSC') || s.includes('SECURITY')) return 'UNSC';
  if (s.includes('UNHRC') || s.includes('HUMAN RIGHTS')) return 'UNHRC';
  if (s.includes('UNODC') || s.includes('DRUGS')) return 'UNODC';
  if (s.includes('DISEC') || s.includes('DISARMAMENT')) return 'DISEC';
  if (s.includes('LOK SABHA') || s.includes('HOUSE OF THE PEOPLE')) return 'Lok Sabha';
  if (s.includes('IP') || s.includes('PRESS')) return 'IPC';
  return raw.split('—')[0].trim() || 'General Assembly';
}

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

  try {
    // 1. Fetch all registered delegates from Supabase
    let delegateMap = {}; // 'individual_12' or 'delegation_47_0' -> { committee }
    let committeeTotals = {
      'UNSC': 0,
      'UNHRC': 0,
      'UNODC': 0,
      'DISEC': 0,
      'Lok Sabha': 0,
      'IPC': 0
    };
    let totalDelegates = 0;

    if (supabase) {
      const [indRes, delRes] = await Promise.all([
        supabase.from('registrations').select('id, committee1, committee2'),
        supabase.from('delegations').select('id, delegation_name, roster_data')
      ]);

      if (indRes.data) {
        indRes.data.forEach(r => {
          totalDelegates++;
          const comm = normalizeCommittee(r.committee1 || r.committee2);
          delegateMap[`individual_${r.id}`] = { committee: comm };
          committeeTotals[comm] = (committeeTotals[comm] || 0) + 1;
        });
      }

      if (delRes.data) {
        delRes.data.forEach(d => {
          let rd = d.roster_data;
          if (typeof rd === 'string') {
            try { rd = JSON.parse(rd); } catch (e) {}
          }
          if (Array.isArray(rd)) {
            rd.forEach((m, idx) => {
              totalDelegates++;
              const comm = normalizeCommittee(m.committee);
              delegateMap[`delegation_${d.id}_${idx}`] = { committee: comm };
              committeeTotals[comm] = (committeeTotals[comm] || 0) + 1;
            });
          }
        });
      }
    }

    // Default fallback if database is empty or offline
    if (totalDelegates === 0) {
      totalDelegates = 240;
    }

    // 2. Fetch redeemed checkpoints from Supabase + Local store
    // Set of redeemed checkpoint identifiers: 'individual_12_day1_entry' or 'delegation_47_1_day1_lunch'
    const redeemedCheckpoints = new Set();

    // Query Supabase table
    if (supabase) {
      try {
        const { data: dbCheckpoints } = await supabase
          .from('delegate_checkpoints')
          .select('record_type, record_id, member_index, checkpoint_key, redeemed')
          .eq('redeemed', true);

        if (Array.isArray(dbCheckpoints)) {
          dbCheckpoints.forEach(cp => {
            const mIdx = cp.member_index || 0;
            if (cp.record_type === 'delegation') {
              redeemedCheckpoints.add(`delegation_${cp.record_id}_${mIdx}_${cp.checkpoint_key}`);
            } else {
              redeemedCheckpoints.add(`individual_${cp.record_id}_${cp.checkpoint_key}`);
            }
          });
        }
      } catch (dbErr) {
        // Handled via local fallback below
      }
    }

    // Query local fallback store (.data/checkpoints.json)
    const localData = readLocalCheckpoints();
    for (const recordKey in localData) {
      const entry = localData[recordKey];
      const isDelegation = recordKey.startsWith('delegation_');
      const recId = recordKey.replace(/^(individual_|delegation_)/, '');

      // Individual checkpoints or root delegation checkpoints
      if (entry.checkpoints) {
        for (const cpKey in entry.checkpoints) {
          if (entry.checkpoints[cpKey]?.redeemed) {
            if (isDelegation) {
              redeemedCheckpoints.add(`delegation_${recId}_0_${cpKey}`);
            } else {
              redeemedCheckpoints.add(`individual_${recId}_${cpKey}`);
            }
          }
        }
      }

      // Member checkpoints for delegations
      if (entry.memberCheckpoints) {
        for (const mIdx in entry.memberCheckpoints) {
          const mCps = entry.memberCheckpoints[mIdx];
          for (const cpKey in mCps) {
            if (mCps[cpKey]?.redeemed) {
              redeemedCheckpoints.add(`delegation_${recId}_${mIdx}_${cpKey}`);
            }
          }
        }
      }
    }

    // 3. Compute Checkpoint Counts (Day 1 & Day 2)
    const stations = {
      day1_entry: 0,
      day1_lunch: 0,
      day1_refreshment: 0,
      day2_entry: 0,
      day2_lunch: 0,
      day2_refreshment: 0
    };

    // Committee breakdown structure
    const committeeBreakdown = {};
    for (const comm in committeeTotals) {
      committeeBreakdown[comm] = {
        total: committeeTotals[comm],
        day1_entry: 0,
        day1_lunch: 0,
        day1_refreshment: 0,
        day2_entry: 0,
        day2_lunch: 0,
        day2_refreshment: 0
      };
    }

    // Aggregate counts
    redeemedCheckpoints.forEach(item => {
      // item format: "individual_12_day1_lunch" or "delegation_47_1_day1_lunch"
      const parts = item.split('_');
      let cpKey = '';
      let delegateKey = '';

      if (parts[0] === 'individual') {
        const id = parts[1];
        cpKey = parts.slice(2).join('_');
        delegateKey = `individual_${id}`;
      } else if (parts[0] === 'delegation') {
        const id = parts[1];
        const mIdx = parts[2];
        cpKey = parts.slice(3).join('_');
        delegateKey = `delegation_${id}_${mIdx}`;
      }

      if (stations[cpKey] !== undefined) {
        stations[cpKey]++;

        const comm = delegateMap[delegateKey]?.committee || 'General Assembly';
        if (committeeBreakdown[comm] && committeeBreakdown[comm][cpKey] !== undefined) {
          committeeBreakdown[comm][cpKey]++;
        }
      }
    });

    const calcPct = (count, tot) => tot > 0 ? Math.round((count / tot) * 100) : 0;

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      totalDelegates,
      day1: {
        entry: {
          count: stations.day1_entry,
          total: totalDelegates,
          pct: calcPct(stations.day1_entry, totalDelegates)
        },
        lunch: {
          count: stations.day1_lunch,
          total: totalDelegates,
          pct: calcPct(stations.day1_lunch, totalDelegates)
        },
        refreshment: {
          count: stations.day1_refreshment,
          total: totalDelegates,
          pct: calcPct(stations.day1_refreshment, totalDelegates)
        }
      },
      day2: {
        entry: {
          count: stations.day2_entry,
          total: totalDelegates,
          pct: calcPct(stations.day2_entry, totalDelegates)
        },
        lunch: {
          count: stations.day2_lunch,
          total: totalDelegates,
          pct: calcPct(stations.day2_lunch, totalDelegates)
        },
        refreshment: {
          count: stations.day2_refreshment,
          total: totalDelegates,
          pct: calcPct(stations.day2_refreshment, totalDelegates)
        }
      },
      byCommittee: committeeBreakdown
    });

  } catch (err) {
    console.error('[scan-stats] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
