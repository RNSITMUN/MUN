import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function audit() {
  const { data: regs } = await sb.from('registrations').select('*').order('id');
  const { data: cps } = await sb.from('delegate_checkpoints').select('*');

  const cpIndividualRecordIds = new Set(cps.filter(c => c.record_type === 'individual').map(c => String(c.record_id)));
  
  console.log('Confirmed Individual Registrations missing checkpoints:');
  const missingCP = regs.filter(r => r.status === 'Confirmed' && !cpIndividualRecordIds.has(String(r.id)));
  console.table(missingCP.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, college: r.institution, committee: r.committee1, portfolio: r.portfolio1_1 })));

  console.log('\nTotal checkpoints for individuals:', cpIndividualRecordIds.size);
}

audit().catch(console.error);
