/**
 * migrate-add-qr-columns.mjs
 * 
 * 1. Adds qr_pass_url (TEXT) to registrations — individual delegate QR badge path
 * 2. Adds qr_pass_urls (JSONB array) to delegations — one QR path per roster member
 * 3. Backfills all existing records from the files already on disk
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getPublicToken } from '../lib/token.js';

// ── Load env ───────────────────────────────────────────────────────────────
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const k = trimmed.substring(0, eqIdx).trim();
  let v = trimmed.substring(eqIdx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[k] = v;
}

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ── Known QR file mappings ─────────────────────────────────────────────────
// Individual delegates: map Supabase registration ID → QR filename
// Built from the file names in public/qrs/individual_delegates/
const IND_DIR   = path.resolve(process.cwd(), 'public', 'qrs', 'individual_delegates');
const DEL_DIRS  = {
  67: path.resolve(process.cwd(), 'public', 'qrs', 'Alliance_delegation'),
  47: path.resolve(process.cwd(), 'public', 'qrs', 'CMS_delegation'),
};

// Individual QR files are named IND-{id}_{name}.png  →  extract numeric id from filename
function buildIndividualMap() {
  const map = {}; // id (number) → web path
  if (!fs.existsSync(IND_DIR)) return map;
  for (const f of fs.readdirSync(IND_DIR)) {
    if (!f.endsWith('.png')) continue;
    const m = f.match(/^IND-(\d+)_/);
    if (m) map[parseInt(m[1], 10)] = `/qrs/individual_delegates/${f}`;
  }
  return map;
}

// Delegation QR files are named DEL-{delId}-{seqNo}_{name}.png → seqNo is 1-based member index
function buildDelegationMap(delegationId, dir) {
  const map = {}; // member index (0-based) → web path
  if (!fs.existsSync(dir)) return map;
  const prefix = `DEL-${delegationId}-`;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.png') || !f.startsWith(prefix)) continue;
    const m = f.match(new RegExp(`^DEL-${delegationId}-(\\d+)_`));
    if (m) map[parseInt(m[1], 10) - 1] = `/qrs/${path.basename(dir)}/${f}`; // 0-based
  }
  return map;
}

// ── Step 1: Add columns via SQL (using Supabase's rpc or raw SQL) ──────────
// Supabase JS client doesn't expose raw DDL — we use the REST API approach:
// We'll just attempt updates and rely on the column existing already OR
// run the ALTER TABLE via the supabase management API.
// 
// Since we can't run DDL through supabase-js, print the SQL and do the backfill
// assuming the column exists (run SQL in Supabase dashboard first).

const ALTER_SQL = `
-- Run this in your Supabase SQL Editor:
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS qr_pass_url TEXT;
ALTER TABLE delegations   ADD COLUMN IF NOT EXISTS qr_pass_urls JSONB;
`;

console.log('='.repeat(60));
console.log('STEP 1 — Run this SQL in Supabase Dashboard → SQL Editor:');
console.log('='.repeat(60));
console.log(ALTER_SQL);
console.log('='.repeat(60));
console.log('After running the SQL above, press Enter to continue with backfill...');

// Wait for user confirmation
await new Promise(resolve => process.stdin.once('data', resolve));

// ── Step 2: Backfill individual delegates ──────────────────────────────────
console.log('\nBackfilling individual delegates...');
const indMap = buildIndividualMap();
console.log(`  Found ${Object.keys(indMap).length} QR files for individual delegates.`);

let indOk = 0, indSkip = 0;
for (const [id, qrPath] of Object.entries(indMap)) {
  const { error } = await sb.from('registrations')
    .update({ qr_pass_url: qrPath })
    .eq('id', id);
  if (error) {
    console.warn(`  ✗ ID ${id}: ${error.message}`);
    indSkip++;
  } else {
    process.stdout.write(`  ✓ registrations.id=${id} → ${qrPath}\n`);
    indOk++;
  }
}
console.log(`  Individual backfill: ${indOk} updated, ${indSkip} skipped/errored.`);

// ── Step 3: Backfill delegations ───────────────────────────────────────────
console.log('\nBackfilling delegations...');
for (const [delegationId, dir] of Object.entries(DEL_DIRS)) {
  const memberMap = buildDelegationMap(parseInt(delegationId), dir);
  const count = Object.keys(memberMap).length;
  console.log(`  Delegation ${delegationId}: Found ${count} QR files.`);
  
  // Build ordered array: index 0..N-1
  const maxIdx = Math.max(-1, ...Object.keys(memberMap).map(Number));
  const arr = [];
  for (let i = 0; i <= maxIdx; i++) {
    arr.push(memberMap[i] || null);
  }

  const { error } = await sb.from('delegations')
    .update({ qr_pass_urls: arr })
    .eq('id', delegationId);

  if (error) {
    console.warn(`  ✗ Delegation ${delegationId}: ${error.message}`);
  } else {
    console.log(`  ✓ delegations.id=${delegationId} → ${count} QR paths stored`);
  }
}

console.log('\n✅ Migration and backfill complete!');
console.log('   - registrations.qr_pass_url  → individual QR badge web path');
console.log('   - delegations.qr_pass_urls   → JSONB array of member QR paths');
process.exit(0);
