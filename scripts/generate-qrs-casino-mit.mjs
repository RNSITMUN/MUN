import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getPublicToken } from '../lib/token.js';

// Generates QR badges + hub-links.csv rows for EC Casino Royale (96) and Potentià - MITB (100)
const IDS = [96, 100];
const arr = JSON.parse(fs.readFileSync('data/allocations.json', 'utf8'));

const badgePath = path.resolve('assets/Logos/qr_center_badge.png');
const badgeBuffer = fs.existsSync(badgePath) ? await sharp(badgePath).resize(140, 140).toBuffer() : null;
const whiteCircleSvg = Buffer.from(`<svg width="146" height="146" viewBox="0 0 146 146" xmlns="http://www.w3.org/2000/svg"><circle cx="73" cy="73" r="73" fill="#FFFFFF"/></svg>`);

const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
const hubLines = fs.readFileSync(hubCsvPath, 'utf8').split(/\r?\n/).filter(l => l.trim());
const hubHeader = hubLines[0];
let hubRows = hubLines.slice(1);

for (const id of IDS) {
  const rows = arr.filter(a => Number(a.record_id) === id && a.registration_type === 'Delegation Member');
  const expectedToken = getPublicToken('delegation', id);
  console.log(`\n== ${rows[0]?.delegation_name} (ID ${id}) — ${rows.length} delegates ==`);

  for (const r of rows) {
    if (!r.hub_pass_url.includes(expectedToken)) {
      console.warn(`  ⚠ token mismatch for ${r.allocation_id}: expected ${expectedToken}`);
    }
    const outPath = path.join(path.resolve('public'), r.qr_badge_path);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(r.hub_pass_url)}`;
    const res = await fetch(qrApiUrl);
    if (!res.ok) { console.warn(`  ✗ ${r.allocation_id}: HTTP ${res.status}`); continue; }
    let buf = Buffer.from(await res.arrayBuffer());
    if (badgeBuffer) {
      buf = await sharp(buf).composite([
        { input: whiteCircleSvg, top: 227, left: 227 },
        { input: badgeBuffer, top: 230, left: 230 }
      ]).png().toBuffer();
    }
    fs.writeFileSync(outPath, buf);
    console.log(`  ✓ ${r.qr_badge_path}`);
  }

  // Replace hub-links rows for this delegation
  const prefix = `"DEL-${id}-`;
  hubRows = hubRows.filter(l => !l.includes(prefix));
  rows.forEach(r => hubRows.push([
    0,
    `"${r.allocation_id}"`,
    `"${r.delegate_name}"`,
    `"${r.email} • ${r.phone}"`,
    `"Delegation Member (${r.delegation_name})"`,
    `"${r.allocated_committee}"`,
    `"${r.allocated_portfolio}"`,
    `"${r.hub_pass_url}"`
  ].join(',')));
}

const out = [hubHeader, ...hubRows.map((row, i) => row.replace(/^\d+,/, `${i + 1},`))];
fs.writeFileSync(hubCsvPath, out.join('\n') + '\n', 'utf8');
console.log(`\n✓ hub-links.csv now has ${hubRows.length} delegates.`);
