import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Vihaan Passary is delegate #25 in the CMS allocation but not in the 24-member registered roster.
// We'll add them as member_index 24 (0-based), storing as an allocation-only checkpoint.
// This handles late additions to the delegation.

const DELEGATION_ID = 47;
const vihaan = {
  name: 'Vihaan Passary',
  email: 'vihaan090307@gmail.com',
  phone: '8018024348',
  committee: 'DISEC',
  portfolio: 'Spain',
  memberIndex: 24  // next index after the 24 registered members (0-23)
};

async function run() {
  // First check current roster to confirm Vihaan is missing
  const { data: del } = await sb.from('delegations').select('delegation_name, member_count, roster_data').eq('id', DELEGATION_ID).single();
  const roster = del.roster_data || [];
  const found = roster.find(m => {
    const email = (m.email || m.emailAddress || '').toLowerCase();
    const phone = (m.phone || m.mobileNumber || '').replace(/[^0-9]/g, '').slice(-10);
    return email === vihaan.email || phone === vihaan.phone.replace(/[^0-9]/g, '').slice(-10);
  });

  if (found) {
    const memberIdx = roster.indexOf(found);
    console.log(`Vihaan found in roster at index ${memberIdx}. Using that index.`);
    vihaan.memberIndex = memberIdx;
  } else {
    console.log(`Vihaan NOT in registered roster (${roster.length} members). Will add as member_index ${vihaan.memberIndex} (late addition).`);
  }

  // Upsert checkpoint
  const cpPayload = {
    record_type: 'delegation',
    record_id: String(DELEGATION_ID),
    member_index: vihaan.memberIndex,
    checkpoint_key: 'allocation',
    allocated_committee: vihaan.committee,
    allocated_portfolio: vihaan.portfolio,
    redeemed: true,
    redeemed_at: new Date().toISOString(),
    redeemed_by: 'Organizer',
    notes: `Late addition: ${vihaan.name} (${vihaan.email} / ${vihaan.phone})`
  };

  const { error } = await sb
    .from('delegate_checkpoints')
    .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

  if (error) {
    console.error('Supabase upsert error:', error.message);
  } else {
    console.log(`✓ Vihaan Passary committed → DISEC : Spain (member_index: ${vihaan.memberIndex})`);
  }

  // Update local fallback
  const localPath = '.data/checkpoints.json';
  let localData = {};
  if (fs.existsSync(localPath)) {
    try { localData = JSON.parse(fs.readFileSync(localPath, 'utf8')); } catch (e) {}
  }
  const k = `delegation_${DELEGATION_ID}`;
  if (!localData[k]) localData[k] = { members: {} };
  if (!localData[k].members) localData[k].members = {};
  localData[k].members[String(vihaan.memberIndex)] = {
    name: vihaan.name,
    email: vihaan.email,
    phone: vihaan.phone,
    late_addition: true,
    allocation: {
      redeemed: true,
      allocated_committee: vihaan.committee,
      allocated_portfolio: vihaan.portfolio
    }
  };
  fs.writeFileSync(localPath, JSON.stringify(localData, null, 2), 'utf8');
  console.log('✓ Local fallback updated.');
}

run().catch(console.error);
