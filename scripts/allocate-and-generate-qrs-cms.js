import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { getPublicToken } from '../lib/token.js';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPaths = ['.env.local', '.env'];
    for (const file of envPaths) {
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length - 1);
          }
          process.env[k] = v;
          if (k === key) return v;
        }
      }
    }
  } catch (e) {}
  return process.env[key] || '';
}

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase credentials missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const CMS_ALLOCATIONS = [
  {
    sNo: 1,
    name: 'Aadya Mittal (Head of Delegation)',
    email: 'aadyamittal6@gmail.com',
    phone: '8726865555',
    committee: 'UNHRC',
    portfolio: 'Iceland'
  },
  {
    sNo: 2,
    name: 'Chirag Shiyal',
    email: 'chirag_shiyal2024@cms.ac.in',
    phone: '9845187919',
    committee: 'Lok Sabha',
    portfolio: 'Narendra Modi'
  },
  {
    sNo: 3,
    name: 'Chavi',
    email: 'chavi.1763@gmail.com',
    phone: '8550000630',
    committee: 'Lok Sabha',
    portfolio: 'Kanimozhi Karunanidhi'
  },
  {
    sNo: 4,
    name: 'Areeb umar',
    email: 'umarareeb2@gmail.com',
    phone: '7428463945',
    committee: 'Lok Sabha',
    portfolio: 'Nitin Gadkari'
  },
  {
    sNo: 5,
    name: 'Vaibhav Raj Deota',
    email: 'vaibhavdeota@gmail.com',
    phone: '7489744953',
    committee: 'Lok Sabha',
    portfolio: 'Rajnath Singh'
  },
  {
    sNo: 6,
    name: 'R Jainav Bohra',
    email: 'jainav1029@gmail.com',
    phone: '8884222990',
    committee: 'Lok Sabha',
    portfolio: 'Priyanka Gandhi'
  },
  {
    sNo: 7,
    name: 'Ronith',
    email: 'khantedronith@gmail.com',
    phone: '9945473052',
    committee: 'UNSC',
    portfolio: 'DRC'
  },
  {
    sNo: 8,
    name: 'Manas Kulkarni',
    email: 'mannuk2307@gmail.com',
    phone: '9148028207',
    committee: 'UNSC',
    portfolio: 'France'
  },
  {
    sNo: 9,
    name: 'Naman Nagori',
    email: 'nagorinaman07@gmail.com',
    phone: '9019347460',
    committee: 'UNODC',
    portfolio: 'Canada'
  },
  {
    sNo: 10,
    name: 'Manushri',
    email: 'naveen.manushri@gmail.com',
    phone: '7483868601',
    committee: 'UNODC',
    portfolio: 'Swiss Confederation'
  },
  {
    sNo: 11,
    name: 'Joshitha Reddy Katterapalli',
    email: 'joshithar869@gmail.com',
    phone: '9849325956',
    committee: 'UNODC',
    portfolio: 'Malaysia'
  },
  {
    sNo: 12,
    name: 'Simar',
    email: 'simar.25001505@jainuniversity.ac.in',
    phone: '90272 73632',
    committee: 'UNODC',
    portfolio: 'Singapore'
  },
  {
    sNo: 13,
    name: 'Sheik Adnaan Ibrahim',
    email: '001adnaan@gmail.com',
    phone: '99868 70364',
    committee: 'UNODC',
    portfolio: 'Cambodia'
  },
  {
    sNo: 14,
    name: 'Sayyam Sakaria Jain',
    email: 'sayyamsakaria1512@gmail.com',
    phone: '9019598910',
    committee: 'DISEC',
    portfolio: 'France'
  },
  {
    sNo: 15,
    name: 'Syed Taqi Mohammed',
    email: 'syedtaqimohammed971@gmail.com',
    phone: '8088923302',
    committee: 'DISEC',
    portfolio: 'Japan'
  },
  {
    sNo: 16,
    name: 'Geethanjali',
    email: 'geethanjalivijay8@gmail.com',
    phone: '7619263677',
    committee: 'IPC',
    portfolio: 'BBC'
  },
  {
    sNo: 17,
    name: 'Latika Mittal',
    email: 'latikamittal2@gmail.com',
    phone: '7017864336',
    committee: 'UNHRC',
    portfolio: 'Netherlands'
  },
  {
    sNo: 18,
    name: 'Taher',
    email: 'taherbharmal910@gmail.com',
    phone: '9916673136',
    committee: 'UNHRC',
    portfolio: 'Albania'
  },
  {
    sNo: 19,
    name: 'Anish Bose',
    email: 'anishbose281107@gmail.com',
    phone: '9181014766',
    committee: 'UNHRC',
    portfolio: 'Indonesia'
  },
  {
    sNo: 20,
    name: 'Aakash Satheesh',
    email: 'aakashsatheesh123@gmail.com',
    phone: '9353823108',
    committee: 'UNHRC',
    portfolio: 'Czech Republic'
  },
  {
    sNo: 21,
    name: 'Arnav Malhan',
    email: 'arnavmalhan18@gmail.com',
    phone: '9915480663',
    committee: 'UNHRC',
    portfolio: 'Qatar'
  },
  {
    sNo: 22,
    name: 'Himanshi Jain',
    email: 'jainhimanshi0809@gmail.com',
    phone: '8807557131',
    committee: 'UNHRC',
    portfolio: 'Republic of South Africa'
  },
  {
    sNo: 23,
    name: 'Vaishnavi Kaki',
    email: 'vaishnavi.kaki1306@gmail.com',
    phone: '7899532719',
    committee: 'UNHRC',
    portfolio: 'Swiss Confederation'
  },
  {
    sNo: 24,
    name: 'Divij Dudani',
    email: 'divijdudani12@gmail.com',
    phone: '88153 10416',
    committee: 'UNSC',
    portfolio: 'Arab Republic of Egypt'
  }
];

