import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const PES_BASE_TOKEN = '02vV7BeLIFB3Vf';
const DELEGATION_ID = 92;

const committeeMeta = {
  'IP': {
    name: 'IP',
    chamber: 'Press Bureau & Media Lab • Academic Block 1',
    whatsapp: 'https://chat.whatsapp.com/Id2vun9PhQhGlRFTQZKoZm'
  },
  'UNSC': {
    name: 'UNSC',
    chamber: 'Council Chamber • MBA Seminar Hall (2nd Floor)',
    whatsapp: 'https://chat.whatsapp.com/LSB4bvcexqoK3JkmQyYqCx'
  },
  'DISEC': {
    name: 'DISEC',
    chamber: 'Committee Room 204 • Civil Seminar Hall',
    whatsapp: 'https://chat.whatsapp.com/ChdeFdrcg0U88lUuaMLrI2'
  },
  'UNHRC': {
    name: 'UNHRC',
    chamber: 'Committee Room 102 • Mech Seminar Hall',
    whatsapp: 'https://chat.whatsapp.com/Kqgvxt2yVwsGGDcWAaC1sC'
  },
  'UNODC': {
    name: 'UNODC',
    chamber: 'Committee Room 301 • ECE Seminar Hall',
    whatsapp: 'https://chat.whatsapp.com/IcgBAXEcbO8F9UCf0DiFJm'
  },
  'Lok Sabha': {
    name: 'Lok Sabha',
    chamber: 'Central Plenary Hall • Chanakya Block',
    whatsapp: 'https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5'
  }
};

