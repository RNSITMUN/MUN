import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// CMS Delegation Allocations (delegation ID: 47)
const CMS_DELEGATES = [
  { sno: 1,  name: 'Aadya Mittal',              email: 'aadyamittal6@gmail.com',              phone: '8726865555', committee: 'UNHRC',     portfolio: 'Iceland' },
  { sno: 2,  name: 'Chirag Shiyal',              email: 'chirag_shiyal2024@cms.ac.in',          phone: '9845187919', committee: 'Lok Sabha',  portfolio: 'Narendra Modi' },
  { sno: 3,  name: 'Chavi',                      email: 'chavi.1763@gmail.com',                 phone: '8550000630', committee: 'Lok Sabha',  portfolio: 'Kanimozhi Karunanidhi' },
  { sno: 4,  name: 'Areeb Umar',                 email: 'umarareeb2@gmail.com',                 phone: '7428463945', committee: 'Lok Sabha',  portfolio: 'Nitin Gadkari' },
  { sno: 5,  name: 'Vaibhav Raj Deota',          email: 'vaibhavdeota@gmail.com',               phone: '7489744953', committee: 'Lok Sabha',  portfolio: 'Rajnath Singh' },
  { sno: 6,  name: 'R Jainav Bohra',             email: 'jainav1029@gmail.com',                 phone: '8884222990', committee: 'Lok Sabha',  portfolio: 'Rahul Gandhi' },
  { sno: 7,  name: 'Ronith',                     email: 'khantedronith@gmail.com',              phone: '9945473052', committee: 'UNSC',       portfolio: 'DRC' },
  { sno: 8,  name: 'Manas Kulkarni',             email: 'mannuk2307@gmail.com',                 phone: '9148028207', committee: 'UNSC',       portfolio: 'France' },
  { sno: 9,  name: 'Naman Nagori',               email: 'nagorinaman07@gmail.com',              phone: '9019347460', committee: 'UNODC',      portfolio: 'Canada' },
  { sno: 10, name: 'Manushri',                   email: 'naveen.manushri@gmail.com',            phone: '7483868601', committee: 'UNODC',      portfolio: 'Swiss Confederation' },
  { sno: 11, name: 'Joshitha Reddy Katterapalli', email: 'joshithar869@gmail.com',             phone: '9849325956', committee: 'UNODC',      portfolio: 'Malaysia' },
  { sno: 12, name: 'Simar',                      email: 'simar.25001505@jainuniversity.ac.in',  phone: '9027273632', committee: 'UNODC',      portfolio: 'Singapore' },
  { sno: 13, name: 'Sheik Adnaan Ibrahim',        email: '001adnaan@gmail.com',                 phone: '9986870364', committee: 'UNODC',      portfolio: 'Cambodia' },
  { sno: 14, name: 'Sayyam Sakaria Jain',         email: 'sayyamsakaria1512@gmail.com',         phone: '9019598910', committee: 'DISEC',      portfolio: 'France' },
  { sno: 15, name: 'Syed Taqi Mohammed',          email: 'syedtaqimohammed971@gmail.com',       phone: '8088923302', committee: 'DISEC',      portfolio: 'Japan' },
  { sno: 16, name: 'Geethanjali',                email: 'geethanjalivijay8@gmail.com',          phone: '7619263677', committee: 'IP',         portfolio: 'BBC' },
  { sno: 17, name: 'Latika Mittal',              email: 'latikamittal2@gmail.com',              phone: '7017864336', committee: 'UNHRC',      portfolio: 'Netherlands' },
  { sno: 18, name: 'Taher',                      email: 'taherbharmal910@gmail.com',            phone: '9916673136', committee: 'UNHRC',      portfolio: 'Albania' },
  { sno: 19, name: 'Anish Bose',                 email: 'anishbose281107@gmail.com',            phone: '9181014766', committee: 'UNHRC',      portfolio: 'Indonesia' },
  { sno: 20, name: 'Aakash Satheesh',            email: 'aakashsatheesh123@gmail.com',          phone: '9353823108', committee: 'UNHRC',      portfolio: 'Czech Republic' },
  { sno: 21, name: 'Arnav Malhan',               email: 'arnavmalhan18@gmail.com',              phone: '9915480663', committee: 'UNHRC',      portfolio: 'Qatar' },
  { sno: 22, name: 'Himanshi Jain',              email: 'jainhimanshi0809@gmail.com',           phone: '8807557131', committee: 'UNHRC',      portfolio: 'Republic of South Africa' },
  { sno: 23, name: 'Vaishnavi Kaki',             email: 'vaishnavi.kaki1306@gmail.com',         phone: '7899532719', committee: 'UNHRC',      portfolio: 'Swiss Confederation' },
  { sno: 24, name: 'Divij Dudani',               email: 'divijdudani12@gmail.com',              phone: '8815310416', committee: 'UNSC',       portfolio: 'Arab Republic of Egypt' },
  { sno: 25, name: 'Vihaan Passary',             email: 'vihaan090307@gmail.com',               phone: '8018024348', committee: 'DISEC',      portfolio: 'Spain' },
];

