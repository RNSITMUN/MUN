import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Alliance Delegation Allocations (delegation ID: 67)
const ALLIANCE_DELEGATES = [
  { sno: 1,  name: 'Mridusha Chetry',            email: 'misathapa25@gmail.com',              phone: '7501057300', committee: 'IP',        portfolio: 'Reuters' },
  { sno: 2,  name: 'Mohammad Nezal Arshad',       email: 'arshadnezal070@gmail.com',           phone: '9939578431', committee: 'Lok Sabha', portfolio: 'G Kishan Reddy' },
  { sno: 3,  name: 'Yashti R Surti',              email: 'yashtisurti211@gmail.com',           phone: '9537533559', committee: 'Lok Sabha', portfolio: 'Brijmohan Agarwal' },
  { sno: 4,  name: 'R Joel Shalom',               email: 'joelshalompillai@gmail.com',         phone: '9849035124', committee: 'UNODC',     portfolio: 'India' },
  { sno: 5,  name: 'Sukrithi Kallurmath',         email: 'sukrithi.kallurmath08@gmail.com',    phone: '9910126118', committee: 'Lok Sabha', portfolio: 'Mahua Moitra' },
  { sno: 6,  name: 'Shravya S',                   email: 'shravya.sen25@gmail.com',            phone: '7899271118', committee: 'UNODC',     portfolio: 'Bhutan' },
  { sno: 7,  name: 'Pranesh AS',                  email: 'hppaperproducts@gmail.com',          phone: '8778052930', committee: 'UNSC',      portfolio: 'Ethiopia' },
  { sno: 8,  name: 'Danda Shanyuth',              email: 'shanyuthdanda@gmail.com',            phone: '9246408888', committee: 'UNODC',     portfolio: 'Japan' },
  { sno: 9,  name: 'Hansiga Devendra',            email: 'jghansiga@gmail.com',                phone: '7710019635', committee: 'UNODC',     portfolio: 'Myanmar' },
  { sno: 10, name: 'Prithvi KF',                  email: 'prithvifattepur@gmail.com',          phone: '9901254158', committee: 'Lok Sabha', portfolio: 'Manish Tewari' },
  { sno: 11, name: 'Vishal Manjunath',            email: 'vishal.manjunath1234@gmail.com',     phone: '9538204486', committee: 'Lok Sabha', portfolio: 'Surendra Prasad Yadav' },
  { sno: 12, name: 'Keerthan Kariappa O L',       email: 'myselfolkk@gmail.com',               phone: '9148287586', committee: 'Lok Sabha', portfolio: 'Arvind Sawant' },
  { sno: 13, name: 'Adrito Jasu',                 email: 'adritojasu04122007@gmail.com',       phone: '9007013077', committee: 'UNHRC',     portfolio: 'Ghana' },
  { sno: 14, name: 'Devang',                      email: 'devangdhoka123@gmail.com',           phone: '6360914486', committee: 'UNHRC',     portfolio: 'Mexico' },
  { sno: 15, name: 'Muhammed Salman',             email: 'salmanmain77@gmail.com',             phone: '9744303911', committee: 'UNSC',      portfolio: 'Denmark' },
  { sno: 16, name: 'Kushaal S Patil',             email: 'kushaalp12@gmail.com',               phone: '8867800574', committee: 'UNSC',      portfolio: 'Iraq' },
  { sno: 17, name: 'Madhura Meenakshi Tanikella', email: 'meenakshi.tanikella@gmail.com',      phone: '8309624491', committee: 'UNHRC',     portfolio: 'Kuwait' },
  { sno: 18, name: 'Prachurya Roy',               email: 'prachurya9532@gmail.com',            phone: '8597143313', committee: 'DISEC',     portfolio: 'Finland' },
  { sno: 19, name: 'Sai Lochan',                  email: 'sailochan8@gmail.com',               phone: '7353473569', committee: 'DISEC',     portfolio: 'Ukraine' },
  { sno: 20, name: 'Moogambika',                  email: 'moogambika.official@gmail.com',      phone: '8056640488', committee: 'UNSC',      portfolio: 'Yemen' },
  { sno: 21, name: 'Vinayak Rao',                 email: 'vinayak6rao@gmail.com',              phone: '8467093736', committee: 'Lok Sabha', portfolio: 'Kodikunnil Suresh' },
  { sno: 22, name: 'Srishti Krishna',             email: 'srishtisparkles@gmail.com',          phone: '7760145153', committee: 'UNHRC',     portfolio: 'Chile' },
];

