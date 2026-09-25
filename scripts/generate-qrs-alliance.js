import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getPublicToken } from '../lib/token.js';

// ── Supabase setup ────────────────────────────────────────────────────────
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    for (const file of ['.env.local', '.env']) {
      const fp = path.resolve(process.cwd(), file);
      if (!fs.existsSync(fp)) continue;
      for (const line of fs.readFileSync(fp, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) continue;
        const eq = t.indexOf('=');
        const k = t.substring(0, eq).trim();
        let v = t.substring(eq + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (k === key) return v;
      }
    }
  } catch (e) {}
  return '';
}
const supabase = createClient(
  getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY'),
  { auth: { persistSession: false } }
);

const ALLIANCE_DELEGATES = [
  { sNo: 1, name: 'Mridusha Chetry (Head of Delegation)', email: 'misathapa25@gmail.com', phone: '7501057300', comm: 'IP', port: 'Reuters' },
  { sNo: 2, name: 'Mohammad Nezal Arshad', email: 'arshadnezal070@gmail.com', phone: '9939578431', comm: 'Lok Sabha', port: 'G Kishan Reddy' },
  { sNo: 3, name: 'Yashti R Surti', email: 'yashtisurti211@gmail.com', phone: '9537533559', comm: 'Lok Sabha', port: 'Brijmohan Agarwal' },
  { sNo: 4, name: 'R.Joel Shalom', email: 'joelshalompillai@gmail.com', phone: '9849035124', comm: 'UNODC', port: 'India' },
  { sNo: 5, name: 'Sukrithi kallurmath', email: 'sukrithi.kallurmath08@gmail.com', phone: '9910126118', comm: 'Lok Sabha', port: 'Mahua Moitra' },
  { sNo: 6, name: 'Shravya s', email: 'shravya.sen25@gmail.com', phone: '7899271118', comm: 'UNODC', port: 'Bhutan' },
  { sNo: 7, name: 'Pranesh AS', email: 'hppaperproducts@gmail.com', phone: '8778052930', comm: 'UNSC', port: 'Ethiopia' },
  { sNo: 8, name: 'Danda Shanyuth', email: 'shanyuthdanda@gmail.com', phone: '9246408888', comm: 'UNODC', port: 'Japan' },
  { sNo: 9, name: 'Hansiga devendra', email: 'jghansiga@gmail.com', phone: '7710019635', comm: 'UNODC', port: 'Myanmar' },
  { sNo: 10, name: 'Prithvi KF', email: 'prithvifattepur@gmail.com', phone: '9901254158', comm: 'Lok Sabha', port: 'Manish Tewari' },
  { sNo: 11, name: 'Vishal Manjunath', email: 'vishal.manjunath1234@gmail.com', phone: '9538204486', comm: 'Lok Sabha', port: 'Surendra Prasad Yadav' },
  { sNo: 12, name: 'Keerthan Kariappa O L', email: 'myselfolkk@gmail.com', phone: '9148287586', comm: 'Lok Sabha', port: 'Arvind Sawant' },
  { sNo: 13, name: 'Adrito Jasu', email: 'adritojasu04122007@gmail.com', phone: '9007013077', comm: 'UNHRC', port: 'Ghana' },
  { sNo: 14, name: 'Devang', email: 'devangdhoka123@gmail.com', phone: '6360914486', comm: 'UNHRC', port: 'Mexico' },
  { sNo: 15, name: 'Muhammed Salman', email: 'salmanmain77@gmail.com', phone: '9744303911', comm: 'UNSC', port: 'Denmark' },
  { sNo: 16, name: 'Kushaal S Patil', email: 'kushaalp12@gmail.com', phone: '8867800574', comm: 'UNSC', port: 'Iraq' },
  { sNo: 17, name: 'Madhura Meenakshi Tanikella', email: 'meenakshi.tanikella@gmail.com', phone: '8309624491', comm: 'UNHRC', port: 'Kuwait' },
  { sNo: 18, name: 'Prachurya Roy', email: 'prachurya9532@gmail.com', phone: '8597143313', comm: 'DISEC', port: 'Finland' },
  { sNo: 19, name: 'Sai Lochan', email: 'sailochan8@gmail.com', phone: '7353473569', comm: 'DISEC', port: 'Ukraine' },
  { sNo: 20, name: 'Moogambika', email: 'moogambika.official@gmail.com', phone: '8056640488', comm: 'UNSC', port: 'Yemen' }
];

// Alliance delegation DB ID = 67. Token is computed from SERVER_SECRET so it always matches.
const ALLIANCE_DELEGATION_ID = 67;

