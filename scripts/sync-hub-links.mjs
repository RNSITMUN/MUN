import fs from 'fs';
import path from 'path';

// 1. Read hub-links.csv
const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
const rawCsv = fs.readFileSync(hubCsvPath, 'utf8').trim().split(/\r?\n/);
const header = rawCsv[0];
const csvRows = rawCsv.slice(1);

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

const delegates = csvRows.map(line => {
  const r = parseCsvLine(line);
  return {
    slNo: parseInt(r[0], 10),
    code: r[1],
    name: r[2],
    email: r[3],
    delegation: r[4],
    committee: r[5],
    portfolio: r[6],
    hubUrl: r[7]
  };
});

console.log(`Parsed ${delegates.length} delegates from hub-links.csv.`);

// 2. Generate synced public/qrs/hub-links.json
const hubJsonPath = path.resolve('public/qrs/hub-links.json');
const jsonExport = delegates.map(d => ({
  code: d.code,
  name: d.name,
  email: d.email,
  delegation: d.delegation,
  committee: d.committee,
  portfolio: d.portfolio,
  hubUrl: d.hubUrl
}));

fs.writeFileSync(hubJsonPath, JSON.stringify(jsonExport, null, 2) + '\n', 'utf8');
console.log(`Updated public/qrs/hub-links.json with ${jsonExport.length} delegates.`);

// 3. Clean and synchronize public/qrs/hub-links.html
const hubHtmlPath = path.resolve('public/qrs/hub-links.html');
let hubHtml = fs.readFileSync(hubHtmlPath, 'utf8');

// Update header badge/subtitle
hubHtml = hubHtml.replace(/all \d+ accredited delegates/g, `all ${delegates.length} accredited delegates`);

// Generate table rows matching hub-links.csv order exactly
const htmlRows = delegates.map((d, idx) => {
  const rowNum = idx + 1;
  return `            <tr>
              <td style="color:#6B7280; font-weight:600;">${rowNum}</td>
              <td><span class="code-tag">${d.code}</span></td>
              <td>
                <div style="font-weight:700; color:#FFFFFF;">${escapeHtml(d.name)}</div>
                <div style="font-size:0.75rem; color:#9CA3AF; margin-top:2px;">${escapeHtml(d.email)}</div>
              </td>
              <td><span class="delegation-tag">${escapeHtml(d.delegation)}</span></td>
              <td>
                <div style="font-weight:600; color:#F3C969;">${escapeHtml(d.committee)}</div>
                <div style="font-size:0.8rem; color:#D1D5DB; margin-top:2px;">${escapeHtml(d.portfolio)}</div>
              </td>
              <td>
                <div style="display:flex; gap:6px; align-items:center;">
                  <a href="${d.hubUrl}" target="_blank" class="btn btn-pass btn-sm">🎫 Open Pass</a>
                  <button class="btn btn-copy btn-sm" onclick="copyUrl('${d.hubUrl}')">📋 Copy</button>
                </div>
              </td>
            </tr>`;
}).join('\n');

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const tbodyStartMatch = hubHtml.match(/<tbody\b[^>]*>/i);
const tbodyEndIdx = hubHtml.indexOf('</tbody>');
if (tbodyStartMatch && tbodyEndIdx !== -1) {
  const tbodyStartIdx = tbodyStartMatch.index;
  const tbodyTag = tbodyStartMatch[0];
  const beforeTbody = hubHtml.substring(0, tbodyStartIdx + tbodyTag.length);
  const afterTbody = hubHtml.substring(tbodyEndIdx);

  hubHtml = beforeTbody + '\n' + htmlRows + '\n        ' + afterTbody;
  fs.writeFileSync(hubHtmlPath, hubHtml, 'utf8');
  console.log(`Updated public/qrs/hub-links.html with exactly ${delegates.length} table rows.`);
}
