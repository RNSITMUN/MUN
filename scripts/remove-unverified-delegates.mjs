import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const idsToRemove = new Set(['IND-187', 'IND-188', 'IND-195']);
const recordIdsToRemove = ['187', '188', '195'];

// 1. Update public/qrs/hub-links.csv
const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
const hubLines = fs.readFileSync(hubCsvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
const header = hubLines[0];
let sl = 1;
const newHubRows = [header];

for (let i = 1; i < hubLines.length; i++) {
  const line = hubLines[i];
  let isTarget = false;
  for (const id of idsToRemove) {
    if (line.includes(`"${id}"`)) {
      isTarget = true;
      break;
    }
  }
  if (isTarget) {
    console.log(`[hub-links.csv] Removed: ${line.slice(0, 60)}...`);
    continue;
  }
  const updatedLine = line.replace(/^\d+,/, `${sl},`);
  newHubRows.push(updatedLine);
  sl++;
}
fs.writeFileSync(hubCsvPath, newHubRows.join('\n') + '\n', 'utf8');
console.log(`[hub-links.csv] Saved with ${sl - 1} delegates.`);

// 2. Update public/qrs/hub-links.html
const hubHtmlPath = path.resolve('public/qrs/hub-links.html');
let hubHtml = fs.readFileSync(hubHtmlPath, 'utf8');

// Update header counter: 172 -> 169
hubHtml = hubHtml.replace('all 172 accredited delegates', 'all 169 accredited delegates');

// Parse rows in <tbody>
const tbodyStartMatch = hubHtml.match(/<tbody\b[^>]*>/i);
const tbodyEndIdx = hubHtml.indexOf('</tbody>');
if (tbodyStartMatch && tbodyEndIdx !== -1) {
  const tbodyStartIdx = tbodyStartMatch.index;
  const tbodyTag = tbodyStartMatch[0];
  const beforeTbody = hubHtml.substring(0, tbodyStartIdx + tbodyTag.length);
  const tbodyContent = hubHtml.substring(tbodyStartIdx + tbodyTag.length, tbodyEndIdx);
  const afterTbody = hubHtml.substring(tbodyEndIdx);

  // Split by <tr>
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  const rows = [];
  while ((match = trRegex.exec(tbodyContent)) !== null) {
    rows.push(match[0]);
  }

  console.log(`[hub-links.html] Found ${rows.length} rows in <tbody>.`);
  const filteredRows = [];
  let rowIdx = 1;
  for (const row of rows) {
    let remove = false;
    for (const id of idsToRemove) {
      if (row.includes(`>${id}<`)) {
        remove = true;
        break;
      }
    }
    if (remove) {
      console.log(`[hub-links.html] Removed table row for ID.`);
      continue;
    }
    // Update the row index <td style="color:#6B7280; font-weight:600;">XX</td>
    const updatedRow = row.replace(/(<td style="color:#6B7280; font-weight:600;">)\d+(<\/td>)/, `$1${rowIdx}$2`);
    filteredRows.push(updatedRow);
    rowIdx++;
  }

  const newTbody = '\n' + filteredRows.join('\n') + '\n            ';
  hubHtml = beforeTbody + newTbody + afterTbody;
  fs.writeFileSync(hubHtmlPath, hubHtml, 'utf8');
  console.log(`[hub-links.html] Saved with ${rowIdx - 1} table rows.`);
}

// 3. Update data/allocations.json and public/allocations.json
['data/allocations.json', 'public/allocations.json'].forEach(f => {
  const p = path.resolve(f);
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
  const filtered = arr.filter(item => !idsToRemove.has(item.allocation_id));
  fs.writeFileSync(p, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
  console.log(`[${f}] Filtered: ${arr.length} -> ${filtered.length} records.`);
});

// 4. Update data/allocations.csv and public/allocations.csv
['data/allocations.csv', 'public/allocations.csv'].forEach(f => {
  const p = path.resolve(f);
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const filtered = lines.filter(l => {
    for (const id of idsToRemove) {
      if (l.startsWith(`"${id}"`)) return false;
    }
    return true;
  });
  fs.writeFileSync(p, filtered.join('\n') + '\n', 'utf8');
  console.log(`[${f}] Filtered: ${lines.length} -> ${filtered.length} lines.`);
});

// 5. Update .data/checkpoints.json
const cpPath = path.resolve('.data/checkpoints.json');
if (fs.existsSync(cpPath)) {
  const cp = JSON.parse(fs.readFileSync(cpPath, 'utf8'));
  delete cp['individual_187'];
  delete cp['individual_188'];
  delete cp['individual_195'];
  fs.writeFileSync(cpPath, JSON.stringify(cp, null, 2) + '\n', 'utf8');
  console.log('Removed keys from .data/checkpoints.json.');
}

// 6. Delete from Supabase delegate_checkpoints
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const { data: deleted, error } = await supabase
    .from('delegate_checkpoints')
    .delete()
    .eq('record_type', 'individual')
    .in('record_id', recordIdsToRemove)
    .select();

  if (error) {
    console.error('Error deleting checkpoints from Supabase:', error.message);
  } else {
    console.log(`Deleted ${deleted?.length || 0} checkpoints from Supabase.`);
  }
}

console.log('\nAll delegate removals and synchronization completed successfully!');
