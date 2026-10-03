// Extracts individual sponsor logos from public/Sponsers/official sponsers.png
// and strips the grey banner backdrop (colour-to-alpha), writing transparent
// logos to public/Sponsers/logos/.
// Usage: node scripts/extract-sponsor-logos.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('public/Sponsers/official sponsers.png');
const OUT = path.resolve('public/Sponsers/logos');
fs.mkdirSync(OUT, { recursive: true });

// Rough crop boxes (in source pixels) — auto-trimmed after background removal.
const LOGOS = [
  { name: 'kunafa-bytes', left: 830, top: 80, width: 290, height: 250 },
  { name: 'vastra-core', left: 1150, top: 80, width: 300, height: 250 },
  { name: 'malnads-arogya', left: 1460, top: 80, width: 370, height: 240 },
];

const meta = await sharp(SRC).metadata();
console.log('Source:', meta.width, 'x', meta.height);

// Sample backdrop colour from an empty area inside the banner.
const sample = await sharp(SRC).extract({ left: 760, top: 340, width: 20, height: 20 })
  .removeAlpha().raw().toBuffer();
let br = 0, bg = 0, bb = 0;
for (let i = 0; i < sample.length; i += 3) { br += sample[i]; bg += sample[i + 1]; bb += sample[i + 2]; }
const n = sample.length / 3;
const B = [br / n, bg / n, bb / n];
console.log('Backdrop colour:', B.map(Math.round));

for (const logo of LOGOS) {
  const { data, info } = await sharp(SRC)
    .extract({ left: logo.left, top: logo.top, width: logo.width, height: logo.height })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // GIMP-style colour-to-alpha against backdrop B.
  for (let i = 0; i < data.length; i += 4) {
    const p = [data[i], data[i + 1], data[i + 2]];
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const d = p[c] - B[c];
      const ac = d > 0 ? d / (255 - B[c]) : d < 0 ? -d / B[c] : 0;
      if (ac > a) a = ac;
    }
    a = Math.min(1, a);
    if (a < 0.04) { data[i + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, Math.round((p[c] - B[c]) / a + B[c])));
    }
    data[i + 3] = Math.round(a * 255);
  }

  const base = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 });
  const png = await base.png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(OUT, `${logo.name}.png`), png);
  await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, `${logo.name}.webp`));
  const m = await sharp(png).metadata();
  console.log(`✓ ${logo.name}: ${m.width}x${m.height}`);
}
