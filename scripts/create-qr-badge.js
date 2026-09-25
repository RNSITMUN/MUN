import sharp from 'sharp';

async function createGoldEmblemBadge() {
  const size = 512;
  const radius = size / 2;
  const padding = 14;
  const circleRadius = radius - padding;

  // 1. Load MUN_logo.png
  const { data, info } = await sharp('./assets/Logos/MUN_logo.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Transform blue parts to bright ivory/gold (#FFF5DC or #FBE8C5)
  // Blue in MUN_logo is around R: 43, G: 57, B: 144
  const outData = Buffer.from(data);
  for (let i = 0; i < outData.length; i += 4) {
    const r = outData[i];
    const g = outData[i + 1];
    const b = outData[i + 2];
    const a = outData[i + 3];

    if (a > 20) {
      // Check if it's the blue UN wreath, globe, or text
      if (b > 100 && r < 90 && g < 90) {
        // Brighten to crisp ivory-white with subtle warm gold tint
        outData[i] = 255;
        outData[i + 1] = 248;
        outData[i + 2] = 236;
      } else if (b > 70 && b > r * 1.3 && b > g * 1.3) {
        // Anti-aliased edge pixels of the blue elements
        outData[i] = 255;
        outData[i + 1] = 248;
        outData[i + 2] = 236;
      }
    }
  }

  const processedLogo = await sharp(outData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), { fit: 'inside' })
    .png()
    .toBuffer();

  // Maroon background SVG circle with crisp white border ring
  const svgBadge = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer White Border Ring (separates badge from QR modules) -->
      <circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="#FFFFFF" />
      <!-- Solid Rich Maroon Core -->
      <circle cx="${radius}" cy="${radius}" r="${circleRadius}" fill="#6C0D2C" />
      <!-- Inner Thin Gold Ring Detail -->
      <circle cx="${radius}" cy="${radius}" r="${circleRadius - 3}" fill="none" stroke="rgba(255, 235, 190, 0.4)" stroke-width="1.8" />
    </svg>
  `);

  await sharp(svgBadge)
    .composite([{ input: processedLogo, gravity: 'center' }])
    .png()
    .toFile('./assets/Logos/qr_center_badge.png');

  console.log('qr_center_badge.png generated successfully!');
}

createGoldEmblemBadge().catch(console.error);