const pesDelegates = [
  {
    sno: 1,
    name: 'Saakshi Mohanty (Head of Delegation)',
    cleanName: 'Saakshi Mohanty (Head of Delegation)',
    filenameSafe: 'Saakshi_Mohanty__Head_of_Delegation_',
    email: 'saakshi.mohanty@gmail.com',
    phone: '8660473698',
    institution: 'PES University',
    experience: "Total-3, dsba mun'26-verbal mention",
    pref1Comm: 'IPC',
    pref1Port1: 'Xinhua News Agency',
    pref1Port2: '',
    pref2Comm: 'UNHRC',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'IP',
    allocatedPortfolio: 'Xinhua News Agency'
  },
  {
    sno: 2,
    name: 'Yash Tadi',
    cleanName: 'Yash Tadi',
    filenameSafe: 'Yash_Tadi',
    email: 'yashtadi17046@gmail.com',
    phone: '7016553540',
    institution: 'PES University',
    experience: "Total - 7\nJigyasa'25 - UNSC - Honourable Mention\nROMUN'25 - UNSC - Moderator\nUniCon'26 - UNSC - Moderator",
    pref1Comm: 'UNSC',
    pref1Port1: 'UK',
    pref1Port2: 'France',
    pref2Comm: 'UNSC',
    pref2Port1: 'somalia',
    pref2Port2: 'uk',
    allocatedCommittee: 'UNSC',
    allocatedPortfolio: 'Somalia'
  },
  {
    sno: 3,
    name: 'Eshanaa Gangamma',
    cleanName: 'Eshanaa Gangamma',
    filenameSafe: 'Eshanaa_Gangamma',
    email: 'eshanaagangamma@gmail.com',
    phone: '9148029623',
    institution: 'PES University',
    experience: 'Total-2 , Unicon 26 -Verbal Mention',
    pref1Comm: 'DISEC',
    pref1Port1: 'India',
    pref1Port2: 'France',
    pref2Comm: 'UNODC',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'DISEC',
    allocatedPortfolio: 'India'
  },
  {
    sno: 4,
    name: 'Atreya B Deshpande',
    cleanName: 'Atreya B Deshpande',
    filenameSafe: 'Atreya_B_Deshpande',
    email: 'atreyabdeshpande@gmail.com',
    phone: '8050031005',
    institution: 'PES University',
    experience: "nhvps 2021, 22 - BD\nnhvps 2023,24 - chairperson\nindiamun22 - HD\npecon'21 - OD\nindiamun 21- participated\ndeensmun'21 - OD\ncjcmun 22-HD\nsophiamun - HD\ndpsnmun - HD\nkmun - HD\nrvmun 24 - chairperson\nrvmun 25 - secretary general\nclmun'25 - special mention\njigyasa'25-participated\ndsimun'25 - verbal\nromun'25 - chaired\nchmun - verbal\nirmun'25 - HD\nunicon'26 - verbal\nxenora'26 - verbal\namun26 - bd\nirsmun26 -cd",
    pref1Comm: 'UNSC',
    pref1Port1: 'France',
    pref1Port2: 'USA',
    pref2Comm: 'UNSC',
    pref2Port1: 'France',
    pref2Port2: 'USA',
    allocatedCommittee: 'UNSC',
    allocatedPortfolio: 'USA'
  },
  {
    sno: 5,
    name: 'Saisree Vaishnavi',
    cleanName: 'Saisree Vaishnavi',
    filenameSafe: 'Saisree_Vaishnavi',
    email: 'saisreevaishnavi07@gmail.com',
    phone: '9972346513',
    institution: 'PES University',
    experience: "Total-3, dsba mun'26-verbal mention",
    pref1Comm: 'IPC',
    pref1Port1: '',
    pref1Port2: '',
    pref2Comm: '',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'IP',
    allocatedPortfolio: 'Deutsche Welle (DW)'
  },
  {
    sno: 6,
    name: 'Abhay Anish Abraham',
    cleanName: 'Abhay Anish Abraham',
    filenameSafe: 'Abhay_Anish_Abraham',
    email: 'abhayanish007@gmail.com',
    phone: '9611969808',
    institution: 'PES University',
    experience: 'DNMUN- spec men Presmun- spec men IRSmun - verbal',
    pref1Comm: 'UNHRC',
    pref1Port1: 'Cyprus',
    pref1Port2: 'Iceland',
    pref2Comm: 'DISEC',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'UNHRC',
    allocatedPortfolio: 'Cyprus'
  },
  {
    sno: 7,
    name: 'Ron Jais',
    cleanName: 'Ron Jais',
    filenameSafe: 'Ron_Jais',
    email: 'ronjaisck@gmail.com',
    phone: '9148892550',
    institution: 'PES University',
    experience: 'Total - 2',
    pref1Comm: 'UNHRC',
    pref1Port1: '',
    pref1Port2: '',
    pref2Comm: 'UNODC',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'UNHRC',
    allocatedPortfolio: 'Republic of Türkiye'
  },
  {
    sno: 8,
    name: 'Shloka Shetty',
    cleanName: 'Shloka Shetty',
    filenameSafe: 'Shloka_Shetty',
    email: 'shlokashetty947@gmail.com',
    phone: '7391829537',
    institution: 'PES University',
    experience: 'Total-2 , Unicon 26 -Verbal Mention',
    pref1Comm: 'DISEC',
    pref1Port1: 'Canada',
    pref1Port2: 'Australia',
    pref2Comm: 'UNODC',
    pref2Port1: 'Australia',
    pref2Port2: 'Japan',
    allocatedCommittee: 'DISEC',
    allocatedPortfolio: 'Canada'
  },
  {
    sno: 9,
    name: 'Parnika',
    cleanName: 'Parnika',
    filenameSafe: 'Parnika',
    email: 'parnikahallalli@gmail.com',
    phone: '7996339319',
    institution: 'PES University',
    experience: 'Total - 1',
    pref1Comm: 'UNODC',
    pref1Port1: 'UAE',
    pref1Port2: 'Indonesia',
    pref2Comm: '',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'UNODC',
    allocatedPortfolio: 'Indonesia'
  },
  {
    sno: 10,
    name: 'Pratham',
    cleanName: 'Pratham',
    filenameSafe: 'Pratham',
    email: 'pratkavi2006@gmail.com',
    phone: '9535947221',
    institution: 'PES University',
    experience: "IRS MUN'26 - UNSC - Honourable Mention\nJigyasa 3.0 ‘24 - UNSC - Verbal mention\nJigyasa 4.0 ‘25 - UNSC - Honorable mention\nMCC ‘26 - UNSC - Honorable mention\nNMGDC ‘25- WHO - Special mention\nUnicon ‘25 - UNODC\nRoMun ‘25 - UNSC - moderator\nUnicon ‘26 - UNODC - moderator",
    pref1Comm: 'UNODC',
    pref1Port1: 'China',
    pref1Port2: 'UK',
    pref2Comm: '',
    pref2Port1: '',
    pref2Port2: '',
    allocatedCommittee: 'UNODC',
    allocatedPortfolio: 'China'
  },
  {
    sno: 12,
    name: 'Aditya.R',
    cleanName: 'Aditya.R',
    filenameSafe: 'Aditya_R',
    email: 'adityar.pes@gmail.com',
    phone: '8792213129',
    institution: 'PES University',
    experience: 'Total - 13',
    pref1Comm: 'DISEC',
    pref1Port1: 'Switzerland',
    pref1Port2: 'Belgium',
    pref2Comm: 'UNODC',
    pref2Port1: 'Neatherlands',
    pref2Port2: 'Japan',
    allocatedCommittee: 'DISEC',
    allocatedPortfolio: 'Swiss Confederation'
  },
  {
    sno: 13,
    name: 'Aaron G Sunil',
    cleanName: 'Aaron G Sunil',
    filenameSafe: 'Aaron_G_Sunil',
    email: 'aarongsunil19@gmail.com',
    phone: '9148709221',
    institution: 'PES University',
    experience: 'Total - 13',
    pref1Comm: 'UNSC',
    pref1Port1: 'Russia',
    pref1Port2: 'USA',
    pref2Comm: 'UNODC',
    pref2Port1: 'France',
    pref2Port2: 'Belgium',
    allocatedCommittee: 'UNSC',
    allocatedPortfolio: 'Republic of the Sudan'
  },
  {
    sno: 14,
    name: 'Neil Verma',
    cleanName: 'Neil Verma',
    filenameSafe: 'Neil_Verma',
    email: 'neilv13579@gmail.com',
    phone: '8310759535',
    institution: 'PES University',
    experience: 'NA',
    pref1Comm: 'LOK SABHA',
    pref1Port1: 'Narendra Modi',
    pref1Port2: 'Amit Shah',
    pref2Comm: 'LOK SABHA',
    pref2Port1: 'Rajnath Singh',
    pref2Port2: 'kiren rijiju',
    allocatedCommittee: 'Lok Sabha',
    allocatedPortfolio: 'Pralhad Joshi'
  }
];

