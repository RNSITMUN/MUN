import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function inspect() {
  const { data, error } = await sb.from('delegations').select('*').eq('id', 95).single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Delegation 95 keys:', Object.keys(data));
  console.log('Member count:', data.member_count);
  console.log('Roster data length:', data.roster_data?.length);
  console.log('Roster data sample [0]:', data.roster_data?.[0]);
  console.log('Roster data last [14]:', data.roster_data?.[14]);
}


inspect().catch(console.error);
