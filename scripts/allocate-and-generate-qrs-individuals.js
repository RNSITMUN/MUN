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

function normalizeCommittee(comm) {
  const c = String(comm || '').trim();
  const lower = c.toLowerCase();
  if (lower.includes('lok sabha')) return 'Lok Sabha';
  if (lower.includes('disec')) return 'DISEC';
  if (lower.includes('unsc')) return 'UNSC';
  if (lower.includes('unhrc')) return 'UNHRC';
  if (lower.includes('unodc')) return 'UNODC';
  if (lower.includes('ip') || lower.includes('press')) return 'IP';
  return c;
}

function cleanPortfolio(port) {
  const p = String(port || '').trim();
  // Capitalize known lowercase names nicely
  const lower = p.toLowerCase();
  if (lower === 'malaysia') return 'Malaysia';
  if (lower === 'the hindu') return 'The Hindu';
  if (lower === 'nitin gadkari') return 'Nitin Gadkari';
  if (lower === 'rajnath singh') return 'Rajnath Singh';
  if (lower === 'priyanka gandhi') return 'Priyanka Gandhi';
  if (lower === 'rajiv ranjan singh') return 'Rajiv Ranjan Singh';
  return p;
}

const INDIVIDUAL_DELEGATES = [
  { name: 'Shreekant Sanghi', type: 'Internal (RNSIT)', phone: '7568298793', email: 'shreekantsanghi24aiml@rnsit.ac.in', comm: 'Lok Sabha', port: 'Chirag Paswan' },
  { name: 'Rusheel Bhargav NM', type: 'External', phone: '9972265326', email: 'bhargavrusheel24@gmail.com', comm: 'DISEC', port: 'Poland' },
  { name: 'Mayur Navaratna', type: 'Internal (RNSIT)', phone: '9108418248', email: 'manasa.nm@gmail.com', comm: 'UNSC', port: 'Rwanda' },
  { name: 'Ayush Kumar', type: 'Internal (RNSIT)', phone: '7061118560', email: 'ayushkumarrk1958@gmail.com', comm: 'DISEC', port: 'Malaysia' },
  { name: 'Sankalp C Pai', type: 'Internal (RNSIT)', phone: '9902514196', email: 'sankalpcpai25cy@rnsit.ac.in', comm: 'Lok Sabha', port: 'Bandi Sanjay Kumar' },
  { name: 'Priyanshu Jha', type: 'Internal (RNSIT)', phone: '9953722652', email: 'priyanshujha9774@gmail.com', comm: 'Lok Sabha', port: 'Dayanidhi Maran' },
  { name: 'Mayank Kubsad', type: 'Internal (RNSIT)', phone: '9035756337', email: 'kubsadmayank02082008@gmail.com', comm: 'Lok Sabha', port: 'Bhartruhari Mahtab' },
  { name: 'Gourav', type: 'Internal (RNSIT)', phone: '7082673580', email: 'gahlawatgourav439@gmail.com', comm: 'UNHRC', port: 'Republic of Estonia' },
  { name: 'Nandini Bhatt', type: 'Internal (RNSIT)', phone: '8951167700', email: 'nandinibhatt423@gmail.com', comm: 'UNHRC', port: 'Slovenia' },
  { name: 'Mohammed Aayan', type: 'External', phone: '7019673900', email: 'aayanmohammed341@gmail.com', comm: 'DISEC', port: 'Argentina' },
  { name: 'Aditi G', type: 'Internal (RNSIT)', phone: '9180226296', email: 'aditig752008@gmail.com', comm: 'Lok Sabha', port: 'Saugata Roy' },
  { name: 'Aditya Kumar', type: 'Internal (RNSIT)', phone: '8318195890', email: 'adityakumar80049@gmail.com', comm: 'Lok Sabha', port: 'Sarbananda Sonowal' },
  { name: 'Charith G', type: 'Internal (RNSIT)', phone: '7019623366', email: 'charithgs2008@gmail.com', comm: 'Lok Sabha', port: 'T R Baalu' },
  { name: 'Haniel Samson A', type: 'External', phone: '9655142195', email: 'itzhanielsamson@gmail.com', comm: 'UNHRC', port: 'Kingdom of Spain' },
  { name: 'Arsh Saxena', type: 'External', phone: '6396689873', email: 'arshsaxena168@gmail.com', comm: 'UNODC', port: 'Republic of the Philippines' },
  { name: 'Gouravi Nayak', type: 'External', phone: '7019959659', email: 'nayakgouravigagan@gmail.com', comm: 'Lok Sabha', port: 'Dharmendra Pradhan' },
  { name: 'Eshaan Hebbar', type: 'Internal (RNSIT)', phone: '9920138442', email: 'eshaanhebbar.2008@gmail.com', comm: 'DISEC', port: 'Mongolia' },
  { name: 'GARGI MOHAN', type: 'Internal (RNSIT)', phone: '8340782602', email: 'gargimohan27@gmail.com', comm: 'UNODC', port: 'Austria' },
  { name: 'Chethana M.L', type: 'Internal (RNSIT)', phone: '9481003855', email: 'chethanamathr@gmail.com', comm: 'UNODC', port: 'Italy' },
  { name: 'Satvik  G', type: 'Internal (RNSIT)', phone: '8123701905', email: 'satvikg2026@gmail.com', comm: 'Lok Sabha', port: 'Rajiv Ranjan Singh' },
  { name: 'Hajira Tamanna M H', type: 'External', phone: '7676226678', email: 'tamannahajira777@gmail.com', comm: 'IP', port: 'The Hindu' },
  { name: 'Mukund S BELAWADI', type: 'Internal (RNSIT)', phone: '7892311234', email: 'mukundbelawadi@gmail.com', comm: 'DISEC', port: 'UAE' },
  { name: 'K S Bhavin', type: 'Internal (RNSIT)', phone: '9611549352', email: 'bhavinsrikant@gmail.com', comm: 'DISEC', port: 'Mexico' },
  { name: 'Siddharth M', type: 'Internal (RNSIT)', phone: '9019068759', email: 'sidd072k6@gmail.com', comm: 'UNHRC', port: 'Republic of Korea' },
  { name: 'Poojitha Pujari', type: 'External', phone: '6302190997', email: 'pujaripoojitha11@gmail.com', comm: 'UNODC', port: 'Federal Republic of Germany' },
  { name: 'Gayathri Kasiraja', type: 'External', phone: '9036925580', email: 'gayathrikasiraja7@gmail.com', comm: 'UNODC', port: 'UK' },
  { name: 'Namratha G', type: 'Internal (RNSIT)', phone: '8747938415', email: 'namratha.1823@gmail.com', comm: 'UNSC', port: 'Libya' },
  { name: 'Debangshu Som', type: 'Internal (RNSIT)', phone: '9098988300', email: 'debangshucontact@gmail.com', comm: 'UNHRC', port: 'Bolivia' },
  { name: 'Riya B Patel', type: 'Internal (RNSIT)', phone: '9663402308', email: 'riyabpatel25cs@rnsit.ac.in', comm: 'UNODC', port: 'Kingdom of Belgium' },
  { name: 'Pavani R', type: 'Internal (RNSIT)', phone: '7676093364', email: 'pavaniraghu537@gmail.com', comm: 'UNODC', port: 'Netherlands' },
  { name: 'G Gautham Vas', type: 'External', phone: '9945613706', email: 'g.gauthamvas@gmail.com', comm: 'DISEC', port: 'Ireland' },
  { name: 'Annika Chourasia', type: 'External', phone: '7975220160', email: 'annikachourasia@gmail.com', comm: 'UNODC', port: 'Brazil' },
  { name: 'Vibha S', type: 'Internal (RNSIT)', phone: '7353655556', email: 'vibhashashi1@gmail.com', comm: 'UNHRC', port: 'Kenya' },
  { name: 'Rishi Dulhani', type: 'External', phone: '9096780763', email: 'rishidulhani7070@gmail.com', comm: 'UNODC', port: 'Finland' },
  { name: 'Saif Ahmed Shaik', type: 'Internal (RNSIT)', phone: '9632052705', email: 'saifshk2007@gmail.com', comm: 'DISEC', port: 'Socialist Republic of Viet Nam' },
  { name: 'Vinayak rao', type: 'External', phone: '8467093736', email: 'vinayak6rao@gmail.com', comm: 'Lok Sabha', port: 'Kodikunnil Suresh' },
  { name: 'Thanmayee Valekar', type: 'Internal (RNSIT)', phone: '7338317574', email: 'thanmayeevalekar445@gmail.com', comm: 'UNODC', port: 'Grand Duchy of Luxembourg' },
  { name: 'Srishti Krishna', type: 'External', phone: '7760145153', email: 'srishtisparkles@gmail.com', comm: 'UNHRC', port: 'Chile' },
  { name: 'Varun Km', type: 'Internal (RNSIT)', phone: '9731882189', email: 'varunkm2020@gmail.com', comm: 'UNODC', port: 'USA' },
  { name: 'Ashish', type: 'External', phone: '8861066040', email: 'ashishjitarwal@gmail.com', comm: 'DISEC', port: 'Russia' },
  { name: 'RASHMI M KABADI', type: 'Internal (RNSIT)', phone: '9591936752', email: 'rashmi.m.kabadi@gmail.com', comm: 'UNHRC', port: 'DRC' },
  { name: 'Chinmayi V Hegde', type: 'Internal (RNSIT)', phone: '8431534438', email: 'chinmayivhegde25ci@rnsit.ac.in', comm: 'UNODC', port: 'Laos' },
  { name: 'Braghadeesh Ruban', type: 'External', phone: '7092339204', email: 'braghadeesh190807@gmail.com', comm: 'Lok Sabha', port: 'Basavaraj Bommai' },
  { name: 'Aaruni Mohan Shastri', type: 'External', phone: '6362328147', email: 'shastriaaruni@gmail.com', comm: 'UNHRC', port: 'Republic Of India' }
];

