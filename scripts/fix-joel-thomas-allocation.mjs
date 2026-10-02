// Corrects Joel Thomas (individual #194) allocation: State of Palestine -> United Kingdom (UNHRC).
// Usage: node scripts/fix-joel-thomas-allocation.mjs   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = { ...process.env };
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
    const [k, ...v] = l.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  });
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PORTFOLIO = 'United Kingdom of Great Britain and Northern Ireland';
const { error } = await sb.from('delegate_checkpoints').upsert({
  record_type: 'individual', record_id: '194', member_index: 0, checkpoint_key: 'allocation',
  redeemed: true, redeemed_by: 'Admin correction',
  allocated_committee: 'UNHRC', allocated_portfolio: PORTFOLIO,
  redeemed_at: new Date().toISOString()
}, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });
if (error) { console.error('Failed:', error.message); process.exit(1); }
const { data } = await sb.from('delegate_checkpoints').select('allocated_committee, allocated_portfolio')
  .eq('record_type', 'individual').eq('record_id', '194').eq('checkpoint_key', 'allocation').single();
console.log('Joel Thomas now:', data);
