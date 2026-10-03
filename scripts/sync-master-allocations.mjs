import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('public/qrs/hub-links.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

const lookup = new Map();
lines.slice(1).forEach(l => {
  const row = parseCsvLine(l);
  lookup.set(row[1], { committee: row[5], portfolio: row[6] });
});

['data/allocations.json', 'public/allocations.json'].forEach(f => {
  const p = path.resolve(f);
  if (fs.existsSync(p)) {
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    let changed = 0;
    arr.forEach(item => {
      const match = lookup.get(item.allocation_id);
      if (match) {
        if (item.allocated_committee !== match.committee || item.allocated_portfolio !== match.portfolio) {
          item.allocated_committee = match.committee;
          item.allocated_portfolio = match.portfolio;
          changed++;
        }
      }
    });
    fs.writeFileSync(p, JSON.stringify(arr, null, 2), 'utf8');
    console.log(f, 'updated', changed, 'records');
  }
});

['data/allocations.csv', 'public/allocations.csv'].forEach(f => {
  const p = path.resolve(f);
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    let changed = 0;
    const newLines = raw.map(line => {
      if (!line.trim()) return line;
      const row = parseCsvLine(line);
      const code = row[0];
      const match = lookup.get(code);
      if (match) {
        if (row[11] !== match.committee || row[12] !== match.portfolio) {
          row[11] = match.committee;
          row[12] = match.portfolio;
          changed++;
          return row.map(v => `"${v}"`).join(',');
        }
      }
      return line;
    });
    fs.writeFileSync(p, newLines.join('\n'), 'utf8');
    console.log(f, 'updated', changed, 'records');
  }
});

console.log('Master allocations JSON and CSV sync complete.');
