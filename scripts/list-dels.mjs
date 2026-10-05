import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function listAllDelegations() {
  const { data: dels } = await sb.from('delegations').select('id, delegation_name, head_name, member_count, status').order('id');
  console.table(dels);
}

listAllDelegations().catch(console.error);
