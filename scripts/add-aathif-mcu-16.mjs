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

async function execute() {
  console.log('=== Step 1: Fetching Delegation 95 from Supabase ===');
  const { data: del, error: delErr } = await sb.from('delegations').select('*').eq('id', 95).single();
  if (delErr) throw delErr;

  console.log(`Current Delegation 95: ${del.delegation_name}, Members: ${del.member_count}, Roster: ${del.roster_data?.length}`);

  const roster = Array.isArray(del.roster_data) ? [...del.roster_data] : [];
  
  // Check if Aathif is already in roster
  const existingIdx = roster.findIndex(m => {
    const name = (m.name || m.delegateName || m['Delegate Name'] || '').toLowerCase();
    const email = (m.email || m.emailAddress || m['Email Address'] || '').toLowerCase();
    return name.includes('aathif') || (email === 'aaxxfhussn112@gmail.com' && name.includes('aathif'));
  });

  const aathifRosterEntry = {
    'S.No': '16',
    name: 'Aathif Hussain',
    slNo: '2',
    email: 'aaxxfhussn112@gmail.com',
    phone: '7899980007',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1Lu68ryuxHsTETT0jrLKZ4LDNsaOch_Mohd6z_mAw61U/edit?usp=drivesdk',
    committee: 'Lok Sabha',
    portfolio: 'Priyanka Gandhi Vadra (INC)',
    committee1: 'Lok Sabha — House of the People',
    institution: 'MCU MUN Society',
    delegateName: 'Aathif Hussain',
    emailAddress: 'aaxxfhussn112@gmail.com',
    mobileNumber: '7899980007',
    portfolio1_1: 'Priyanka Gandhi Vadra (INC)',
    portfolio2_1: 'Al-Jazeera',
    portfolio2_2: 'Deutsche Welle (DW)',
    'Delegate Name': 'Aathif Hussain',
    'Email Address': 'aaxxfhussn112@gmail.com',
    'USN / Roll No': 'N/A',
    googleSheetLink: 'https://docs.google.com/spreadsheets/d/1Lu68ryuxHsTETT0jrLKZ4LDNsaOch_Mohd6z_mAw61U/edit?usp=drivesdk',
    'Committee Preference 1': 'Lok Sabha — House of the People',
    'Committee Preference 2': 'IP — International Press Corps',
    'Portfolio Preference 1': 'Priyanka Gandhi Vadra (INC)',
    'Portfolio Preference 2': 'Gaurav Gogoi (INC)',
    'WhatsApp / Mobile Number': '7899980007',
    'Institution / College Name': 'MCU MUN Society',
    'Comm 2 - Portfolio Preference 1': 'Al-Jazeera',
    'Comm 2 - Portfolio Preference 2': 'Deutsche Welle (DW)',
    'MUN Experience (No. of conferences attended)': '20+'
  };

  if (existingIdx === -1) {
    roster.push(aathifRosterEntry);
    console.log('Appended Aathif Hussain as 16th member (index 15) to roster_data.');
  } else {
    roster[existingIdx] = aathifRosterEntry;
    console.log(`Updated existing Aathif Hussain at index ${existingIdx} in roster_data.`);
  }

  const { error: updateDelErr } = await sb.from('delegations').update({
    member_count: roster.length,
    roster_data: roster
  }).eq('id', 95);

  if (updateDelErr) throw updateDelErr;
  console.log('✓ Successfully updated Supabase delegations table (id: 95) with 16 members.');

  console.log('\n=== Step 2: Upserting Checkpoint in delegate_checkpoints ===');
  const { error: cpErr } = await sb.from('delegate_checkpoints').upsert({
    record_type: 'delegation',
    record_id: '95',
    member_index: 15,
    checkpoint_key: 'allocation',
    allocated_committee: 'Lok Sabha',
    allocated_portfolio: 'Priyanka Gandhi Vadra (INC)',
    redeemed: true,
    redeemed_at: new Date().toISOString(),
    redeemed_by: 'Organizer',
    notes: 'MCU 16th delegate: Aathif Hussain'
  }, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

  if (cpErr) throw cpErr;
  console.log('✓ Successfully upserted delegate_checkpoints for delegation 95 member 15.');

  console.log('\n=== Step 3: Updating Registration ID 208 if present ===');
  const token = getPublicToken('delegation', 95);
  const hubUrl = `https://mun.rnsit.ac.in/hub?t=${token}&m=15`;
  await sb.from('registrations').update({
    qr_pass_url: hubUrl
  }).eq('id', 208);
  console.log(`✓ Updated registration 208 qr_pass_url to ${hubUrl}`);

  console.log('\n=== Step 4: Updating Local .data/checkpoints.json ===');
  const cpPath = path.resolve('.data', 'checkpoints.json');
  let cpJson = {};
  if (fs.existsSync(cpPath)) {
    try { cpJson = JSON.parse(fs.readFileSync(cpPath, 'utf8')) || {}; } catch (e) {}
  }
  cpJson['delegation_95_15'] = {
    allocation: {
      redeemed: true,
      allocated_committee: 'Lok Sabha',
      allocated_portfolio: 'Priyanka Gandhi Vadra (INC)'
    },
    name: 'Aathif Hussain',
    email: 'aaxxfhussn112@gmail.com',
    phone: '7899980007'
  };
  if (!cpJson['delegation_95']) cpJson['delegation_95'] = { members: {} };
  if (!cpJson['delegation_95'].members) cpJson['delegation_95'].members = {};
  cpJson['delegation_95'].members['15'] = {
    allocation: {
      redeemed: true,
      allocated_committee: 'Lok Sabha',
      allocated_portfolio: 'Priyanka Gandhi Vadra (INC)'
    },
    name: 'Aathif Hussain',
    email: 'aaxxfhussn112@gmail.com',
    phone: '7899980007'
  };
  fs.writeFileSync(cpPath, JSON.stringify(cpJson, null, 2), 'utf8');
  console.log('✓ Updated .data/checkpoints.json.');

  console.log('\n=== Step 5: Generating High-Res QR Badge ===');
  const outDir = path.resolve('public', 'qrs', 'MCU_MUN_Society');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const badgePath = path.resolve('assets', 'Logos', 'qr_center_badge.png');
  let badgeBuffer = null;
  if (fs.existsSync(badgePath)) {
    badgeBuffer = await sharp(badgePath).resize(140, 140).toBuffer();
  }

  const whiteCircleSvg = Buffer.from(`
    <svg width="146" height="146" viewBox="0 0 146 146" xmlns="http://www.w3.org/2000/svg">
      <circle cx="73" cy="73" r="73" fill="#FFFFFF"/>
    </svg>
  `);

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(hubUrl)}`;
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

  const qrFilePath = path.join(outDir, 'DEL-95-16_Aathif_Hussain.png');
  fs.writeFileSync(qrFilePath, finalQrBuffer);
  console.log(`✓ Generated and saved: ${qrFilePath}`);
}

execute().catch(console.error);
