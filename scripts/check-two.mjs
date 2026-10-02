import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function test() {
  const { data: regs } = await sb.from('registrations').select('*').ilike('name', '%Shubhanga%');
  console.log('Regs Shubhanga:', regs);
  const { data: regs2 } = await sb.from('registrations').select('*').ilike('name', '%Pranati%');
  console.log('Regs Pranati:', regs2);

  const ids = [...(regs || []), ...(regs2 || [])].map(r => String(r.id));
  const { data: cps } = await sb.from('delegate_checkpoints').select('*').in('record_id', ids).eq('checkpoint_key', 'allocation');
  console.log('CPs:', cps);
}

test().catch(console.error);
