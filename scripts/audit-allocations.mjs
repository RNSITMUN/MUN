import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('data', 'allocations.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

function parseCsv(text) {
  // Strip BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const rows = [];
  let row = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i+1] === '\n') i++;
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

const parsed = parseCsv(raw);
const header = parsed[0];
const dataRows = parsed.slice(1);

console.log('=== AUDIT OF data/allocations.csv ===');
console.log('Header Row:\n', header.join(' | '));
console.log('\nTotal Row Count (excluding header):', dataRows.length);

console.log('\n--- 5 Sample Rows ---');
dataRows.slice(0, 5).forEach((r, idx) => {
  console.log(`[Sample ${idx + 1}] ID: ${r[0]} | Type: ${r[1]} | Name: ${r[4]} | Email: ${r[5]} | Committee: ${r[11]} | Portfolio: ${r[12]} | WhatsApp: ${r[14]}`);
});

// Distinct committee names
const commMap = new Map();
const emailMap = new Map();
let missingEmail = [];
let missingComm = [];
let missingPort = [];

dataRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const allocId = r[0];
  const name = r[4];
  const email = (r[5] || '').trim();
  const comm = (r[11] || '').trim();
  const port = (r[12] || '').trim();

  // Committee tally
  if (!comm) {
    missingComm.push({ rowNum, allocId, name });
  } else {
    commMap.set(comm, (commMap.get(comm) || 0) + 1);
  }

  // Portfolio check
  if (!port) {
    missingPort.push({ rowNum, allocId, name });
  }

  // Email check
  if (!email) {
    missingEmail.push({ rowNum, allocId, name });
  } else {
    const normEmail = email.toLowerCase();
    if (!emailMap.has(normEmail)) emailMap.set(normEmail, []);
    emailMap.get(normEmail).push({ rowNum, allocId, name });
  }
});

console.log('\n--- Distinct Committee Names & Counts ---');
for (const [c, cnt] of commMap.entries()) {
  console.log(`- "${c}": ${cnt}`);
}

console.log('\n--- Missing Field Audit ---');
console.log(`Missing Email: ${missingEmail.length} rows`);
missingEmail.forEach(m => console.log(`  Row ${m.rowNum} (${m.allocId}, ${m.name})`));

console.log(`Missing Committee: ${missingComm.length} rows`);
missingComm.forEach(m => console.log(`  Row ${m.rowNum} (${m.allocId}, ${m.name})`));

console.log(`Missing Portfolio: ${missingPort.length} rows`);
missingPort.forEach(m => console.log(`  Row ${m.rowNum} (${m.allocId}, ${m.name})`));

console.log('\n--- Duplicate Emails ---');
let dups = 0;
for (const [em, list] of emailMap.entries()) {
  if (list.length > 1) {
    dups++;
    console.log(`- "${em}" (${list.length} occurrences):`);
    list.forEach(l => console.log(`    Row ${l.rowNum}: ${l.allocId} - ${l.name}`));
  }
}
if (dups === 0) console.log('None found.');
