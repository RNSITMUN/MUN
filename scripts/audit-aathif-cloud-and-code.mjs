import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function verifyAll() {
  console.log('--------------------------------------------------');
  console.log('LIVE AUDIT: CLOUD SUPABASE');
  console.log('--------------------------------------------------');
  
  // 1. Check delegations table
  const { data: del, error: delErr } = await sb.from('delegations').select('id, delegation_name, member_count, roster_data').eq('id', 95).single();
  if (delErr) {
    console.error('❌ delegations error:', delErr);
  } else {
    console.log(`✓ Cloud delegations (ID 95):`);
    console.log(`  - Delegation Name: "${del.delegation_name}"`);
    console.log(`  - Member Count in DB: ${del.member_count}`);
    console.log(`  - Total Roster Members in DB: ${del.roster_data?.length}`);
    const m16 = del.roster_data?.[15];
    console.log(`  - 16th Member in DB (index 15):`);
    console.log(`      Name: "${m16?.name || m16?.delegateName}"`);
    console.log(`      Email: "${m16?.email || m16?.emailAddress}"`);
    console.log(`      Phone: "${m16?.phone || m16?.mobileNumber}"`);
    console.log(`      Committee: "${m16?.committee}"`);
    console.log(`      Portfolio: "${m16?.portfolio}"`);
  }

  // 2. Check delegate_checkpoints table
  const { data: cps, error: cpErr } = await sb.from('delegate_checkpoints').select('*').eq('record_type', 'delegation').eq('record_id', '95').eq('member_index', 15);
  if (cpErr) {
    console.error('❌ delegate_checkpoints error:', cpErr);
  } else {
    console.log(`✓ Cloud delegate_checkpoints (delegation 95, index 15): ${cps.length} row(s)`);
    cps.forEach(cp => {
      console.log(`  - Checkpoint ID: ${cp.id}`);
      console.log(`  - Allocated Committee: "${cp.allocated_committee}"`);
      console.log(`  - Allocated Portfolio: "${cp.allocated_portfolio}"`);
      console.log(`  - Redeemed Status: ${cp.redeemed} (at ${cp.redeemed_at})`);
    });
  }

  // 3. Check registrations table
  const { data: reg, error: regErr } = await sb.from('registrations').select('id, name, email, phone, status, qr_pass_url').eq('id', 208).single();
  if (regErr) {
    console.error('❌ registrations error:', regErr);
  } else {
    console.log(`✓ Cloud registrations (ID 208):`);
    console.log(`  - Name: "${reg.name}"`);
    console.log(`  - Status: "${reg.status}"`);
    console.log(`  - QR Pass URL: "${reg.qr_pass_url}"`);
  }

  console.log('\n--------------------------------------------------');
  console.log('LOCAL CODEBASE & FILE INTEGRITY AUDIT');
  console.log('--------------------------------------------------');
  
  const files = [
    { path: 'public/allocations.csv', query: '"DEL-95-16"' },
    { path: 'data/allocations.csv', query: '"DEL-95-16"' },
    { path: 'public/allocations.json', query: '"allocation_id": "DEL-95-16"' },
    { path: 'data/allocations.json', query: '"allocation_id": "DEL-95-16"' },
    { path: 'public/qrs/hub-links.csv', query: '"DEL-95-16"' },
    { path: 'public/qrs/hub-links.json', query: '"code": "DEL-95-16"' },
    { path: 'public/qrs/hub-links.html', query: 'DEL-95-16' },
    { path: '.data/checkpoints.json', query: 'delegation_95_15' },
    { path: 'scripts/commit-mcu-delegation.mjs', query: 'Aathif Hussain' }
  ];

  files.forEach(f => {
    const exists = fs.existsSync(f.path);
    if (!exists) {
      console.log(`❌ ${f.path}: File NOT found`);
      return;
    }
    const content = fs.readFileSync(f.path, 'utf8');
    const hasQuery = content.includes(f.query);
    console.log(`${hasQuery ? '✓' : '❌'} ${f.path.padEnd(38)} : ${hasQuery ? 'CONFIRMED' : 'MISSING'}`);
  });

  const qrBadgePath = 'public/qrs/MCU_MUN_Society/DEL-95-16_Aathif_Hussain.png';
  const qrExists = fs.existsSync(qrBadgePath);
  console.log(`${qrExists ? '✓' : '❌'} ${qrBadgePath.padEnd(38)} : ${qrExists ? `CONFIRMED (${fs.statSync(qrBadgePath).size} bytes)` : 'MISSING'}`);
  console.log('--------------------------------------------------');
}

verifyAll().catch(console.error);
