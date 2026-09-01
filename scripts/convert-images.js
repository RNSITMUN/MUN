import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const directoriesToSync = [
  path.join(rootDir, 'public', 'globe'),
  path.join(rootDir, 'public', 'team'),
  path.join(rootDir, 'public', 'assets', 'channels'),
  path.join(rootDir, 'public', 'assets', 'Logos'),
];

async function syncDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file, ext);

    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const sourcePath = path.join(dir, file);
      const webpPath = path.join(dir, `${basename}.webp`);

      try {
        const sourceStat = fs.statSync(sourcePath);
        const webpExists = fs.existsSync(webpPath);
        let shouldConvert = true;

        if (webpExists) {
          const webpStat = fs.statSync(webpPath);
          // Convert if source is newer or if forced
          if (sourceStat.mtimeMs <= webpStat.mtimeMs) {
            shouldConvert = false;
          }
        }

        if (shouldConvert) {
          console.log(`Converting: ${path.relative(rootDir, sourcePath)} -> ${basename}.webp`);
          await sharp(sourcePath)
            .webp({ quality: 80 })
            .toFile(webpPath);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }
  }
}

async function main() {
  console.log('--- Syncing WebP Images ---');
  for (const dir of directoriesToSync) {
    await syncDirectory(dir);
  }
  console.log('✅ Image sync complete!');
}

main();