async function main() {
  console.log('Fetching all registrations from Supabase...');
  const { data: allRegs, error: fetchErr } = await supabase.from('registrations').select('*');
  if (fetchErr || !allRegs) {
    console.error('Failed to fetch registrations:', fetchErr);
    process.exit(1);
  }
  console.log(`Fetched ${allRegs.length} total registrations.`);

  const outDir = path.resolve(process.cwd(), 'public', 'qrs', 'individual_delegates');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

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

  // Local checkpoints cache
  let localData = {};
  const lp = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  try {
    if (fs.existsSync(lp)) localData = JSON.parse(fs.readFileSync(lp, 'utf8')) || {};
  } catch (e) {}

  const processedList = [];

  for (let i = 0; i < INDIVIDUAL_DELEGATES.length; i++) {
    const item = INDIVIDUAL_DELEGATES[i];
    const cleanEmail = item.email.trim().toLowerCase();
    const cleanPhone = item.phone.replace(/\D/g, '').slice(-10);

    const reg = allRegs.find(r => {
      const rEmail = (r.email || '').trim().toLowerCase();
      const rPhone = (r.phone || '').replace(/\D/g, '').slice(-10);
      return (rEmail && rEmail === cleanEmail) || (cleanPhone && rPhone === cleanPhone);
    });

    if (!reg) {
      console.warn(`⚠️ No DB match found for ${item.name} (${cleanEmail} / ${cleanPhone})`);
      continue;
    }

    const regId = reg.id;
    const finalComm = normalizeCommittee(item.comm);
    const finalPort = cleanPortfolio(item.port);

    // 1. Update registrations table
    const { error: regUpdateErr } = await supabase
      .from('registrations')
      .update({
        committee1: finalComm,
        portfolio1_1: finalPort,
        status: 'Confirmed'
      })
      .eq('id', regId);

    if (regUpdateErr) {
      console.error(`Failed to update registrations ID ${regId}:`, regUpdateErr.message);
    }

    // 2. Upsert allocation checkpoint
    const cpPayload = {
      record_type: 'individual',
      record_id: String(regId),
      member_index: 0,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat Admin',
      allocated_committee: finalComm,
      allocated_portfolio: finalPort,
      notes: `Allocated to ${finalComm} (${finalPort})`
    };

    const { error: cpErr } = await supabase
      .from('delegate_checkpoints')
      .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) {
      console.warn(`Checkpoint upsert warning for ${item.name} (ID: ${regId}):`, cpErr.message);
    }

    // 3. Update local cache
    const lk = `individual_${regId}`;
    if (!localData[lk]) localData[lk] = {};
    localData[lk].allocatedCommittee = finalComm;
    localData[lk].allocatedPortfolio = finalPort;
    localData[lk].allocation = {
      redeemed: true,
      allocated_committee: finalComm,
      allocated_portfolio: finalPort
    };

    // 4. Generate Token & Pass URL
    const token = getPublicToken('individual', regId);
    const passUrl = `https://mun.rnsit.ac.in/hub?t=${token}`;

    // 5. Generate high-res QR code PNG
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(passUrl)}`;
    const safeName = item.name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/__+/g, '_');
    const filename = `IND-${regId}_${safeName}.png`;
    const filepath = path.join(outDir, filename);

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

      fs.writeFileSync(filepath, finalQrBuffer);

      processedList.push({
        sNo: i + 1,
        id: `IND-${regId}`,
        dbId: regId,
        name: item.name,
        delegateType: item.type,
        phone: item.phone,
        email: item.email,
        committee: finalComm,
        portfolio: finalPort,
        token: token,
        passUrl: passUrl,
        filename: filename,
        webPath: `/qrs/individual_delegates/${filename}`
      });

      process.stdout.write(`✓ [${i + 1}/44] ID: ${regId} | ${item.name} -> ${finalComm} (${finalPort})\n`);
    } catch (qrErr) {
      console.error(`Failed to generate QR for ${item.name}:`, qrErr.message);
    }
  }

  // Save local cache
  try {
    fs.writeFileSync(lp, JSON.stringify(localData, null, 2), 'utf8');
    console.log('Saved .data/checkpoints.json cache.');
  } catch (e) {}

  // Generate HTML Gallery for printing & batch downloading
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RNSMUN 2026 — Individual Delegate QR Passes (44 Delegates)</title>
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
    .badge-bar { display: flex; gap: 0.4rem; justify-content: center; margin-bottom: 0.6rem; }
    .tag { display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(212, 175, 55, 0.15); color: #F3C969; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(212, 175, 55, 0.3); }
    .tag-type { background: rgba(255, 255, 255, 0.08); color: #D1D5DB; border-color: rgba(255, 255, 255, 0.15); }
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
    <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;">
      <span class="tag">RNSMUN 2026 OFFICIAL PASSES</span>
      <span class="tag tag-type">INDIVIDUAL DELEGATES</span>
    </div>
    <h1>Individual Delegate Allocations (44 Delegates)</h1>
    <p>Accredited delegates with verified committee & portfolio allotments and personalized QR check-in passes.</p>
  </div>
  <div class="grid">
    ${processedList.map(item => `
      <div class="card">
        <div class="badge-bar">
          <span class="tag">${item.id}</span>
          <span class="tag tag-type">${item.delegateType.replace(' (RNSIT)', '')}</span>
        </div>
        <img class="qr-img" src="./${item.filename}" alt="${item.name} QR Code" />
        <h2 class="name">${item.name}</h2>
        <div class="details">
          <div><strong>Committee:</strong> ${item.committee}</div>
          <div><strong>Portfolio:</strong> ${item.portfolio}</div>
          <div style="font-size: 0.78rem; opacity: 0.8; margin-top: 4px;">${item.email} • ${item.phone}</div>
        </div>
        <div class="actions">
          <a class="btn btn-download" href="./${item.filename}" download>Download QR</a>
          <a class="btn btn-pass" href="${item.passUrl}" target="_blank">View Pass</a>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');
  console.log(`\n🎉 All 44 individual delegate allocations and QR badges successfully created in ${outDir}!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
