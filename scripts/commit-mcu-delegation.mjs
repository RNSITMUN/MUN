import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getPublicToken } from '../lib/token.js';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// MCU MUN Society Delegation Allocations (delegation ID: 95)
const MCU_DELEGATES = [
  { sno: 1,  name: 'Munaf Mansoor Ahmed', email: 'syedmunafpatel1072@gmail.com', phone: '7619407813', committee: 'Lok Sabha', portfolio: 'Asaduddin Owaisi' },
  { sno: 2,  name: 'Ayesha Amanat',       email: 'ayeshamanat.400@gmail.com',    phone: '7004088229', committee: 'UNHRC',     portfolio: 'Israel' },
  { sno: 3,  name: 'Rashmitha K',         email: 'rashmithakonidela@gmail.com',  phone: '9036676046', committee: 'UNODC',     portfolio: 'Türkiye' },
  { sno: 4,  name: 'Reina Dutta Patwari', email: 'reinaduttapatwari@gmail.com',  phone: '7099004330', committee: 'UNODC',     portfolio: 'Nigeria' },
  { sno: 5,  name: 'Srishti L Prasad',    email: 'srisht30prasad@gmail.com',     phone: '8884883700', committee: 'DISEC',     portfolio: 'Netherlands' },
  { sno: 6,  name: 'Preeti P Nagpal',     email: 'preetipnagpal@gmail.com',      phone: '8050218540', committee: 'UNODC',     portfolio: 'Korea' },
  { sno: 7,  name: 'Maria Japhia',        email: 'hiy.japhia@gmail.com',         phone: '8884259355', committee: 'UNHRC',     portfolio: 'Gambia' },
  { sno: 8,  name: 'Tiara Holly Ireland', email: 'tiaraireland1995@gmail.com',   phone: '7892586841', committee: 'UNHRC',     portfolio: 'Colombia' },
  { sno: 9,  name: 'Haasini',             email: 'haasini.p2007@gmail.com',      phone: '9108737223', committee: 'UNSC',      portfolio: 'Hellenic Republic' },
  { sno: 10, name: 'Supriya S H',         email: 'supriya24sulegai@gmail.com',   phone: '9686303663', committee: 'UNODC',     portfolio: 'Poland' },
  { sno: 11, name: 'Tannu kumari',        email: 'tannukumaritannu95@gmail.com', phone: '9229893618', committee: 'Lok Sabha', portfolio: 'Akhilesh Yadav' },
  { sno: 12, name: 'Dhruti P Mehta',      email: 'dhrutimehtap15@gmail.com',     phone: '8660328043', committee: 'DISEC',     portfolio: 'Sweden' },
  { sno: 13, name: 'Eesith Anand',        email: 'Aaxxfhussn112@gmail.com',      phone: '7899980007', committee: 'DISEC',     portfolio: 'Belgium' },
  { sno: 14, name: 'Mohammad Affan',      email: 'Aaxxfhussn112@gmail.com',      phone: '7899980007', committee: 'IP',        portfolio: 'Times Of India' },
  { sno: 15, name: 'Nischal Agarwal',     email: 'nischalagarwal53@gmail.com',   phone: '8653531423', committee: 'Lok Sabha', portfolio: 'Karti Chidambaram' },
];

const DELEGATION_ID = 95;

