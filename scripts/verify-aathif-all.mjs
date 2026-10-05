import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function verify() {
  console.log('=== 1. Checking Supabase Delegations (ID 95) ===');
  const { data: del, error: delErr } = await sb.from('delegations').select('*').eq('id', 95).single();
  if (delErr) console.error('Del error:', delErr);
  else {
    console.log(`Delegation Name: ${del.delegation_name}`);
    console.log(`Member Count: ${del.member_count}`);
    console.log(`Roster Length: ${del.roster_data.length}`);
    const m16 = del.roster_data[15];
    console.log(`Member 16 (index 15): Name: ${m16.name}, Email: ${m16.email}, Phone: ${m16.phone}, Committee: ${m16.committee}, Portfolio: ${m16.portfolio}`);
  }

  console.log('\n=== 2. Checking Supabase delegate_checkpoints (Delegation 95, Index 15) ===');
  const { data: cp, error: cpErr } = await sb.from('delegate_checkpoints').select('*').eq('record_type', 'delegation').eq('record_id', '95').eq('member_index', 15);
  if (cpErr) console.error('CP error:', cpErr);
  else {
    console.log('Checkpoints found:', cp.length);
    cp.forEach(c => console.log(`CP ID ${c.id}: ${c.allocated_committee} | ${c.allocated_portfolio} | Redeemed: ${c.redeemed}`));
  }

  console.log('\n=== 3. Checking Local .data/checkpoints.json ===');
  const localCp = JSON.parse(fs.readFileSync('.data/checkpoints.json', 'utf8'));
  console.log('delegation_95_15:', localCp['delegation_95_15']);

  console.log('\n=== 4. Checking QR Image on Disk ===');
  const qrPath = 'public/qrs/MCU_MUN_Society/DEL-95-16_Aathif_Hussain.png';
  const qrExists = fs.existsSync(qrPath);
  console.log(`${qrPath} exists: ${qrExists} (${qrExists ? fs.statSync(qrPath).size + ' bytes' : ''})`);

  console.log('\n=== 5. Checking CSV & JSON Files ===');
  const pCsv = fs.readFileSync('public/allocations.csv', 'utf8');
  const dCsv = fs.readFileSync('data/allocations.csv', 'utf8');
  const pJson = fs.readFileSync('public/allocations.json', 'utf8');
  const hubCsv = fs.readFileSync('public/qrs/hub-links.csv', 'utf8');
  const hubJson = fs.readFileSync('public/qrs/hub-links.json', 'utf8');
  const hubHtml = fs.readFileSync('public/qrs/hub-links.html', 'utf8');

  console.log('public/allocations.csv includes DEL-95-16:', pCsv.includes('"DEL-95-16"'));
  console.log('data/allocations.csv includes DEL-95-16:', dCsv.includes('"DEL-95-16"'));
  console.log('public/allocations.json includes DEL-95-16:', pJson.includes('"DEL-95-16"'));
  console.log('public/qrs/hub-links.csv includes DEL-95-16:', hubCsv.includes('"DEL-95-16"'));
  console.log('public/qrs/hub-links.json includes DEL-95-16:', hubJson.includes('"DEL-95-16"'));
  console.log('public/qrs/hub-links.html includes DEL-95-16:', hubHtml.includes('DEL-95-16'));
}

verify().catch(console.error);
