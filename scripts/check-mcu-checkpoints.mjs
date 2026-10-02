import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function check() {
  const { data, error } = await sb.from('delegate_checkpoints').select('*').eq('record_type', 'delegation').eq('record_id', '95');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Checkpoints in Supabase for 95:', data.length);
  data.sort((a,b) => a.member_index - b.member_index).forEach(d => {
    console.log(`[${d.member_index}] ${d.allocated_committee} | ${d.allocated_portfolio} | redeemed: ${d.redeemed}`);
  });
}

check().catch(console.error);
