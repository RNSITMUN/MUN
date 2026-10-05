import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkScanned() {
  console.log('=== 1. Checking delegate_attendance in Supabase ===');
  const { data: att, error: err1 } = await sb.from('delegate_attendance').select('*');
  if (err1) console.error('Attendance error:', err1);
  else {
    console.log(`Total attendance rows in Supabase: ${att.length}`);
    att.forEach(a => {
      console.log('Attendance row:', JSON.stringify(a, null, 2));
    });
  }

  console.log('\n=== 2. Checking delegate_checkpoints (scanned checkpoints) in Supabase ===');
  const { data: cps, error: err2 } = await sb.from('delegate_checkpoints').select('*').neq('checkpoint_key', 'allocation');
  if (err2) console.error('Checkpoints error:', err2);
  else {
    console.log(`Total non-allocation checkpoint rows: ${cps.length}`);
    cps.forEach(c => {
      console.log('Checkpoint row:', JSON.stringify(c, null, 2));
    });
  }

  console.log('\n=== 3. Checking local .data/checkpoints.json ===');
  if (fs.existsSync('.data/checkpoints.json')) {
    const local = JSON.parse(fs.readFileSync('.data/checkpoints.json', 'utf8'));
    Object.keys(local).forEach(k => {
      const entry = local[k];
      const scannedKeys = Object.keys(entry).filter(sub => sub.startsWith('day') && entry[sub]?.redeemed);
      if (scannedKeys.length > 0) {
        console.log(`Local scan on ${k}:`, scannedKeys, entry);
      }
    });
  }
}

checkScanned().catch(console.error);