async function main() {
  console.log('Fetching CMS delegation (ID 47)...');
  const { data: delegation, error } = await supabase
    .from('delegations')
    .select('*')
    .eq('id', 47)
    .single();

  if (error || !delegation) {
    console.error('Failed to fetch delegation:', error);
    process.exit(1);
  }

  console.log(`Found: "${delegation.delegation_name}", current member_count: ${delegation.member_count}`);

  const existingRoster = Array.isArray(delegation.roster_data) ? delegation.roster_data : [];
  const updatedRoster = [];

  for (let i = 0; i < CMS_ALLOCATIONS.length; i++) {
    const alloc = CMS_ALLOCATIONS[i];
    const existing = existingRoster[i] || {};

    const memberObj = {
      ...existing,
      'S.No': String(alloc.sNo),
      name: alloc.name,
      delegateName: alloc.name,
      'Delegate Name': alloc.name,
      email: alloc.email,
      emailAddress: alloc.email,
      'Email Address': alloc.email,
      phone: alloc.phone,
      mobileNumber: alloc.phone,
      'WhatsApp / Mobile Number': alloc.phone,
      committee: alloc.committee,
      committee1: alloc.committee,
      allocated_committee: alloc.committee,
      allocatedCommittee: alloc.committee,
      allotted_committee: alloc.committee,
      'Committee Allotted': alloc.committee,
      portfolio: alloc.portfolio,
      portfolio1_1: alloc.portfolio,
      allocated_portfolio: alloc.portfolio,
      allocatedPortfolio: alloc.portfolio,
      allotted_portfolio: alloc.portfolio,
      'Portfolio Allotmented': alloc.portfolio,
      institution: 'CMS',
      'Institution / College Name': 'CMS'
    };

    updatedRoster.push(memberObj);
  }

  console.log(`Updating delegations row 47 with 24 members...`);
  const { data: updatedDelegation, error: updateError } = await supabase
    .from('delegations')
    .update({
      member_count: 24,
      roster_data: updatedRoster
    })
    .eq('id', 47)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating delegations row:', updateError);
    process.exit(1);
  }

  console.log('Successfully updated delegations table. Now upserting checkpoints...');

  for (let idx = 0; idx < CMS_ALLOCATIONS.length; idx++) {
    const alloc = CMS_ALLOCATIONS[idx];
    const cpPayload = {
      record_type: 'delegation',
      record_id: '47',
      member_index: idx,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat Admin',
      allocated_committee: alloc.committee,
      allocated_portfolio: alloc.portfolio,
      notes: `Allocated to ${alloc.committee} (${alloc.portfolio})`
    };

    const { error: cpErr } = await supabase
      .from('delegate_checkpoints')
      .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) {
      console.warn(`Checkpoint upsert warning for member ${idx} (${alloc.name}):`, cpErr.message);
    }
  }

  console.log('Checkpoint upserts completed.');

  // Update local cache
  try {
    const lp = path.resolve(process.cwd(), '.data', 'checkpoints.json');
    if (fs.existsSync(lp)) {
      const localData = JSON.parse(fs.readFileSync(lp, 'utf8')) || {};
      for (let idx = 0; idx < CMS_ALLOCATIONS.length; idx++) {
        const alloc = CMS_ALLOCATIONS[idx];
        const k = `delegation_47_${idx}`;
        if (!localData[k]) localData[k] = {};
        localData[k].allocation = {
          redeemed: true,
          allocated_committee: alloc.committee,
          allocated_portfolio: alloc.portfolio
        };
      }
      fs.writeFileSync(lp, JSON.stringify(localData, null, 2), 'utf8');
      console.log('Local store .data/checkpoints.json updated.');
    }
  } catch (err) {
    console.warn('Local cache update skipped:', err.message);
  }

  // CMS delegation DB ID = 47. Token is computed from SERVER_SECRET so it always matches.
  const CMS_DELEGATION_ID = 47;

  // Generate High-Res QR images for all 24 delegates
  const outDir = path.resolve(process.cwd(), 'public', 'qrs', 'CMS_delegation');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Generating high-resolution QR badges for all 24 CMS delegates in ${outDir}...`);

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

  const generatedList = [];

  for (let idx = 0; idx < CMS_ALLOCATIONS.length; idx++) {
    const m = CMS_ALLOCATIONS[idx];
    // Compute token at runtime — always correct regardless of deployment environment
    const token = getPublicToken('delegation', CMS_DELEGATION_ID);
    const memberUrl = idx === 0
      ? `https://mun.rnsit.ac.in/hub?t=${token}`
      : `https://mun.rnsit.ac.in/hub?t=${token}&m=${idx}`;
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

      const safeName = m.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
      const filename = `DEL-47-${String(idx + 1).padStart(2, '0')}_${safeName}.png`;
      const filepath = path.join(outDir, filename);

      fs.writeFileSync(filepath, finalQrBuffer);

      generatedList.push({
        index: idx,
        id: `DEL-47-${String(idx + 1).padStart(2, '0')}`,
        name: m.name,
        committee: m.committee,
        portfolio: m.portfolio,
        email: m.email,
        phone: m.phone,
        url: memberUrl,
        filename: filename,
        webPath: `/qrs/CMS_delegation/${filename}`
      });

      process.stdout.write(`✓ [${idx + 1}/24] ${m.name}\n`);
    } catch (e) {
      console.error(`Failed to generate QR for member ${idx} (${m.name}):`, e.message);
    }
  }

  // Create an HTML gallery / printable index for the delegation QRs
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CMS Delegation — Official Delegate QR Passes (24 Delegates)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0A0D14; color: #F3F4F6; padding: 2rem 1.5rem; }
    .header { text-align: center; margin-bottom: 2.5rem; }
    .header h1 { font-size: 2rem; color: #FFFFFF; font-weight: 800; letter-spacing: -0.02em; }
    .header p { color: #9CA3AF; margin-top: 0.5rem; font-size: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; max-width: 1400px; margin: 0 auto; }
    .card { background: #131826; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; transition: transform 0.2s, border-color 0.2s; }
    .card:hover { transform: translateY(-4px); border-color: rgba(212, 175, 55, 0.4); }
    .qr-img { width: 220px; height: 220px; border-radius: 12px; background: #FFFFFF; padding: 8px; margin-bottom: 1.25rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
    .tag { display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(212, 175, 55, 0.15); color: #F3C969; padding: 4px 10px; border-radius: 999px; margin-bottom: 0.6rem; border: 1px solid rgba(212, 175, 55, 0.3); }
    .name { font-size: 1.15rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.35rem; line-height: 1.3; }
    .details { font-size: 0.85rem; color: #9CA3AF; margin-bottom: 0.75rem; }
    .details strong { color: #E5E7EB; }
    .actions { display: flex; gap: 0.5rem; margin-top: auto; width: 100%; }
    .btn { flex: 1; padding: 0.55rem 0.75rem; font-size: 0.82rem; font-weight: 600; border-radius: 8px; text-decoration: none; text-align: center; }
    .btn-download { background: #6C0D2C; color: #FFFFFF; border: 1px solid #8B1238; }
    .btn-download:hover { background: #8B1238; }
    .btn-pass { background: rgba(255, 255, 255, 0.06); color: #E5E7EB; border: 1px solid rgba(255, 255, 255, 0.12); }
    .btn-pass:hover { background: rgba(255, 255, 255, 0.12); }
    @media print {
      body { background: #FFFFFF; color: #000000; padding: 0; }
      .card { page-break-inside: avoid; border: 1px solid #DDD; background: #FFFFFF; color: #000; }
      .name { color: #000; }
      .tag { background: #EEE; color: #000; border-color: #CCC; }
      .btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="tag">RNSMUN 2026 OFFICIAL PASSES</span>
    <h1>CMS Delegation Roster (24 Delegates)</h1>
    <p>All delegate committees and portfolios allocated with verified accreditation QR codes.</p>
  </div>
  <div class="grid">
    ${generatedList.map(item => `
      <div class="card">
        <span class="tag">${item.id}</span>
        <img class="qr-img" src="./${item.filename}" alt="${item.name} QR Code" />
        <h2 class="name">${item.name}</h2>
        <div class="details">
          <div><strong>Committee:</strong> ${item.committee}</div>
          <div><strong>Portfolio:</strong> ${item.portfolio}</div>
          <div style="font-size: 0.78rem; opacity: 0.8; margin-top: 4px;">${item.email}</div>
        </div>
        <div class="actions">
          <a class="btn btn-download" href="./${item.filename}" download>Download QR</a>
          <a class="btn btn-pass" href="${item.url}" target="_blank">View Pass</a>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');
  console.log(`\n🎉 All 24 QR images and index.html created successfully in ${outDir}!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
