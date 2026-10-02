/**
 * Idempotent Allocation Importer Script
 * RNS MUN 2026
 *
 * Reads canonical data/allocations.csv and upserts allocation checkpoints
 * into Supabase delegate_checkpoints table.
 *
 * Usage:
 *   node scripts/import-allocations.mjs --dry-run   (Preview changes without writing)
 *   node scripts/import-allocations.mjs --apply     (Commit changes to database)
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeCommitteeName, getCommitteeConfig } from '../lib/committees.js';

// ── Load Environment Variables ──────────────────────────────────────
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
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
  }
  return process.env[key] || '';
}

const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

console.log('=== RNS MUN 2026 Allocation Importer ===');
console.log(`Execution Mode: ${isDryRun ? 'DRY RUN (Previewing changes only)' : 'LIVE APPLY (Writing to Supabase)'}\n`);

// ── Parse CSV ───────────────────────────────────────────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  if (cur || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

const csvPath = path.resolve(process.cwd(), 'data', 'allocations.csv');
if (!fs.existsSync(csvPath)) {
  console.error(`Error: CSV not found at ${csvPath}`);
  process.exit(1);
}

const parsed = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const headers = parsed[0].map(h => h.trim().toLowerCase());
const rows = parsed.slice(1);

// Locate column indices
const col = {
  allocId: headers.findIndex(h => h.includes('allocation id')),
  regType: headers.findIndex(h => h.includes('registration type')),
  recordId: headers.findIndex(h => h.includes('record id')),
  memberIndex: headers.findIndex(h => h.includes('member index')),
  name: headers.findIndex(h => h.includes('delegate name')),
  email: headers.findIndex(h => h.includes('email')),
  phone: headers.findIndex(h => h.includes('phone')),
  institution: headers.findIndex(h => h.includes('institution') || h.includes('college')),
  delegationName: headers.findIndex(h => h.includes('delegation name')),
  comm: headers.findIndex(h => h.includes('allocated committee')),
  port: headers.findIndex(h => h.includes('allocated portfolio')),
  status: headers.findIndex(h => h.includes('allocation status'))
};

console.log(`Loaded ${rows.length} rows from data/allocations.csv.`);

// ── Connect to Supabase ─────────────────────────────────────────────
const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase credentials not found in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  // Fetch existing checkpoints for allocation
  console.log('Fetching existing allocation checkpoints from Supabase...');
  const { data: existingCp, error: fetchErr } = await supabase
    .from('delegate_checkpoints')
    .select('record_type, record_id, member_index, allocated_committee, allocated_portfolio, notes')
    .eq('checkpoint_key', 'allocation');

  if (fetchErr) {
    console.error('Failed to query delegate_checkpoints:', fetchErr.message);
    process.exit(1);
  }

  const cpMap = new Map();
  (existingCp || []).forEach(cp => {
    const key = `${cp.record_type}_${cp.record_id}_${cp.member_index}`;
    cpMap.set(key, cp);
  });

  console.log(`Found ${cpMap.size} existing allocation records in database.\n`);

  let toInsert = [];
  let toUpdate = [];
  let unchanged = 0;
  let skipped = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const allocId = r[col.allocId] || `ROW-${idx + 1}`;
    const rawType = (r[col.regType] || '').trim();
    const recordType = rawType.toLowerCase().includes('delegation') ? 'delegation' : 'individual';
    const recordId = String(r[col.recordId] || '').trim();
    const memberIndex = parseInt(r[col.memberIndex] || '0', 10);
    const delegateName = (r[col.name] || '').trim();
    const rawEmail = (r[col.email] || '').trim();
    const rawComm = (r[col.comm] || '').trim();
    const rawPort = (r[col.port] || '').trim();

    if (!recordId) {
      skipped.push({ allocId, delegateName, reason: 'Missing record_id' });
      continue;
    }

    const normComm = normalizeCommitteeName(rawComm) || rawComm;
    const key = `${recordType}_${recordId}_${memberIndex}`;
    const existing = cpMap.get(key);

    const payload = {
      record_type: recordType,
      record_id: recordId,
      member_index: memberIndex,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Allocation Importer',
      allocated_committee: normComm,
      allocated_portfolio: rawPort,
      notes: `Imported: ${delegateName} (${allocId})`
    };

    if (!existing) {
      toInsert.push({ allocId, delegateName, payload });
    } else {
      const commDiff = (existing.allocated_committee || '').trim().toLowerCase() !== normComm.trim().toLowerCase();
      const portDiff = (existing.allocated_portfolio || '').trim().toLowerCase() !== rawPort.trim().toLowerCase();
      if (commDiff || portDiff) {
        toUpdate.push({
          allocId,
          delegateName,
          oldComm: existing.allocated_committee,
          newComm: normComm,
          oldPort: existing.allocated_portfolio,
          newPort: rawPort,
          payload
        });
      } else {
        unchanged++;
      }
    }
  }

  console.log('--- Reconciliation Summary ---');
  console.log(`Unchanged (already in sync): ${unchanged}`);
  console.log(`To Insert (new allocation):  ${toInsert.length}`);
  console.log(`To Update (modified data):   ${toUpdate.length}`);
  console.log(`Skipped (missing ID):        ${skipped.length}\n`);

  if (toInsert.length > 0) {
    console.log(`First 5 new allocations to insert:`);
    toInsert.slice(0, 5).forEach(item => {
      console.log(`  + [${item.allocId}] ${item.delegateName}: ${item.payload.allocated_committee} - ${item.payload.allocated_portfolio}`);
    });
  }

  if (toUpdate.length > 0) {
    console.log(`\nAllocations with changes to update:`);
    toUpdate.slice(0, 5).forEach(item => {
      console.log(`  ~ [${item.allocId}] ${item.delegateName}:`);
      console.log(`      Comm: "${item.oldComm}" -> "${item.newComm}"`);
      console.log(`      Port: "${item.oldPort}" -> "${item.newPort}"`);
    });
  }

  if (isDryRun) {
    console.log('\n[DRY RUN COMPLETE] No records were modified in Supabase.');
    console.log('To apply changes to the live database, run with --apply.');
    return;
  }

  // Live Apply
  const allUpserts = [...toInsert.map(i => i.payload), ...toUpdate.map(u => u.payload)];
  if (allUpserts.length === 0) {
    console.log('\nDatabase is already completely in sync! Nothing to write.');
    return;
  }

  console.log(`\nUpserting ${allUpserts.length} records into delegate_checkpoints...`);
  const batchSize = 50;
  for (let i = 0; i < allUpserts.length; i += batchSize) {
    const chunk = allUpserts.slice(i, i + batchSize);
    const { error: upsertErr } = await supabase
      .from('delegate_checkpoints')
      .upsert(chunk, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (upsertErr) {
      console.error(`Batch upsert error at index ${i}:`, upsertErr.message);
    } else {
      console.log(`Upserted batch ${i + 1} - ${Math.min(i + batchSize, allUpserts.length)}`);
    }
  }

  console.log('\n[APPLY COMPLETE] Database allocations synchronized successfully.');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