const DELEGATION_ID = 47;
const DELEGATION_NAME = 'CMS';
const COLLEGE_NAME = 'CMS Business School';

async function run() {
  console.log(`\nCommitting CMS delegation allocations (${CMS_DELEGATES.length} members)...\n`);

  // Fetch the delegation members from Supabase
  const { data: delegation, error: delErr } = await sb
    .from('delegations')
    .select('*')
    .eq('id', DELEGATION_ID)
    .single();
  if (delErr) throw new Error('Could not fetch delegation: ' + delErr.message);

  // Members are stored in roster_data (not members)
  const members = delegation.roster_data || delegation.members || [];
  console.log(`Delegation "${delegation.delegation_name}" has ${members.length} registered members in roster_data.\n`);

  // Build lookup maps for matching
  const byEmail = new Map();
  const byPhone = new Map();
  const byName  = new Map();

  members.forEach((m, idx) => {
    const email = (m.email || m.emailAddress || m['Email Address'] || '').toLowerCase().trim();
    const phone = (m.phone || m.mobileNumber || m['WhatsApp / Mobile Number'] || '').replace(/[^0-9]/g, '').slice(-10);
    const name  = (m.name || m.delegateName || m['Delegate Name'] || '').toLowerCase().trim();
    if (email) byEmail.set(email, idx);
    if (phone) byPhone.set(phone, idx);
    if (name)  byName.set(name, idx);
  });

  // Load local checkpoints fallback
  const localPath = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  let localData = {};
  if (fs.existsSync(localPath)) {
    try { localData = JSON.parse(fs.readFileSync(localPath, 'utf8')) || {}; } catch (e) {}
  }

  let matched = 0;
  let unmatched = [];

  for (const del of CMS_DELEGATES) {
    const cleanEmail = del.email.toLowerCase().trim();
    const cleanPhone = del.phone.replace(/[^0-9]/g, '').slice(-10);
    const cleanName  = del.name.toLowerCase().trim();

    let memberIdx = byEmail.get(cleanEmail) ?? byPhone.get(cleanPhone) ?? byName.get(cleanName);

    if (memberIdx === undefined) {
      // Fuzzy name match: check if roster name starts with the input name or vice versa
      for (const [rName, idx] of byName.entries()) {
        if (rName.startsWith(cleanName) || cleanName.startsWith(rName)) {
          memberIdx = idx;
          break;
        }
      }
    }

    if (memberIdx === undefined) {
      console.warn(`[${del.sno}/25] ⚠ UNMATCHED: ${del.name} (${del.email} / ${del.phone})`);
      unmatched.push(del);
      continue;
    }

    const member = members[memberIdx];
    console.log(`[${del.sno}/25] ✓ ${del.name} → member[${memberIdx}]: ${member.name} | ${del.committee} : ${del.portfolio}`);

    // Upsert into Supabase delegate_checkpoints
    const cpPayload = {
      record_type: 'delegation',
      record_id: String(DELEGATION_ID),
      member_index: memberIdx,
      checkpoint_key: 'allocation',
      allocated_committee: del.committee,
      allocated_portfolio: del.portfolio,
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Organizer'
    };

    const { error: cpErr } = await sb
      .from('delegate_checkpoints')
      .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) {
      console.warn(`  Supabase upsert warning [member ${memberIdx}]:`, cpErr.message);
    }

    // Update local fallback
    const k = `delegation_${DELEGATION_ID}`;
    if (!localData[k]) localData[k] = { members: {} };
    if (!localData[k].members) localData[k].members = {};
    localData[k].members[String(memberIdx)] = {
      allocation: {
        redeemed: true,
        allocated_committee: del.committee,
        allocated_portfolio: del.portfolio
      }
    };

    matched++;
  }

  // Write local fallback
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(localData, null, 2), 'utf8');

  console.log(`\n✓ CMS delegation: committed ${matched}/${CMS_DELEGATES.length} allocations.`);
  if (unmatched.length > 0) {
    console.log(`\n⚠ Unmatched (${unmatched.length}):`);
    unmatched.forEach(u => console.log(`  • ${u.sno}. ${u.name} | ${u.email} | ${u.phone}`));
    console.log('\nPlease verify these names/emails/phones against the delegation roster in Supabase.');
  }
}

run().catch(console.error);
