import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function auditAll() {
  console.log('=== 1. ALL REJECTED REGISTRATIONS IN SUPABASE ===');
  const { data: reg, error: e1 } = await sb.from('registrations').select('id, name, email, phone, status, committee1, portfolio1_1, usn').order('id');
  if (e1) console.error(e1);
  
  const rejectedRegs = (reg || []).filter(r => String(r.status || '').toLowerCase() === 'rejected');
  const validRegs = (reg || []).filter(r => String(r.status || '').toLowerCase() !== 'rejected');
  
  console.log(`Total registrations: ${reg.length} (Valid/Active: ${validRegs.length}, Rejected: ${rejectedRegs.length})`);
  console.log('Rejected registrations:');
  console.table(rejectedRegs);

  console.log('\n=== 2. ALL REJECTED DELEGATIONS IN SUPABASE ===');
  const { data: del, error: e2 } = await sb.from('delegations').select('id, delegation_name, head_name, email, phone, status, member_count').order('id');
  if (e2) console.error(e2);
  
  const rejectedDels = (del || []).filter(d => String(d.status || '').toLowerCase() === 'rejected');
  const validDels = (del || []).filter(d => String(d.status || '').toLowerCase() !== 'rejected');
  
  console.log(`Total delegations: ${del.length} (Valid/Active: ${validDels.length}, Rejected: ${rejectedDels.length})`);
  console.log('Rejected delegations:');
  console.table(rejectedDels);

  console.log('\n=== 3. CHECKPOINTS LINKED TO REJECTED RECORDS ===');
  const { data: cps, error: e3 } = await sb.from('delegate_checkpoints').select('*');
  if (e3) console.error(e3);
  
  const rejRegIds = new Set(rejectedRegs.map(r => String(r.id)));
  const rejDelIds = new Set(rejectedDels.map(d => String(d.id)));

  const orphanedCps = (cps || []).filter(c => {
    if (c.record_type === 'individual' && rejRegIds.has(String(c.record_id))) return true;
    if (c.record_type === 'delegation' && rejDelIds.has(String(c.record_id))) return true;
    return false;
  });

  console.log(`Orphaned checkpoints on rejected records: ${orphanedCps.length}`);
  console.table(orphanedCps);
}

auditAll().catch(console.error);
