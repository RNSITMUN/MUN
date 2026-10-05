import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkKLEJyothy() {
  const { data: regs } = await sb.from('registrations').select('*');
  const matchKLE = regs.filter(r => JSON.stringify(r).toLowerCase().includes('arpit') || JSON.stringify(r).toLowerCase().includes('kle'));
  const matchJyothy = regs.filter(r => JSON.stringify(r).toLowerCase().includes('harini') || JSON.stringify(r).toLowerCase().includes('jyothy'));

  console.log('KLE in registrations:', matchKLE);
  console.log('Jyothy in registrations:', matchJyothy);

  const { data: dels } = await sb.from('delegations').select('*');
  console.log('\nAll active delegations in delegations table:');
  dels.forEach(d => console.log(`ID: ${d.id}, Name: ${d.delegation_name}, Head: ${d.head_name}, Status: ${d.status}, Amount: ${d.payment_amount}, Screenshot: ${d.screenshot_url}`));
}

checkKLEJyothy().catch(console.error);
