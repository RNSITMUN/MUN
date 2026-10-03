import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolvePublicToken, decodePublicTokenPayload } from '../lib/token.js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const csvPath = path.resolve('public/qrs/hub-links.csv');
const rawCsv = fs.readFileSync(csvPath, 'utf8');

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  for (let k = 1; k < lines.length; k++) {
    const line = lines[k];
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    rows.push(cells.map(s => s.replace(/^"|"$/g, '').trim()));
  }
  return rows;
}

const delegates = parseCsv(rawCsv).map(c => {
  const slNo = c[0];
  const code = c[1];
  const name = c[2];
  const emailPhone = c[3];
  const delType = c[4];
  const committee = c[5];
  const portfolio = c[6];
  const hubUrl = c[7];

  const urlObj = new URL(hubUrl);
  const token = urlObj.searchParams.get('t') || '';
  const m = urlObj.searchParams.get('m');
  const memberIdx = m !== null && !isNaN(parseInt(m, 10)) ? parseInt(m, 10) : 0;

  return {
    slNo,
    code,
    name,
    emailPhone,
    delType,
    committee,
    portfolio,
    hubUrl,
    token,
    memberIdx
  };
});

console.log(`Loaded ${delegates.length} delegates from hub-links.csv\n`);

async function runAuditAndFix() {
  // Fetch all registrations, delegations, checkpoints
  const { data: allRegs, error: rErr } = await supabase.from('registrations').select('*');
  if (rErr) throw new Error('Error fetching registrations: ' + rErr.message);

  const { data: allDels, error: dErr } = await supabase.from('delegations').select('*');
  if (dErr) throw new Error('Error fetching delegations: ' + dErr.message);

  const { data: allCheckpoints, error: cpErr } = await supabase.from('delegate_checkpoints').select('*');
  if (cpErr) throw new Error('Error fetching checkpoints: ' + cpErr.message);

  console.log(`Supabase state: ${allRegs.length} registrations, ${allDels.length} delegations, ${allCheckpoints.length} checkpoints.\n`);

  const regMap = new Map(allRegs.map(r => [String(r.id), r]));
  const delMap = new Map(allDels.map(d => [String(d.id), d]));

  const localCheckpointsPath = path.resolve('.data/checkpoints.json');
  let localCheckpoints = {};
  if (fs.existsSync(localCheckpointsPath)) {
    try {
      localCheckpoints = JSON.parse(fs.readFileSync(localCheckpointsPath, 'utf8'));
    } catch (_) {}
  }

  const cpUpserts = [];
  const regUpdates = [];
  const mismatches = [];

  for (const del of delegates) {
    let resolved = resolvePublicToken(del.token) || decodePublicTokenPayload(del.token);
    if (!resolved) {
      console.error(`🚨 CANNOT RESOLVE TOKEN: [${del.code}] ${del.name} (Token: ${del.token})`);
      continue;
    }

    const { type, id } = resolved;
    let actualComm = '';
    let actualPort = '';

    if (type === 'individual') {
      const reg = regMap.get(id);
      const cp = allCheckpoints.find(c => c.record_type === 'individual' && String(c.record_id) === String(id) && c.checkpoint_key === 'allocation');
      actualComm = cp?.allocated_committee || reg?.allocated_committee || reg?.committee1 || '';
      actualPort = cp?.allocated_portfolio || reg?.allocated_portfolio || reg?.portfolio1_1 || '';
      
      // Clean committee name (e.g. "Lok Sabha — House of the People" -> "Lok Sabha")
      const commClean = del.committee.trim();
      const portClean = del.portfolio.trim();

      const commMatches = actualComm.toLowerCase().includes(commClean.toLowerCase()) || commClean.toLowerCase().includes(actualComm.toLowerCase());
      const portMatches = actualPort.trim().toLowerCase() === portClean.toLowerCase();

      if (!commMatches || !portMatches) {
        mismatches.push({
          del,
          type,
          id,
          expectedComm: commClean,
          expectedPort: portClean,
          actualComm,
          actualPort
        });

        // Queue checkpoint upsert
        cpUpserts.push({
          record_type: 'individual',
          record_id: String(id),
          member_index: 0,
          checkpoint_key: 'allocation',
          redeemed: true,
          redeemed_at: new Date().toISOString(),
          redeemed_by: 'Sync Script',
          allocated_committee: commClean,
          allocated_portfolio: portClean,
          notes: `Updated allocation to ${commClean} (${portClean})`
        });

        // Queue registration update
        regUpdates.push({
          id: parseInt(id, 10),
          committee1: commClean,
          portfolio1_1: portClean
        });

        // Update local checkpoint
        const lk = `individual_${id}`;
        localCheckpoints[lk] = localCheckpoints[lk] || {};
        localCheckpoints[lk].allocatedCommittee = commClean;
        localCheckpoints[lk].allocatedPortfolio = portClean;
        localCheckpoints[lk].allocation = {
          redeemed: true,
          allocated_committee: commClean,
          allocated_portfolio: portClean
        };
      }
    } else {
      // Delegation member
      const dRecord = delMap.get(id);
      const mIdx = del.memberIdx;
      const cp = allCheckpoints.find(c => c.record_type === 'delegation' && String(c.record_id) === String(id) && c.member_index === mIdx && c.checkpoint_key === 'allocation');
      const member = dRecord?.roster_data?.[mIdx] || {};

      actualComm = cp?.allocated_committee || member.allocated_committee || member.committee || member.committee1 || member['Committee Preference 1'] || '';
      actualPort = cp?.allocated_portfolio || member.allocated_portfolio || member.portfolio || member.portfolio1_1 || member['Portfolio Preference 1'] || '';

      const commClean = del.committee.trim();
      const portClean = del.portfolio.trim();

      const commMatches = actualComm.toLowerCase().includes(commClean.toLowerCase()) || commClean.toLowerCase().includes(actualComm.toLowerCase());
      const portMatches = actualPort.trim().toLowerCase() === portClean.toLowerCase();

      if (!commMatches || !portMatches) {
        mismatches.push({
          del,
          type,
          id,
          memberIdx: mIdx,
          expectedComm: commClean,
          expectedPort: portClean,
          actualComm,
          actualPort
        });

        cpUpserts.push({
          record_type: 'delegation',
          record_id: String(id),
          member_index: mIdx,
          checkpoint_key: 'allocation',
          redeemed: true,
          redeemed_at: new Date().toISOString(),
          redeemed_by: 'Sync Script',
          allocated_committee: commClean,
          allocated_portfolio: portClean,
          notes: `Allocated to ${commClean} (${portClean})`
        });

        // Update local fallback
        const lk = `delegation_${id}`;
        localCheckpoints[lk] = localCheckpoints[lk] || { members: {} };
        localCheckpoints[lk].members = localCheckpoints[lk].members || {};
        localCheckpoints[lk].members[String(mIdx)] = {
          allocation: {
            redeemed: true,
            allocated_committee: commClean,
            allocated_portfolio: portClean
          }
        };
      }
    }
  }

  console.log(`Found ${mismatches.length} mismatches out of ${delegates.length} delegates.`);
  if (mismatches.length > 0) {
    console.log('\nMismatch summary:');
    mismatches.forEach(m => {
      console.log(`  [${m.del.code}] ${m.del.name}: Expected "${m.expectedComm} / ${m.expectedPort}", Actual was "${m.actualComm} / ${m.actualPort}"`);
    });

    console.log(`\nApplying ${cpUpserts.length} checkpoint upserts to Supabase...`);
    for (const cp of cpUpserts) {
      const { error } = await supabase.from('delegate_checkpoints').upsert(cp, {
        onConflict: 'record_type,record_id,member_index,checkpoint_key'
      });
      if (error) console.error(`Error upserting checkpoint for ${cp.record_type} ${cp.record_id} idx ${cp.member_index}:`, error.message);
    }

    console.log(`Applying ${regUpdates.length} registration updates to Supabase...`);
    for (const ru of regUpdates) {
      const { error } = await supabase.from('registrations').update({
        committee1: ru.committee1,
        portfolio1_1: ru.portfolio1_1
      }).eq('id', ru.id);
      if (error) console.error(`Error updating registration ${ru.id}:`, error.message);
    }

    fs.writeFileSync(localCheckpointsPath, JSON.stringify(localCheckpoints, null, 2), 'utf8');
    console.log(`Updated local checkpoints at ${localCheckpointsPath}`);
  }

  console.log('\n--- VERIFICATION PASS ACROSS ALL 172 DELEGATES ---');
  // Re-fetch checkpoints
  const { data: refreshedCp } = await supabase.from('delegate_checkpoints').select('*');
  let passCount = 0;
  let failCount = 0;

  for (const del of delegates) {
    const resolved = resolvePublicToken(del.token) || decodePublicTokenPayload(del.token);
    const { type, id } = resolved;
    let finalComm = '';
    let finalPort = '';

    if (type === 'individual') {
      const reg = regMap.get(id);
      const cp = refreshedCp.find(c => c.record_type === 'individual' && String(c.record_id) === String(id) && c.checkpoint_key === 'allocation');
      finalComm = cp?.allocated_committee || reg?.allocated_committee || reg?.committee1 || '';
      finalPort = cp?.allocated_portfolio || reg?.allocated_portfolio || reg?.portfolio1_1 || '';
    } else {
      const dRecord = delMap.get(id);
      const cp = refreshedCp.find(c => c.record_type === 'delegation' && String(c.record_id) === String(id) && c.member_index === del.memberIdx && c.checkpoint_key === 'allocation');
      const member = dRecord?.roster_data?.[del.memberIdx] || {};
      finalComm = cp?.allocated_committee || member.allocated_committee || member.committee || member.committee1 || member['Committee Preference 1'] || '';
      finalPort = cp?.allocated_portfolio || member.allocated_portfolio || member.portfolio || member.portfolio1_1 || member['Portfolio Preference 1'] || '';
    }

    const cExpected = del.committee.trim();
    const pExpected = del.portfolio.trim();
    const cMatch = finalComm.toLowerCase().includes(cExpected.toLowerCase()) || cExpected.toLowerCase().includes(finalComm.toLowerCase());
    const pMatch = finalPort.trim().toLowerCase() === pExpected.toLowerCase();

    if (cMatch && pMatch) {
      passCount++;
    } else {
      failCount++;
      console.error(`❌ VERIFICATION FAIL [${del.code}] ${del.name}: Expected "${cExpected} | ${pExpected}", Got "${finalComm} | ${finalPort}"`);
    }
  }

  console.log(`\nFINAL RESULTS: ${passCount} PASSED, ${failCount} FAILED out of ${delegates.length} delegates.`);
}

runAuditAndFix().catch(console.error);
