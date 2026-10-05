import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function investigate() {
  console.log('=== 1. SEARCH IN REGISTRATIONS TABLE ===');
  const { data: reg } = await sb.from('registrations').select('*');
  const regMatches = (reg || []).filter(r => {
    const s = JSON.stringify(r).toLowerCase();
    return s.includes('arpit') || s.includes('gawas') || s.includes('8484992445') || s.includes('kle') ||
           s.includes('harini') || s.includes('9535042017') || s.includes('jyothy');
  });
  console.log(`Found ${regMatches.length} matches in registrations:`);
  console.log(JSON.stringify(regMatches, null, 2));

  console.log('\n=== 2. SEARCH IN DELEGATIONS TABLE ===');
  const { data: del } = await sb.from('delegations').select('*');
  const delMatches = (del || []).filter(d => {
    const s = JSON.stringify(d).toLowerCase();
    return s.includes('arpit') || s.includes('gawas') || s.includes('8484992445') || s.includes('kle') ||
           s.includes('harini') || s.includes('9535042017') || s.includes('jyothy');
  });
  console.log(`Found ${delMatches.length} matches in delegations:`);
  console.log(JSON.stringify(delMatches, null, 2));

  console.log('\n=== 3. SEARCH IN DELEGATE_CHECKPOINTS TABLE ===');
  const { data: cps } = await sb.from('delegate_checkpoints').select('*');
  const cpMatches = (cps || []).filter(c => {
    const s = JSON.stringify(c).toLowerCase();
    return s.includes('97') || s.includes('99') || s.includes('arpit') || s.includes('harini') || s.includes('kle') || s.includes('jyothy');
  });
  console.log(`Found ${cpMatches.length} matches in delegate_checkpoints:`);
  console.log(JSON.stringify(cpMatches, null, 2));

  console.log('\n=== 4. SEARCH IN DELEGATE_ATTENDANCE TABLE ===');
  const { data: att } = await sb.from('delegate_attendance').select('*');
  const attMatches = (att || []).filter(a => {
    const s = JSON.stringify(a).toLowerCase();
    return s.includes('97') || s.includes('99') || s.includes('arpit') || s.includes('harini');
  });
  console.log(`Found ${attMatches.length} matches in delegate_attendance:`);
  console.log(JSON.stringify(attMatches, null, 2));

  console.log('\n=== 5. CHECK SCRIPTS HISTORY FOR 97 and 99 ===');
  const files = ['scripts/remove-unverified-delegates.mjs', 'scripts/remove-pes-and-casino-delegations.mjs', 'scripts/generate-master-allocations.mjs'];
  files.forEach(f => {
    if (fs.existsSync(f)) {
      const c = fs.readFileSync(f, 'utf8');
      if (c.includes('97') || c.includes('99') || c.includes('KLE') || c.includes('jyothy')) {
        console.log(`Mentioned in ${f}`);
      }
    }
  });
}

investigate().catch(console.error);
