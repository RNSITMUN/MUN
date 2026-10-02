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
  console.log('Delegation 95:', data.delegation_name);
  console.log('Head:', data.head_name);
  console.log('Member count:', data.member_count);
  console.log('Roster length:', data.roster_data?.length);
  console.log('\nRoster members:');
  (data.roster_data || []).forEach((m, i) => {
    console.log(`[${i}]`, m.name || m.delegateName || m['Delegate Name'], '|', m.email || m.emailAddress || m['Email Address'], '|', m.phone || m.mobileNumber || m['WhatsApp / Mobile Number']);
  });
}

inspect().catch(console.error);
