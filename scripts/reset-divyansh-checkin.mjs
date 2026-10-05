import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function resetDivyansh() {
  console.log('=== 1. Checking delegate_attendance for Divyansh (IND-171) ===');
  const { data: att, error: err1 } = await sb
    .from('delegate_attendance')
    .select('*')
    .eq('record_type', 'individual')
    .eq('record_id', '171');

  if (err1) console.error('Attendance error:', err1);
  else {
    console.log(`Found ${att.length} attendance rows for Divyansh:`);
    console.log(JSON.stringify(att, null, 2));

    if (att.length > 0) {
      const { error: delAttErr } = await sb
        .from('delegate_attendance')
        .delete()
        .eq('record_type', 'individual')
        .eq('record_id', '171');

      if (delAttErr) console.error('Error deleting attendance:', delAttErr);
      else console.log('✓ Cleared Divyansh attendance check-in row from delegate_attendance.');
    }
  }

  console.log('\n=== 2. Checking delegate_checkpoints (scan stamps) for Divyansh (IND-171) ===');
  const { data: cps, error: err2 } = await sb
    .from('delegate_checkpoints')
    .select('*')
    .eq('record_type', 'individual')
    .eq('record_id', '171');

  if (err2) console.error('CP error:', err2);
  else {
    console.log('Checkpoints for Divyansh (IND-171):');
    cps.forEach(c => {
      console.log(`- Checkpoint [${c.checkpoint_key}]: redeemed=${c.redeemed}, committee=${c.allocated_committee}, portfolio=${c.allocated_portfolio}`);
    });

    // Delete any scan checkpoints (day1_entry, day1_lunch, etc.) if present, keeping 'allocation' intact
    const scanCpIds = cps.filter(c => c.checkpoint_key !== 'allocation').map(c => c.id);
    if (scanCpIds.length > 0) {
      const { error: delScanErr } = await sb.from('delegate_checkpoints').delete().in('id', scanCpIds);
      if (delScanErr) console.error('Error deleting scan checkpoints:', delScanErr);
      else console.log(`✓ Deleted ${scanCpIds.length} non-allocation scan checkpoints.`);
    }
  }

  console.log('\n=== 3. Cleaning local store .data/checkpoints.json for Divyansh ===');
  if (fs.existsSync('.data/checkpoints.json')) {
    const local = JSON.parse(fs.readFileSync('.data/checkpoints.json', 'utf8'));
    ['individual_171', 'individual_171_0'].forEach(k => {
      if (local[k]) {
        ['day1_entry', 'day1_lunch', 'day1_refreshment', 'day2_entry', 'day2_lunch', 'day2_refreshment'].forEach(station => {
          delete local[k][station];
        });
        console.log(`✓ Reset local scan stations for ${k}`);
      }
    });
    fs.writeFileSync('.data/checkpoints.json', JSON.stringify(local, null, 2), 'utf8');
  }

  console.log('\n=== 4. Verifying final state ===');
  const { data: finalAtt } = await sb.from('delegate_attendance').select('*');
  console.log(`Total attendance rows remaining in database: ${finalAtt.length}`);
  finalAtt.forEach(a => console.log(`- [ID ${a.id}] ${a.delegate_name} (${a.allocation_id}): Day1 Entry=${a.day1_entry}, Day1 Lunch=${a.day1_lunch}`));
}

resetDivyansh().catch(console.error);