async function run() {
  console.log(`\nCommitting MCU MUN Society delegation allocations (${MCU_DELEGATES.length} delegates)...\n`);

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
    if (email && !byEmail.has(email)) byEmail.set(email, idx);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, idx);
    if (name)  byName.set(name, idx);
  });

  // Load local fallback
  const localPath = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  let localData = {};
  if (fs.existsSync(localPath)) {
    try { localData = JSON.parse(fs.readFileSync(localPath, 'utf8')) || {}; } catch (e) {}
  }

  let matched = 0;
  let lateCount = 0;
  const unmatched = [];
  const finalAssignments = [];

  for (const del of MCU_DELEGATES) {
    const cleanEmail = del.email.toLowerCase().trim();
    const cleanPhone = del.phone.replace(/[^0-9]/g, '').slice(-10);
    const cleanName  = del.name.toLowerCase().trim();

    // 1. Name match first (handles shared emails between different people)
    let memberIdx = undefined;
    for (let i = 0; i < members.length; i++) {
      const mName = (members[i].name || members[i].delegateName || members[i]['Delegate Name'] || '').toLowerCase();
      const simpleMName = mName.replace(/[^a-z0-9]/g, '');
      const simpleDelName = cleanName.replace(/[^a-z0-9]/g, '');
      if (simpleMName.includes(simpleDelName) || simpleDelName.includes(simpleMName)) {
        memberIdx = i;
        break;
      }
    }

    // 2. Email / Phone lookup
    if (memberIdx === undefined) memberIdx = byEmail.get(cleanEmail);
    if (memberIdx === undefined) memberIdx = byPhone.get(cleanPhone);

    // 3. Sequential fallback by S.No
    if (memberIdx === undefined && del.sno >= 1 && del.sno <= members.length) {
      memberIdx = del.sno - 1;
    }

    const isLate = memberIdx === undefined;
    const finalIdx = isLate ? (members.length + lateCount) : memberIdx;
    if (isLate) {
      lateCount++;
      unmatched.push(del);
      console.log(`[${del.sno}] ⚠ LATE ADD: ${del.name} → member_index ${finalIdx} | ${del.committee} : ${del.portfolio}`);
    } else {
      const rName = members[memberIdx].name || members[memberIdx].delegateName || members[memberIdx]['Delegate Name'] || '?';
      console.log(`[${del.sno}] ✓ ${del.name} → member[${memberIdx}]: ${rName} | ${del.committee} : ${del.portfolio}`);
    }

    finalAssignments.push({
      del,
      memberIdx: finalIdx,
      isLate
    });

    // Upsert Supabase
    const { error: cpErr } = await sb
      .from('delegate_checkpoints')
      .upsert({
        record_type: 'delegation',
        record_id: String(DELEGATION_ID),
        member_index: finalIdx,
        checkpoint_key: 'allocation',
        allocated_committee: del.committee,
        allocated_portfolio: del.portfolio,
        redeemed: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by: 'Organizer',
        ...(isLate ? { notes: `Late addition: ${del.name} (${del.email} / ${del.phone})` } : {})
      }, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) console.warn(`  Supabase warning [member ${finalIdx}]:`, cpErr.message);

    // Update local fallback
    const k = `delegation_${DELEGATION_ID}_${finalIdx}`;
    localData[k] = {
      allocation: {
        redeemed: true,
        allocated_committee: del.committee,
        allocated_portfolio: del.portfolio
      },
      ...(isLate ? { name: del.name, email: del.email, phone: del.phone, late_addition: true } : {})
    };

    // Also support nested format if used elsewhere
    const delKey = `delegation_${DELEGATION_ID}`;
    if (!localData[delKey]) localData[delKey] = { members: {} };
    if (!localData[delKey].members) localData[delKey].members = {};
    localData[delKey].members[String(finalIdx)] = {
      allocation: { redeemed: true, allocated_committee: del.committee, allocated_portfolio: del.portfolio },
      ...(isLate ? { name: del.name, email: del.email, phone: del.phone, late_addition: true } : {})
    };

    matched++;
  }

  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, JSON.stringify(localData, null, 2), 'utf8');

  console.log(`\n✓ MCU MUN Society delegation: committed ${matched}/${MCU_DELEGATES.length} allocations.`);
  if (unmatched.length > 0) {
    console.log(`\n⚠ Not found in original roster (committed as late additions):`);
    unmatched.forEach(u => console.log(`  • ${u.sno}. ${u.name} | ${u.email} | ${u.phone}`));
  }

  // Generate QR badges for MCU MUN Society
  console.log('\nGenerating QR Badges for MCU MUN Society...');
  const outDir = path.resolve(process.cwd(), 'public', 'qrs', 'MCU_MUN_Society');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const badgePath = path.resolve(process.cwd(), 'assets', 'Logos', 'qr_center_badge.png');
  let badgeBuffer = null;
  if (fs.existsSync(badgePath)) {
    badgeBuffer = await sharp(badgePath).resize(140, 140).toBuffer();
  }

  const whiteCircleSvg = Buffer.from(`
    <svg width="146" height="146" viewBox="0 0 146 146" xmlns="http://www.w3.org/2000/svg">
      <circle cx="73" cy="73" r="73" fill="#FFFFFF"/>
    </svg>
  `);

  const token = getPublicToken('delegation', DELEGATION_ID);

  for (const item of finalAssignments) {
    const { del, memberIdx } = item;
    const memberUrl = memberIdx === 0
      ? `https://mun.rnsit.ac.in/hub?t=${token}`
      : `https://mun.rnsit.ac.in/hub?t=${token}&m=${memberIdx}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(memberUrl)}`;

    try {
      const res = await fetch(qrApiUrl);
      const rawQr = Buffer.from(await res.arrayBuffer());

      let finalQrBuffer = rawQr;
      if (badgeBuffer) {
        finalQrBuffer = await sharp(rawQr)
          .composite([
            { input: whiteCircleSvg, top: 227, left: 227 },
            { input: badgeBuffer, top: 230, left: 230 }
          ])
          .png()
          .toBuffer();
      }

      const memberCode = `DEL-${DELEGATION_ID}-${String(memberIdx + 1).padStart(2, '0')}`;
      const safeName = del.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
      const filename = `${memberCode}_${safeName}.png`;
      const filepath = path.join(outDir, filename);

      fs.writeFileSync(filepath, finalQrBuffer);
      console.log(`  ✓ QR badge saved: ${filename}`);
    } catch (e) {
      console.warn(`  Failed QR badge for member ${memberIdx} (${del.name}):`, e.message);
    }
  }
}

run().catch(console.error);
