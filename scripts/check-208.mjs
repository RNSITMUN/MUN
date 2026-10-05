import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function check208() {
  const { data: cp } = await sb.from('delegate_checkpoints').select('*').eq('record_id', '208');
  console.log('All checkpoints for record_id 208:', cp);
  
  const { data: reg } = await sb.from('registrations').select('*').eq('id', 208);
  console.log('Registration 208:', reg);
}

check208().catch(console.error);