async function main() {
  const outDir = path.resolve(process.cwd(), 'public', 'qrs', 'Alliance_delegation');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Generating high-resolution QR badges for all 20 Alliance delegates in ${outDir}...`);

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

  for (let idx = 0; idx < ALLIANCE_DELEGATES.length; idx++) {
    const m = ALLIANCE_DELEGATES[idx];
    // Compute token at runtime — always correct regardless of deployment environment
    const token = getPublicToken('delegation', ALLIANCE_DELEGATION_ID);
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
      const filename = `DEL-67-${String(idx + 1).padStart(2, '0')}_${safeName}.png`;
      const filepath = path.join(outDir, filename);

      fs.writeFileSync(filepath, finalQrBuffer);

      generatedList.push({
        index: idx,
        id: `DEL-67-${String(idx + 1).padStart(2, '0')}`,
        name: m.name,
        committee: m.comm,
        portfolio: m.port,
        email: m.email,
        phone: m.phone,
        url: memberUrl,
        filename: filename,
        webPath: `/qrs/Alliance_delegation/${filename}`
      });

      process.stdout.write(`✓ [${idx + 1}/20] ${m.name}\n`);
    } catch (e) {
      console.error(`Failed to generate QR for member ${idx} (${m.name}):`, e.message);
    }
  }

  // Create HTML gallery / printable index
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Alliance Delegation — Official Delegate QR Passes (20 Delegates)</title>
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
    <h1>Alliance Delegation Roster (20 Delegates)</h1>
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

  // Master QR Directory Index
  const masterDir = path.resolve(process.cwd(), 'public', 'qrs');
  const masterIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RNSMUN 2026 — Master QR Code Passes Directory</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0A0D14; color: #F3F4F6; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; }
    .container { max-width: 900px; width: 100%; text-align: center; }
    .badge { display: inline-block; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; background: rgba(212, 175, 55, 0.15); color: #F3C969; padding: 6px 14px; border-radius: 999px; margin-bottom: 1.25rem; border: 1px solid rgba(212, 175, 55, 0.3); }
    h1 { font-size: 2.5rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    p { color: #9CA3AF; margin-bottom: 2.5rem; font-size: 1.05rem; }
    .cards-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; text-align: left; }
    .group-card { background: #131826; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 1.75rem; text-decoration: none; color: inherit; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; }
    .group-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #6C0D2C, #D4AF37); opacity: 0; transition: opacity 0.25s; }
    .group-card:hover { transform: translateY(-5px); border-color: rgba(212, 175, 55, 0.5); box-shadow: 0 16px 32px rgba(0,0,0,0.5); }
    .group-card:hover::before { opacity: 1; }
    .card-title { font-size: 1.3rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem; }
    .card-meta { color: #D4AF37; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.75rem; }
    .card-desc { color: #9CA3AF; font-size: 0.88rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .card-link { font-size: 0.85rem; font-weight: 600; color: #F3C969; display: flex; align-items: center; gap: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">SECRETARIAT ACCREDITATION DESK</span>
    <h1>Official RNSMUN 2026 QR Passes</h1>
    <p>Select a delegation or individual delegate group to browse, print, or download passes.</p>
    <div class="cards-row">
      <a class="group-card" href="./Alliance_delegation/index.html">
        <div>
          <div class="card-meta">20 DELEGATES</div>
          <div class="card-title">Alliance Delegation</div>
          <div class="card-desc">Head of Delegation: Mridusha Chetry. Allocated across IP, Lok Sabha, UNODC, UNSC, UNHRC, and DISEC.</div>
        </div>
        <div class="card-link">View 20 QR Passes &rarr;</div>
      </a>
      <a class="group-card" href="./CMS_delegation/index.html">
        <div>
          <div class="card-meta">24 DELEGATES</div>
          <div class="card-title">CMS Delegation</div>
          <div class="card-desc">Head of Delegation: Aadya Mittal. Allocated across UNHRC, Lok Sabha, UNSC, UNODC, DISEC, and IPC.</div>
        </div>
        <div class="card-link">View 24 QR Passes &rarr;</div>
      </a>
      <a class="group-card" href="./individual_delegates/index.html">
        <div>
          <div class="card-meta">44 DELEGATES</div>
          <div class="card-title">Individual Delegates</div>
          <div class="card-desc">Accredited internal (RNSIT) and external independent delegates allocated across all 6 committees.</div>
        </div>
        <div class="card-link">View 44 QR Passes &rarr;</div>
      </a>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(masterDir, 'index.html'), masterIndexHtml, 'utf8');

  console.log(`\n🎉 All 20 Alliance QR badges created in ${outDir} and master directory index updated in ${masterDir}!`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
