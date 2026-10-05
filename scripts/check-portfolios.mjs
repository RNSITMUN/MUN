import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkPortfolios() {
  const { data: cp } = await sb.from('delegate_checkpoints').select('allocated_committee, allocated_portfolio');
  const ls = cp.filter(c => c.allocated_committee && c.allocated_committee.toLowerCase().includes('lok')).map(c => c.allocated_portfolio);
  console.log('Allocated Lok Sabha portfolios:', ls);
  console.log('Is Priyanka Gandhi allocated?', ls.some(p => p.toLowerCase().includes('priyanka')));
  console.log('Is Gaurav Gogoi allocated?', ls.some(p => p.toLowerCase().includes('gogoi')));
}

checkPortfolios().catch(console.error);
