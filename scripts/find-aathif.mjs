import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkRecent() {
  const { data, error } = await sb.from('registrations').select('id, name, delegate_type, institution, phone, email, committee1, portfolio1_1, status').gte('id', 200).order('id', { ascending: true });
  if (error) console.error(error);
  else console.table(data);
}

checkRecent().catch(console.error);

