import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function inspect9799() {
  const { data: dels } = await sb.from('delegations').select('*').in('id', [97, 99]);
  console.log('Delegations 97 & 99:');
  console.log(JSON.stringify(dels, null, 2));
}

inspect9799().catch(console.error);