const DELEGATION_ID = 67;

async function run() {
  console.log(`\nCommitting Alliance delegation allocations (${ALLIANCE_DELEGATES.length} members)...\n`);

  const { data: delegation, error: delErr } = await sb
    .from('delegations')
    .select('*')
    .eq('id', DELEGATION_ID)
    .single();
  if (delErr) throw new Error('Could not fetch delegation: ' + delErr.message);

  const members = delegation.roster_data || delegation.members || [];
  console.log(`Delegation "${delegation.delegation_name}" has ${members.length} registered members in roster_data.\n`);

  // Build lookup maps
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

  // Load local fallback
  const localPath = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  let localData = {};
  if (fs.existsSync(localPath)) {
    try { localData = JSON.parse(fs.readFileSync(localPath, 'utf8')) || {}; } catch (e) {}
  }

  let matched = 0;
  const unmatched = [];

  for (const del of ALLIANCE_DELEGATES) {
    const cleanEmail = del.email.toLowerCase().trim();
    const cleanPhone = del.phone.replace(/[^0-9]/g, '').slice(-10);
    const cleanName  = del.name.toLowerCase().trim();

    let memberIdx = byEmail.get(cleanEmail) ?? byPhone.get(cleanPhone) ?? byName.get(cleanName);

    // Fuzzy name match
    if (memberIdx === undefined) {
      for (const [rName, idx] of byName.entries()) {
        if (rName.startsWith(cleanName) || cleanName.startsWith(rName) ||
            rName.replace(/\s+/g,'').includes(cleanName.replace(/\s+/g,'').substring(0,5))) {
          memberIdx = idx;
          break;
        }
      }
    }

    if (memberIdx === undefined) {
      console.warn(`[${del.sno}/22] ⚠ UNMATCHED: ${del.name} (${del.email} / ${del.phone})`);
      unmatched.push({ ...del, memberIdx: members.length + unmatched.length });
    } else {
      const member = members[memberIdx];
      const rName = member.name || member.delegateName || member['Delegate Name'] || '?';
      console.log(`[${del.sno}/22] ✓ ${del.name} → member[${memberIdx}]: ${rName} | ${del.committee} : ${del.portfolio}`);
    }

    // Use found index or assign next available for late additions
    const finalIdx = memberIdx ?? (members.length + unmatched.length - 1);

    // Upsert into Supabase
    const cpPayload = {
      record_type: 'delegation',
      record_id: String(DELEGATION_ID),
      member_index: finalIdx,
      checkpoint_key: 'allocation',
      allocated_committee: del.committee,
      allocated_portfolio: del.portfolio,
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Organizer',
      ...(memberIdx === undefined ? { notes: `Late addition: ${del.name} (${del.email} / ${del.phone})` } : {})
    };

    const { error: cpErr } = await sb
      .from('delegate_checkpoints')
      .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) console.warn(`  Supabase upsert warning [member ${finalIdx}]:`, cpErr.message);

    // Update local fallback
    const k = `delegation_${DELEGATION_ID}`;
    if (!localData[k]) localData[k] = { members: {} };
    if (!localData[k].members) localData[k].members = {};
    localData[k].members[String(finalIdx)] = {
      allocation: { redeemed: true, allocated_committee: del.committee, allocated_portfolio: del.portfolio },
      ...(memberIdx === undefined ? { name: del.name, email: del.email, phone: del.phone, late_addition: true } : {})
    };

    matched++;
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(localData, null, 2), 'utf8');

  console.log(`\n✓ Alliance delegation: committed ${matched}/${ALLIANCE_DELEGATES.length} allocations.`);
  if (unmatched.length > 0) {
    console.log(`\n⚠ Not found in roster (committed as late additions):`);
    unmatched.forEach(u => console.log(`  • ${u.sno}. ${u.name} | ${u.email} | ${u.phone}`));
  }
}

run().catch(console.error);
