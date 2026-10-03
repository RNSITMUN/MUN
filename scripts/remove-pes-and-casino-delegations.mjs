import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('=== Removing DEL-92 (PES University) and DEL-96 (EC casino royale) ===\n');

  // 1. Update Supabase delegations status to 'Rejected'
  const { data: updatedDels, error: delErr } = await supabase
    .from('delegations')
    .update({ status: 'Rejected' })
    .in('id', [92, 96])
    .select('id, delegation_name, status');

  if (delErr) {
    console.error('Error updating delegations status in Supabase:', delErr.message);
  } else {
    console.log('✓ Marked delegations 92 and 96 as Rejected in Supabase:', updatedDels);
  }

  // 2. Delete checkpoints from Supabase delegate_checkpoints
  const { data: deletedCps, error: cpErr } = await supabase
    .from('delegate_checkpoints')
    .delete()
    .eq('record_type', 'delegation')
    .in('record_id', ['92', '96'])
    .select('id, record_id, member_index');

  if (cpErr) {
    console.error('Error deleting checkpoints from Supabase:', cpErr.message);
  } else {
    console.log(`✓ Deleted ${deletedCps?.length || 0} checkpoints from Supabase for delegations 92 & 96.`);
  }

  // 3. Update .data/checkpoints.json
  const cpLocalPath = path.resolve('.data/checkpoints.json');
  if (fs.existsSync(cpLocalPath)) {
    try {
      const cpLocal = JSON.parse(fs.readFileSync(cpLocalPath, 'utf8'));
      delete cpLocal['delegation_92'];
      delete cpLocal['delegation_96'];
      fs.writeFileSync(cpLocalPath, JSON.stringify(cpLocal, null, 2) + '\n', 'utf8');
      console.log('✓ Removed delegation_92 and delegation_96 from .data/checkpoints.json.');
    } catch (e) {
      console.error('Error updating .data/checkpoints.json:', e.message);
    }
  }

  // 4. Update data/allocations.json & public/allocations.json
  ['data/allocations.json', 'public/allocations.json'].forEach(f => {
    const p = path.resolve(f);
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    const beforeCount = arr.length;
    const filtered = arr.filter(a => !a.allocation_id.startsWith('DEL-92-') && !a.allocation_id.startsWith('DEL-96-'));
    fs.writeFileSync(p, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
    console.log(`✓ [${f}] Filtered: ${beforeCount} -> ${filtered.length} records.`);
  });

  // 5. Update data/allocations.csv & public/allocations.csv
  ['data/allocations.csv', 'public/allocations.csv'].forEach(f => {
    const p = path.resolve(f);
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
    const beforeCount = lines.length;
    const filtered = lines.filter(l => !l.startsWith('"DEL-92-') && !l.startsWith('"DEL-96-'));
    fs.writeFileSync(p, filtered.join('\n') + '\n', 'utf8');
    console.log(`✓ [${f}] Filtered: ${beforeCount} -> ${filtered.length} lines.`);
  });

  // 6. Update public/qrs/hub-links.csv
  const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
  const hubLines = fs.readFileSync(hubCsvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const hubHeader = hubLines[0];
  const hubRows = hubLines.slice(1);
  const beforeHubCount = hubRows.length;

  const filteredHubRows = hubRows.filter(l => !l.includes('"DEL-92-') && !l.includes('"DEL-96-'));

  // Re-number sequentially from 1 to N
  const finalHubCsvLines = [hubHeader];
  filteredHubRows.forEach((row, i) => {
    finalHubCsvLines.push(row.replace(/^\d+,/, `${i + 1},`));
  });

  fs.writeFileSync(hubCsvPath, finalHubCsvLines.join('\n') + '\n', 'utf8');
  console.log(`✓ [hub-links.csv] Filtered: ${beforeHubCount} -> ${filteredHubRows.length} delegates.`);

  // 7. Delete QR badge directories
  const pesDir = path.resolve('public/qrs/PES_University');
  if (fs.existsSync(pesDir)) {
    fs.rmSync(pesDir, { recursive: true, force: true });
    console.log('✓ Removed folder public/qrs/PES_University');
  }

  const casinoDir = path.resolve('public/qrs/EC_casino_royale');
  if (fs.existsSync(casinoDir)) {
    fs.rmSync(casinoDir, { recursive: true, force: true });
    console.log('✓ Removed folder public/qrs/EC_casino_royale');
  }

  console.log('\n=== Removal script completed. Now sync hub-links.html & hub-links.json ===\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
