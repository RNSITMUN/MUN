import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { normalizeCommitteeName } from '../lib/committees.js';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SCAN_CHECKPOINTS = ['day1_entry', 'day1_lunch', 'day1_refreshment', 'day2_entry', 'day2_lunch', 'day2_refreshment'];

function expandAttendanceRow(row) {
  const out = [];
  if (!row) return out;
  SCAN_CHECKPOINTS.forEach(cp => {
    if (row[`${cp}_at`]) {
      out.push({
        record_type: row.record_type,
        record_id: String(row.record_id),
        member_index: row.member_index || 0,
        checkpoint_key: cp,
        redeemed: true,
        redeemed_at: row[`${cp}_at`],
        allocated_committee: row.committee || null
      });
    }
  });
  return out;
}

async function testStats() {
  const roster = JSON.parse(fs.readFileSync('data/allocations.json', 'utf8'));
  const delegateCommitteeMap = new Map();
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

  const { data: attRows, error } = await sb
    .from('delegate_attendance')
    .select('record_type, record_id, member_index, committee, ' + SCAN_CHECKPOINTS.map(c => `${c}_at`).join(', '));

  const dbCheckpoints = Array.isArray(attRows) ? attRows.flatMap(expandAttendanceRow) : [];
  const dbStats = { day1_entry: 0, day1_lunch: 0, day2_entry: 0, day2_lunch: 0 };

  dbCheckpoints.forEach(row => {
    const delegateKey = `${row.record_type}_${row.record_id}_${row.member_index}`;
    if (dbStats[row.checkpoint_key] !== undefined) {
      dbStats[row.checkpoint_key]++;
    }
    const comm = delegateCommitteeMap.get(delegateKey) || normalizeCommitteeName(row.allocated_committee) || 'Unassigned';
    if (byCommittee[comm] && byCommittee[comm][row.checkpoint_key] !== undefined) {
      byCommittee[comm][row.checkpoint_key]++;
    }
  });

  Object.keys(byCommittee).forEach(cName => {
    const c = byCommittee[cName];
    c.day1_remaining = Math.max(0, c.total - (c.day1_entry || 0));
    c.day2_remaining = Math.max(0, c.total - (c.day2_entry || 0));
  });

  console.log('=== OVERALL STATS ===');
  console.log(`Total Delegates: ${roster.length}`);
  console.log(`Day 1 Entry: ${dbStats.day1_entry} / ${roster.length}`);
  console.log(`Day 1 Lunch: ${dbStats.day1_lunch} / ${roster.length}`);

  console.log('\n=== COMMITTEE BREAKDOWN ===');
  console.table(byCommittee);
}

testStats().catch(console.error);
