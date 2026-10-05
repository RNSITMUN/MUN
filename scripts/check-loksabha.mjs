import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkLokSabha() {
  const { data, error } = await sb.from('delegate_checkpoints').select('delegate_code, delegate_name, committee, portfolio, college_name').eq('committee', 'Lok Sabha').order('delegate_code');
  if (error) console.error(error);
  else {
    console.log(`Total Lok Sabha allocations: ${data.length}`);
    console.table(data);
  }
}

checkLokSabha().catch(console.error);
