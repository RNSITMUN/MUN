import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { getPublicToken } from '../lib/token.js';

// ── Environment variable loader ─────────────────────────────────────────────
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    for (const file of ['.env.local', '.env']) {
      const fullPath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(fullPath)) continue;
      const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const k = trimmed.substring(0, eqIdx).trim();
        let v = trimmed.substring(eqIdx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
        if (k === key) return v;
      }
    }
  } catch (err) {}
  return process.env[key] || '';
}

const isForce = process.argv.includes('--force');

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

function sanitizeFilename(name) {
  return String(name || '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
}

async function renderQrCode(url, destinationPath, badgeBuffer, whiteCircleSvg) {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=H&data=${encodeURIComponent(url)}`;
  const res = await fetch(qrApiUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch QR image from generator service: HTTP ${res.status}`);
  }
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
    } catch (e) {
      // Fallback to raw QR if composite fails
      finalBuffer = rawQr;
    }
  }

  fs.writeFileSync(destinationPath, finalBuffer);
}

async function main() {
  console.log('=== RNSMUN QR Code Batch Generator ===');
  console.log(`Mode: ${isForce ? 'Force overwrite (--force active)' : 'Preserve existing (pass --force to overwrite)'}`);

  // Prepare optional center badge
  const badgePath = path.resolve(process.cwd(), 'assets', 'Logos', 'qr_center_badge.png');
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
    } catch (e) {
      console.warn('Note: Center badge preparation failed, using standard QR output.');
    }
  }

  let stats = {
    individualsFound: 0,
    individualsGenerated: 0,
    individualsSkipped: 0,
    delegationMembersFound: 0,
    delegationMembersGenerated: 0,
    delegationMembersSkipped: 0,
    errors: 0
  };

  // 1. Process Individual Delegates
  console.log('\nFetching individual registrations...');
  const { data: individuals, error: indError } = await supabase
    .from('registrations')
    .select('id, name, email, phone, status, committee1, portfolio1_1');

  if (indError) {
    console.error('Error fetching individual registrations:', indError.message);
  } else if (individuals) {
    const indDir = path.resolve(process.cwd(), 'public', 'qrs', 'individual_delegates');
    if (!fs.existsSync(indDir)) fs.mkdirSync(indDir, { recursive: true });

    stats.individualsFound = individuals.length;
    console.log(`Found ${individuals.length} individual registration records.`);

    for (const reg of individuals) {
      try {
        const token = getPublicToken('individual', reg.id);
        const hubUrl = `https://mun.rnsit.ac.in/hub?t=${token}`;
        const safeName = sanitizeFilename(reg.name || 'Delegate');
        const filename = `IND-${reg.id}_${safeName}.png`;
        const filePath = path.join(indDir, filename);

        if (fs.existsSync(filePath) && !isForce) {
          stats.individualsSkipped++;
          continue;
        }

        await renderQrCode(hubUrl, filePath, badgeBuffer, whiteCircleSvg);
        stats.individualsGenerated++;
        process.stdout.write(`\rGenerated individual QRs: ${stats.individualsGenerated}`);
      } catch (err) {
        stats.errors++;
        console.error(`\nFailed for individual ID ${reg.id}:`, err.message);
      }
    }
    console.log(`\nCompleted individuals: ${stats.individualsGenerated} generated, ${stats.individualsSkipped} existing skipped.`);
  }

  // 2. Process Delegations
  console.log('\nFetching delegations...');
  const { data: delegations, error: delError } = await supabase
    .from('delegations')
    .select('*');

  if (delError) {
    console.error('Error fetching delegations:', delError.message);
  } else if (delegations) {
    console.log(`Found ${delegations.length} delegation records.`);

    for (const del of delegations) {
      const delName = del.delegation_name || del.institution_name || `Delegation_${del.id}`;
      const safeDelDirName = sanitizeFilename(delName);
      const delDir = path.resolve(process.cwd(), 'public', 'qrs', safeDelDirName);
      if (!fs.existsSync(delDir)) fs.mkdirSync(delDir, { recursive: true });

      const token = getPublicToken('delegation', del.id);

      // Members can be in del.members array or parsed json
      let members = [];
      if (Array.isArray(del.members)) {
        members = del.members;
      } else if (typeof del.members === 'string') {
        try {
          members = JSON.parse(del.members);
        } catch (e) {}
      }

      // If no members array exists, at least create the delegation pass for the head/primary
      if (!members || members.length === 0) {
        members = [{
          name: del.head_name || del.contact_name || delName,
          isHead: true
        }];
      }

      for (let mIdx = 0; mIdx < members.length; mIdx++) {
        stats.delegationMembersFound++;
        const member = members[mIdx];
        const memberName = sanitizeFilename(member.name || `Member_${mIdx + 1}`);
        const codeNum = String(mIdx + 1).padStart(2, '0');
        const filename = `DEL-${del.id}-${codeNum}_${memberName}.png`;
        const filePath = path.join(delDir, filename);

        if (fs.existsSync(filePath) && !isForce) {
          stats.delegationMembersSkipped++;
          continue;
        }

        const hubUrl = mIdx === 0
          ? `https://mun.rnsit.ac.in/hub?t=${token}`
          : `https://mun.rnsit.ac.in/hub?t=${token}&m=${mIdx}`;

        try {
          await renderQrCode(hubUrl, filePath, badgeBuffer, whiteCircleSvg);
          stats.delegationMembersGenerated++;
          process.stdout.write(`\rGenerated delegation QRs: ${stats.delegationMembersGenerated}`);
        } catch (err) {
          stats.errors++;
          console.error(`\nFailed for delegation ID ${del.id} member ${mIdx}:`, err.message);
        }
      }
    }
    console.log(`\nCompleted delegations: ${stats.delegationMembersGenerated} generated, ${stats.delegationMembersSkipped} existing skipped.`);
  }

  console.log('\n=== Summary ===');
  console.log(`Individuals: ${stats.individualsGenerated} generated, ${stats.individualsSkipped} skipped, ${stats.individualsFound} total.`);
  console.log(`Delegations: ${stats.delegationMembersGenerated} generated, ${stats.delegationMembersSkipped} skipped, ${stats.delegationMembersFound} total.`);
  if (stats.errors > 0) {
    console.log(`Encountered ${stats.errors} error(s).`);
  } else {
    console.log('All processed cleanly with zero errors.');
  }
}

main().catch(err => {
  console.error('Fatal error in QR generator:', err);
  process.exit(1);
});
