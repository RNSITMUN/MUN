import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function cleanup() {
  const rejectedIds = ['114', '126', '127', '152', '169', '173', '179', '192', '204'];
  console.log('Targeting orphaned checkpoints on rejected registration IDs:', rejectedIds);

  const { data: toDelete, error: findErr } = await sb
    .from('delegate_checkpoints')
    .select('id, record_type, record_id, allocated_committee, allocated_portfolio, notes')
    .eq('record_type', 'individual')
    .in('record_id', rejectedIds);

  if (findErr) throw findErr;
  console.log(`Found ${toDelete.length} orphaned checkpoint rows to remove:`);
  console.table(toDelete);

  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(r => r.id);
    const { error: delErr } = await sb
      .from('delegate_checkpoints')
      .delete()
      .in('id', idsToDelete);

    if (delErr) throw delErr;
    console.log(`✓ Successfully deleted ${idsToDelete.length} orphaned checkpoints.`);
  }

  // Verify that all confirmed registrations still have their checkpoints
  const { data: confirmedCps, error: cErr } = await sb
    .from('delegate_checkpoints')
    .select('id, record_type, record_id, member_index, allocated_committee, allocated_portfolio')
    .order('id');
  if (cErr) throw cErr;

  console.log(`\nTotal remaining active checkpoints in delegate_checkpoints: ${confirmedCps.length}`);
}

cleanup().catch(console.error);
