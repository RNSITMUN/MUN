import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function test() {
  const { data: regs } = await sb.from('registrations').select('id, name, email, phone, status').order('id');
  const rejected = regs.filter(r => (r.status || '').toLowerCase() === 'rejected');
  console.log(`Total registrations: ${regs.length}, Rejected: ${rejected.length}`);
  rejected.forEach(r => console.log(`Rejected [${r.id}] ${r.name} | ${r.email} | ${r.phone}`));
}

test().catch(console.error);
