import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function diffCheckpointsWithCSV() {
  const { data: cps } = await sb.from('delegate_checkpoints').select('*');
  const csvContent = fs.readFileSync('public/allocations.csv', 'utf8');
  
  console.log(`Total rows in delegate_checkpoints: ${cps.length}`);
  
  const missingInCSV = [];
  for (const cp of cps) {
    const key = `${cp.record_type === 'individual' ? 'IND' : 'DEL'}-${cp.record_id}${cp.record_type === 'delegation' ? '-' + String(cp.member_index + 1).padStart(2, '0') : ''}`;
    if (!csvContent.includes(`"${cp.record_id}"`) && !csvContent.includes(key)) {
      missingInCSV.push({ cpId: cp.id, type: cp.record_type, record_id: cp.record_id, member_index: cp.member_index, committee: cp.allocated_committee, portfolio: cp.allocated_portfolio });
    }
  }
  
  console.log('Checkpoints missing in public/allocations.csv:', missingInCSV);
}

diffCheckpointsWithCSV().catch(console.error);
