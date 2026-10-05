import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { createStaffSession } from '../lib/token.js';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Simulate the exact search logic in api/scanner.js
async function simulateSearch(queryParam) {
  const cleanQ = queryParam.toLowerCase().trim();
  const [regRes, delRes] = await Promise.all([
    sb
      .from('registrations')
      .select('id, name, institution, committee1, portfolio1_1, usn, status')
      .neq('status', 'Rejected')
      .limit(300),
    sb
      .from('delegations')
      .select('id, delegation_name, head_name, member_count, roster_data, status')
      .neq('status', 'Rejected')
      .limit(100)
  ]);

  const results = [];
  const regList = regRes.data || [];
  for (const r of regList) {
    if (String(r.status || '').toLowerCase() === 'rejected') continue;
    const rName = r.name || '';
    const match =
      (rName && rName.toLowerCase().includes(cleanQ)) ||
      (r.usn && r.usn.toLowerCase().includes(cleanQ)) ||
      String(r.id) === queryParam;

    if (match) {
      results.push({
        type: 'individual',
        id: r.id,
        name: rName,
        institution: r.institution || '',
        committee: r.committee1 || '',
        portfolio: r.portfolio1_1 || ''
      });
    }
  }

  const delList = delRes.data || [];
  for (const d of delList) {
    if (String(d.status || '').toLowerCase() === 'rejected') continue;
    const dName = d.delegation_name || d.head_name || '';
    const delMatch =
      (d.delegation_name && d.delegation_name.toLowerCase().includes(cleanQ)) ||
      (d.head_name && d.head_name.toLowerCase().includes(cleanQ)) ||
      String(d.id) === queryParam;

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
        const mem = d.roster_data[memIdx];
        const mName = mem.name || mem.delegateName || mem['Delegate Name'] || '';
        const mUsn = mem.slNo || mem.usn || mem['USN / Roll No'] || '';
        const mComm = mem.allocated_committee || mem.committee || mem.committee1 || '';
        const mPort = mem.allocated_portfolio || mem.portfolio || mem.portfolio1_1 || '';

        const memberMatch =
          (mName && mName.toLowerCase().includes(cleanQ)) ||
          (mUsn && mUsn.toLowerCase().includes(cleanQ));

        if (memberMatch) {
          results.push({
            type: 'delegation',
            id: d.id,
            memberIndex: memIdx,
            name: mName,
            institution: d.delegation_name || '',
            committee: mComm,
            portfolio: mPort
          });
        }
      }
    }
  }

  // Fetch checkpoints
  if (results.length > 0) {
    const indIds = results.filter(r => r.type === 'individual').map(r => String(r.id));
    if (indIds.length > 0) {
      const { data: cps } = await sb
        .from('delegate_checkpoints')
        .select('*')
        .eq('record_type', 'individual')
        .in('record_id', indIds)
        .eq('checkpoint_key', 'allocation');
      
      (cps || []).forEach(cp => {
        const match = results.find(r => r.type === 'individual' && String(r.id) === String(cp.record_id));
        if (match) {
          if (cp.allocated_committee) match.committee = cp.allocated_committee;
          if (cp.allocated_portfolio) match.portfolio = cp.allocated_portfolio;
        }
      });
    }
  }

  return results;
}

async function runTests() {
  console.log('=== TEST 1: Searching for "Divyansh" ===');
  const divyansh = await simulateSearch('Divyansh');
  console.log(`Found ${divyansh.length} record(s):`);
  console.table(divyansh);

  console.log('\n=== TEST 2: Searching for "Shubhanga" ===');
  const shubhanga = await simulateSearch('Shubhanga');
  console.log(`Found ${shubhanga.length} record(s):`);
  console.table(shubhanga);

  console.log('\n=== TEST 3: Searching for "Pranati" ===');
  const pranati = await simulateSearch('Pranati');
  console.log(`Found ${pranati.length} record(s):`);
  console.table(pranati);

  console.log('\n=== TEST 4: Searching for "Manvika" ===');
  const manvika = await simulateSearch('Manvika');
  console.log(`Found ${manvika.length} record(s):`);
  console.table(manvika);

  console.log('\n=== TEST 5: Searching for "Aathif" ===');
  const aathif = await simulateSearch('Aathif');
  console.log(`Found ${aathif.length} record(s):`);
  console.table(aathif);

  console.log('\n=== TEST 6: Searching for "Atreya" ===');
  const atreya = await simulateSearch('Atreya');
  console.log(`Found ${atreya.length} record(s):`);
  console.table(atreya);

  console.log('\n=== TEST 7: Searching for "Siddhanth" ===');
  const siddhanth = await simulateSearch('Siddhanth');
  console.log(`Found ${siddhanth.length} record(s):`);
  console.table(siddhanth);
}

runTests().catch(console.error);
