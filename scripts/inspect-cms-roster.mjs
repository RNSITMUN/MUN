import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function inspect() {
  const { data: d, error } = await sb.from('delegations').select('id, delegation_name, member_count, roster_data').eq('id', 47).single();
  if (error) throw error;

  console.log(`CMS (id=47): ${d.member_count} members in roster_data\n`);
  const roster = d.roster_data || [];
  roster.forEach((m, i) => {
    console.log(`[${i}] ${JSON.stringify(m)}`);
  });
}

inspect().catch(console.error);
