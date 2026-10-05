import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function checkDivyansh() {
  console.log('--- 1. Search in registrations ---');
  const { data: reg, error: err1 } = await sb.from('registrations').select('*').ilike('name', '%divyansh%');
  if (err1) console.error(err1);
  else console.log('Registrations matching Divyansh:', reg);

  console.log('\n--- 2. Search in delegate_checkpoints ---');
  const { data: cp, error: err2 } = await sb.from('delegate_checkpoints').select('*');
  if (err2) console.error(err2);
  else {
    const matchingCp = cp.filter(c => {
      const s = JSON.stringify(c).toLowerCase();
      return s.includes('divyansh') || s.includes('171') || s.includes('114') || s.includes('anurag') || s.includes('amit shah');
    });
    console.log('Matching checkpoints:', matchingCp);
  }

  console.log('\n--- 3. Search in delegations ---');
  const { data: dels } = await sb.from('delegations').select('*');
  (dels || []).forEach(d => {
    const s = JSON.stringify(d).toLowerCase();
    if (s.includes('divyansh')) console.log('Found Divyansh in delegation ID:', d.id, d.delegation_name);
  });

  console.log('\n--- 4. Search in .data/checkpoints.json ---');
  if (fs.existsSync('.data/checkpoints.json')) {
    const local = JSON.parse(fs.readFileSync('.data/checkpoints.json', 'utf8'));
    Object.keys(local).forEach(k => {
      const s = JSON.stringify(local[k]).toLowerCase();
      if (s.includes('divyansh') || s.includes('171') || s.includes('114') || s.includes('169')) {
        console.log('Local checkpoint key:', k, '->', local[k]);
      }
    });
  }

  console.log('\n--- 5. Search in allocations.csv / allocations.json ---');
  const pCsv = fs.readFileSync('public/allocations.csv', 'utf8').split('\n');
  pCsv.filter(l => l.toLowerCase().includes('divyansh')).forEach(l => console.log('public/allocations.csv line:', l));
}

checkDivyansh().catch(console.error);
