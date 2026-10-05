import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function verifyValidRegistrations() {
  const { data: reg } = await sb.from('registrations').select('*').order('id');
  const { data: cps } = await sb.from('delegate_checkpoints').select('*');

  const valid = reg.filter(r => String(r.status || '').toLowerCase() !== 'rejected');
  console.log(`Total valid registrations in Supabase: ${valid.length}`);

  const cpMap = new Map();
  cps.forEach(c => {
    cpMap.set(`${c.record_type}_${c.record_id}_${c.member_index || 0}`, c);
  });

  const validWithCP = valid.filter(r => cpMap.has(`individual_${r.id}_0`));
  console.log(`Valid registrations with active allocation checkpoints: ${validWithCP.length}`);

  // Check the replacements for the rejected ones
  const checkNames = ['Gandhan', 'Abhishree', 'Pavani', 'Divyansh', 'Shubhanga', 'Pranati', 'Manvika'];
  checkNames.forEach(name => {
    const regs = reg.filter(r => (r.name || '').toLowerCase().includes(name.toLowerCase()));
    console.log(`\nRegistrations for ${name}:`);
    regs.forEach(r => {
      const cp = cpMap.get(`individual_${r.id}_0`);
      console.log(`  ID ${r.id} | Status: ${r.status} | Email: ${r.email} | Committee: ${r.committee1} | Port: ${r.portfolio1_1} | CP: ${cp ? cp.allocated_committee + ' - ' + cp.allocated_portfolio : 'NONE'}`);
    });
  });
}

verifyValidRegistrations().catch(console.error);
