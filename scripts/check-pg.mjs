import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkPG() {
  const { data: cp } = await sb.from('delegate_checkpoints').select('*').ilike('allocated_portfolio', '%priyanka%');
  console.log('Delegate checkpoints with Priyanka:', cp);
}

checkPG().catch(console.error);
