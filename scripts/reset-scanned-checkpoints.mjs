import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase.js';

const SCAN_KEYS = [
  'day1_entry',
  'day1_lunch',
  'day1_refreshment',
  'day2_entry',
  'day2_lunch',
  'day2_refreshment'
];

async function main() {
  if (!supabase) {
    console.error('❌ Supabase client not initialized.');
    process.exit(1);
  }

  console.log('🔄 Fetching current checkpoint records from Supabase...');
  const { data: allRows, error: fetchErr } = await supabase
    .from('delegate_checkpoints')
    .select('*');

  if (fetchErr) {
    console.error('❌ Error fetching delegate_checkpoints:', fetchErr);
    process.exit(1);
  }

  console.log(`📊 Total records in delegate_checkpoints: ${allRows.length}`);

  const allocationRows = allRows.filter(r => r.checkpoint_key === 'allocation');
  const scanRows = allRows.filter(r => SCAN_KEYS.includes(r.checkpoint_key));
  const otherRows = allRows.filter(r => r.checkpoint_key !== 'allocation' && !SCAN_KEYS.includes(r.checkpoint_key));

  console.log(`   - Official Allocations (to keep): ${allocationRows.length}`);
  console.log(`   - Scanned Check-in records (to reset): ${scanRows.length}`);
  if (otherRows.length > 0) {
    console.log(`   - Other non-allocation records: ${otherRows.length}`, otherRows);
  }

  // 1. Create timestamped backup of Supabase scanned checkpoints
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, `scanned_checkpoints_backup_${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(scanRows, null, 2), 'utf8');
  console.log(`💾 Scanned checkpoints backup saved to: ${backupPath}`);

  // 2. Backup and clean local store (.data/checkpoints.json)
  const localStorePath = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  if (fs.existsSync(localStorePath)) {
    const localBackupPath = path.join(backupDir, `local_checkpoints_backup_${timestamp}.json`);
    fs.copyFileSync(localStorePath, localBackupPath);
    console.log(`💾 Local store backup saved to: ${localBackupPath}`);

    try {
      const localStore = JSON.parse(fs.readFileSync(localStorePath, 'utf8')) || {};
      let localCleanedCount = 0;

      for (const [key, obj] of Object.entries(localStore)) {
        if (!obj || typeof obj !== 'object') continue;

        for (const sk of SCAN_KEYS) {
          if (obj[sk]) {
            delete obj[sk];
            localCleanedCount++;
          }
          if (obj.checkpoints && obj.checkpoints[sk]) {
            delete obj.checkpoints[sk];
            localCleanedCount++;
          }
        }

        if (obj.memberCheckpoints && typeof obj.memberCheckpoints === 'object') {
          for (const [mIdx, mObj] of Object.entries(obj.memberCheckpoints)) {
            if (!mObj || typeof mObj !== 'object') continue;
            for (const sk of SCAN_KEYS) {
              if (mObj[sk]) {
                delete mObj[sk];
                localCleanedCount++;
              }
            }
          }
        }
      }

      fs.writeFileSync(localStorePath, JSON.stringify(localStore, null, 2), 'utf8');
      console.log(`🧹 Cleaned ${localCleanedCount} scanned checkpoints from local cache.`);
    } catch (err) {
      console.warn('⚠️ Warning processing local store:', err.message);
    }
  }

  // 3. Delete the scanned checkpoints from Supabase using their specific primary key IDs
  if (scanRows.length > 0) {
    const idsToDelete = scanRows.map(r => r.id);
    console.log(`🗑️ Deleting ${idsToDelete.length} scanned check-in records from Supabase...`);

    const { error: delErr } = await supabase
      .from('delegate_checkpoints')
      .delete()
      .in('id', idsToDelete);

    if (delErr) {
      console.error('❌ Error deleting scanned records from Supabase:', delErr);
      process.exit(1);
    }
    console.log('✅ Successfully removed scanned check-in records from Supabase.');
  } else {
    console.log('ℹ️ No scanned check-in records found in Supabase to delete.');
  }

  // 4. Verification check
  console.log('\n🔍 Verifying current state in Supabase...');
  const { data: verifyRows, error: verifyErr } = await supabase
    .from('delegate_checkpoints')
    .select('checkpoint_key, redeemed');

  if (verifyErr) {
    console.error('❌ Verification query error:', verifyErr);
  } else {
    const remainingAllocations = verifyRows.filter(r => r.checkpoint_key === 'allocation');
    const remainingScans = verifyRows.filter(r => SCAN_KEYS.includes(r.checkpoint_key));

    console.log(`✅ Remaining allocations in database: ${remainingAllocations.length} (Expected: ${allocationRows.length})`);
    console.log(`✅ Remaining scanned checkpoints in database: ${remainingScans.length} (Expected: 0)`);

    if (remainingScans.length === 0 && remainingAllocations.length === allocationRows.length) {
      console.log('🎉 Reset complete! All delegates and delegations are fresh and ready to be scanned.');
    } else {
      console.warn('⚠️ Verification mismatch. Please inspect delegate_checkpoints.');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