async function renderQrCode(url, destinationPath, badgeBuffer, whiteCircleSvg) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(url)}`;
  const res = await fetch(qrApiUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rawQr = Buffer.from(await res.arrayBuffer());

  let finalBuffer = rawQr;
  if (badgeBuffer && whiteCircleSvg) {
    try {
      finalBuffer = await sharp(rawQr)
        .composite([
          { input: whiteCircleSvg, top: 227, left: 227 },
          { input: badgeBuffer, top: 230, left: 230 }
        ])
        .png()
        .toBuffer();
    } catch (_) {}
  }
  fs.writeFileSync(destinationPath, finalBuffer);
}

async function main() {
  console.log(`=== Updating PES University Delegation (${pesDelegates.length} delegates) ===\n`);

  // 1. Build new roster_data array for Supabase
  const newRosterData = pesDelegates.map((d, idx) => {
    return {
      'S.No': String(d.sno),
      'name': d.name,
      'delegateName': d.name,
      'Delegate Name': d.name,
      'email': d.email,
      'emailAddress': d.email,
      'Email Address': d.email,
      'phone': d.phone,
      'mobileNumber': d.phone,
      'WhatsApp / Mobile Number': d.phone,
      'institution': d.institution,
      'Institution / College Name': d.institution,
      'USN / Roll No': '',
      'MUN Experience (No. of conferences attended)': d.experience,
      'Committee Preference 1': d.pref1Comm,
      'Portfolio Preference 1': d.pref1Port1,
      'Portfolio Preference 2': d.pref1Port2,
      'Committee Preference 2': d.pref2Comm,
      'Comm 2 - Portfolio Preference 1': d.pref2Port1,
      'Comm 2 - Portfolio Preference 2': d.pref2Port2,
      'committee': d.allocatedCommittee,
      'portfolio': d.allocatedPortfolio,
      'allocated_committee': d.allocatedCommittee,
      'allocated_portfolio': d.allocatedPortfolio,
      'member_index': idx
    };
  });

  // Update Supabase delegations table (id 92)
  const { error: delErr } = await supabase
    .from('delegations')
    .update({
      member_count: newRosterData.length,
      roster_data: newRosterData
    })
    .eq('id', DELEGATION_ID);

  if (delErr) {
    console.error('Failed to update delegations table:', delErr.message);
  } else {
    console.log(`✓ Updated delegations table (id 92): saved ${newRosterData.length} members in roster_data.`);
  }

  // 2. Re-create delegate_checkpoints for delegation 92
  // Delete existing checkpoints for delegation 92
  const { error: delCpErr } = await supabase
    .from('delegate_checkpoints')
    .delete()
    .eq('record_type', 'delegation')
    .eq('record_id', String(DELEGATION_ID));

  if (delCpErr) {
    console.error('Failed deleting old checkpoints:', delCpErr.message);
  } else {
    console.log('✓ Cleared old checkpoints for delegation 92.');
  }

  // Insert 13 new checkpoints
  const newCheckpoints = pesDelegates.map((d, idx) => ({
    record_type: 'delegation',
    record_id: String(DELEGATION_ID),
    member_index: idx,
    checkpoint_key: 'allocation',
    redeemed: true,
    redeemed_at: new Date().toISOString(),
    redeemed_by: 'PES Delegation Sync',
    allocated_committee: d.allocatedCommittee,
    allocated_portfolio: d.allocatedPortfolio,
    notes: `Allocated to ${d.allocatedCommittee} (${d.allocatedPortfolio})`
  }));

  const { error: insCpErr } = await supabase
    .from('delegate_checkpoints')
    .insert(newCheckpoints);

  if (insCpErr) {
    console.error('Failed inserting new checkpoints:', insCpErr.message);
  } else {
    console.log(`✓ Inserted ${newCheckpoints.length} verified allocation checkpoints in Supabase.`);
  }

  // 3. Update .data/checkpoints.json
  const cpLocalPath = path.resolve('.data/checkpoints.json');
  let cpLocal = {};
  if (fs.existsSync(cpLocalPath)) {
    try { cpLocal = JSON.parse(fs.readFileSync(cpLocalPath, 'utf8')); } catch (_) {}
  }
  const k = `delegation_${DELEGATION_ID}`;
  cpLocal[k] = { members: {} };
  pesDelegates.forEach((d, idx) => {
    cpLocal[k].members[String(idx)] = {
      allocation: {
        redeemed: true,
        allocated_committee: d.allocatedCommittee,
        allocated_portfolio: d.allocatedPortfolio
      },
      name: d.name,
      email: d.email,
      phone: d.phone
    };
  });
  fs.writeFileSync(cpLocalPath, JSON.stringify(cpLocal, null, 2) + '\n', 'utf8');
  console.log('✓ Updated .data/checkpoints.json for delegation 92.');

  // 4. Update QR badge images
  const pesDir = path.resolve('public/qrs/PES_University');
  if (!fs.existsSync(pesDir)) fs.mkdirSync(pesDir, { recursive: true });

  // Delete stale files
  const staleFiles = ['DEL-92-11_Naveen_Karthikeyan.png', 'DEL-92-14_Neil_Verma.png'];
  staleFiles.forEach(f => {
    const fp = path.join(pesDir, f);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`✓ Removed stale badge: ${f}`);
    }
  });

  // Prepare center badge for QR generation
  const badgePath = path.resolve('assets/Logos/qr_center_badge.png');
  let badgeBuffer = null;
  let whiteCircleSvg = null;
  if (fs.existsSync(badgePath)) {
    try {
      badgeBuffer = await sharp(badgePath).resize(140, 140).toBuffer();
      whiteCircleSvg = Buffer.from(`
        <svg width="146" height="146" viewBox="0 0 146 146" xmlns="http://www.w3.org/2000/svg">
          <circle cx="73" cy="73" r="73" fill="#FFFFFF"/>
        </svg>
      `);
    } catch (_) {}
  }

  // Generate / update badges for members 10, 11, 12
  for (let idx = 0; idx < pesDelegates.length; idx++) {
    const d = pesDelegates[idx];
    const codeNum = String(idx + 1).padStart(2, '0');
    const filename = `DEL-92-${codeNum}_${d.filenameSafe}.png`;
    const filePath = path.join(pesDir, filename);

    const hubUrl = `https://mun.rnsit.ac.in/hub?t=${PES_BASE_TOKEN}&m=${idx}`;

    if (!fs.existsSync(filePath)) {
      console.log(`Generating badge: ${filename}...`);
      await renderQrCode(hubUrl, filePath, badgeBuffer, whiteCircleSvg);
    }
  }

  // 5. Update data/allocations.json & public/allocations.json
  const newPesAllocRecords = pesDelegates.map((d, idx) => {
    const codeNum = String(idx + 1).padStart(2, '0');
    const allocId = `DEL-92-${codeNum}`;
    const meta = committeeMeta[d.allocatedCommittee] || {
      chamber: 'General Assembly',
      whatsapp: 'https://chat.whatsapp.com/RNSMUN2026'
    };
    return {
      allocation_id: allocId,
      registration_type: 'Delegation Member',
      record_id: DELEGATION_ID,
      member_index: idx,
      delegate_name: d.name,
      email: d.email,
      phone: d.phone,
      institution: 'PES University',
      college_name: 'PES University',
      delegate_category: 'external',
      delegation_name: 'PES University',
      allocated_committee: d.allocatedCommittee,
      allocated_portfolio: d.allocatedPortfolio,
      session_chamber: meta.chamber,
      whatsapp_community_url: meta.whatsapp,
      hub_pass_url: `https://mun.rnsit.ac.in/hub?t=${PES_BASE_TOKEN}&m=${idx}`,
      qr_badge_path: `/qrs/PES_University/${allocId}_${d.filenameSafe}.png`,
      allocation_status: 'Confirmed',
      payment_status: 'Confirmed'
    };
  });

  ['data/allocations.json', 'public/allocations.json'].forEach(f => {
    const p = path.resolve(f);
    let arr = JSON.parse(fs.readFileSync(p, 'utf8'));

    // Find where DEL-92 records start
    const firstPesIdx = arr.findIndex(a => a.allocation_id.startsWith('DEL-92-'));
    // Remove all old DEL-92 records
    arr = arr.filter(a => !a.allocation_id.startsWith('DEL-92-'));

    if (firstPesIdx !== -1) {
      arr.splice(firstPesIdx, 0, ...newPesAllocRecords);
    } else {
      arr.push(...newPesAllocRecords);
    }

    fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n', 'utf8');
    console.log(`✓ [${f}] Saved with ${arr.length} records (${newPesAllocRecords.length} PES delegates).`);
  });

  // 6. Update data/allocations.csv & public/allocations.csv
  const newPesCsvLines = newPesAllocRecords.map(r => [
    `"${r.allocation_id}"`,
    `"${r.registration_type}"`,
    `"${r.record_id}"`,
    `"${r.member_index}"`,
    `"${r.delegate_name}"`,
    `"${r.email}"`,
    `"${r.phone}"`,
    `"${r.institution}"`,
    `"${r.college_name}"`,
    `"${r.delegate_category}"`,
    `"${r.delegation_name}"`,
    `"${r.allocated_committee}"`,
    `"${r.allocated_portfolio}"`,
    `"${r.session_chamber}"`,
    `"${r.whatsapp_community_url}"`,
    `"${r.hub_pass_url}"`,
    `"${r.qr_badge_path}"`,
    `"${r.allocation_status}"`,
    `"${r.payment_status}"`
  ].join(','));

  ['data/allocations.csv', 'public/allocations.csv'].forEach(f => {
    const p = path.resolve(f);
    let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

    const firstPesLineIdx = lines.findIndex(l => l.startsWith('"DEL-92-'));
    lines = lines.filter(l => !l.startsWith('"DEL-92-'));

    if (firstPesLineIdx !== -1) {
      lines.splice(firstPesLineIdx, 0, ...newPesCsvLines);
    } else {
      lines.push(...newPesCsvLines);
    }

    fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    console.log(`✓ [${f}] Saved with ${lines.length} lines.`);
  });

  // 7. Update public/qrs/hub-links.csv
  const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
  let hubLines = fs.readFileSync(hubCsvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const hubHeader = hubLines[0];
  let hubRows = hubLines.slice(1);

  const firstPesHubIdx = hubRows.findIndex(l => l.includes('"DEL-92-'));
  hubRows = hubRows.filter(l => !l.includes('"DEL-92-'));

  const newPesHubRows = newPesAllocRecords.map(r => [
    0, // placeholder for slNo
    `"${r.allocation_id}"`,
    `"${r.delegate_name}"`,
    `"${r.email} • ${r.phone}"`,
    `"Delegation Member (PES University)"`,
    `"${r.allocated_committee}"`,
    `"${r.allocated_portfolio}"`,
    `"${r.hub_pass_url}"`
  ].join(','));

  if (firstPesHubIdx !== -1) {
    hubRows.splice(firstPesHubIdx, 0, ...newPesHubRows);
  } else {
    hubRows.push(...newPesHubRows);
  }

  // Re-index all Sl Nos from 1 to N
  const finalHubCsvLines = [hubHeader];
  hubRows.forEach((row, i) => {
    finalHubCsvLines.push(row.replace(/^\d+,/, `${i + 1},`));
  });
  fs.writeFileSync(hubCsvPath, finalHubCsvLines.join('\n') + '\n', 'utf8');
  console.log(`✓ [hub-links.csv] Saved with ${hubRows.length} delegates.`);

  console.log('\n=== PES Delegation update completed! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
