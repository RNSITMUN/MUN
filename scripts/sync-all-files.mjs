import fs from 'fs';
import path from 'path';

// ─── 1. Update public/allocations.csv and data/allocations.csv ─────────────────
const newCsvRow = `"DEL-95-16","Delegation Member","95","15","Aathif Hussain","aaxxfhussn112@gmail.com","7899980007","MCU MUN Society","MCU MUN Society","External","MCU MUN Society","Lok Sabha","Priyanka Gandhi Vadra (INC)","Central Plenary Hall • Chanakya Block","https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5","https://mun.rnsit.ac.in/hub?t=02vV7Bf7hE7bPu&m=15","/qrs/MCU_MUN_Society/DEL-95-16_Aathif_Hussain.png","Confirmed","Confirmed"`;

['public/allocations.csv', 'data/allocations.csv'].forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('"DEL-95-16"')) {
    console.log(`DEL-95-16 already in ${filePath}`);
    return;
  }
  const lines = content.split(/\r?\n/);
  const insertIdx = lines.findIndex(l => l.startsWith('"DEL-95-15"'));
  if (insertIdx !== -1) {
    lines.splice(insertIdx + 1, 0, newCsvRow);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✓ Inserted DEL-95-16 into ${filePath} (Total rows: ${lines.length})`);
  } else {
    console.error(`Could not find DEL-95-15 in ${filePath}`);
  }
});

// ─── 2. Update public/allocations.json and data/allocations.json ───────────────
const newJsonObj = {
  allocation_id: 'DEL-95-16',
  registration_type: 'Delegation Member',
  record_id: 95,
  member_index: 15,
  delegate_name: 'Aathif Hussain',
  email: 'aaxxfhussn112@gmail.com',
  phone: '7899980007',
  institution: 'MCU MUN Society',
  college_name: 'MCU MUN Society',
  delegate_category: 'External',
  delegation_name: 'MCU MUN Society',
  allocated_committee: 'Lok Sabha',
  allocated_portfolio: 'Priyanka Gandhi Vadra (INC)',
  session_chamber: 'Central Plenary Hall • Chanakya Block',
  whatsapp_community_url: 'https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5',
  hub_pass_url: 'https://mun.rnsit.ac.in/hub?t=02vV7Bf7hE7bPu&m=15',
  qr_badge_path: '/qrs/MCU_MUN_Society/DEL-95-16_Aathif_Hussain.png',
  allocation_status: 'Confirmed',
  payment_status: 'Confirmed'
};

['public/allocations.json', 'data/allocations.json'].forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const existingIdx = arr.findIndex(item => item.allocation_id === 'DEL-95-16');
  if (existingIdx !== -1) {
    arr[existingIdx] = newJsonObj;
    console.log(`Updated DEL-95-16 in ${filePath}`);
  } else {
    const insertIdx = arr.findIndex(item => item.allocation_id === 'DEL-95-15');
    if (insertIdx !== -1) {
      arr.splice(insertIdx + 1, 0, newJsonObj);
      console.log(`✓ Inserted DEL-95-16 into ${filePath} (Total items: ${arr.length})`);
    } else {
      arr.push(newJsonObj);
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
});

// ─── 3. Update public/qrs/hub-links.csv ─────────────────────────────────────────
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

const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
const rawHub = fs.readFileSync(hubCsvPath, 'utf8').trim().split(/\r?\n/);
const header = rawHub[0];
const hubRows = rawHub.slice(1);

const parsedDelegates = hubRows.map(line => {
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

const existingHubIdx = parsedDelegates.findIndex(d => d.code === 'DEL-95-16');
const aathifHub = {
  code: 'DEL-95-16',
  name: 'Aathif Hussain',
  email: 'aaxxfhussn112@gmail.com • 7899980007',
  delegation: 'Delegation Member (MCU MUN Society)',
  committee: 'Lok Sabha',
  portfolio: 'Priyanka Gandhi Vadra (INC)',
  hubUrl: 'https://mun.rnsit.ac.in/hub?t=02vV7Bf7hE7bPu&m=15'
};

if (existingHubIdx === -1) {
  const insertIdx = parsedDelegates.findIndex(d => d.code === 'DEL-95-15');
  if (insertIdx !== -1) {
    parsedDelegates.splice(insertIdx + 1, 0, aathifHub);
  } else {
    parsedDelegates.push(aathifHub);
  }
} else {
  parsedDelegates[existingHubIdx] = aathifHub;
}

// Re-index slNo
parsedDelegates.forEach((d, idx) => {
  d.slNo = idx + 1;
});

const newHubCsv = [header, ...parsedDelegates.map(d => {
  const clean = str => `"${String(str || '').replace(/"/g, '""')}"`;
  return `${d.slNo},${clean(d.code)},${clean(d.name)},${clean(d.email)},${clean(d.delegation)},${clean(d.committee)},${clean(d.portfolio)},${clean(d.hubUrl)}`;
})].join('\n');

fs.writeFileSync(hubCsvPath, newHubCsv + '\n', 'utf8');
console.log(`✓ Updated public/qrs/hub-links.csv (Total delegates: ${parsedDelegates.length})`);

// ─── 4. Update public/qrs/hub-links.json ───────────────────────────────────────
const hubJsonPath = path.resolve('public/qrs/hub-links.json');
const jsonExport = parsedDelegates.map(d => ({
  code: d.code,
  name: d.name,
  email: d.email,
  delegation: d.delegation,
  committee: d.committee,
  portfolio: d.portfolio,
  hubUrl: d.hubUrl
}));
fs.writeFileSync(hubJsonPath, JSON.stringify(jsonExport, null, 2) + '\n', 'utf8');
console.log(`✓ Updated public/qrs/hub-links.json (${jsonExport.length} delegates)`);

// ─── 5. Update public/qrs/hub-links.html ───────────────────────────────────────
const hubHtmlPath = path.resolve('public/qrs/hub-links.html');
let hubHtml = fs.readFileSync(hubHtmlPath, 'utf8');

hubHtml = hubHtml.replace(/all \d+ accredited delegates/g, `all ${parsedDelegates.length} accredited delegates`);

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const htmlRows = parsedDelegates.map(d => {
  return `            <tr>
              <td style="color:#6B7280; font-weight:600;">${d.slNo}</td>
              <td><span class="code-tag">${escapeHtml(d.code)}</span></td>
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

const tbodyStartMatch = hubHtml.match(/<tbody\b[^>]*>/i);
const tbodyEndIdx = hubHtml.indexOf('</tbody>');
if (tbodyStartMatch && tbodyEndIdx !== -1) {
  const tbodyStartIdx = tbodyStartMatch.index;
  const tbodyTag = tbodyStartMatch[0];
  const beforeTbody = hubHtml.substring(0, tbodyStartIdx + tbodyTag.length);
  const afterTbody = hubHtml.substring(tbodyEndIdx);

  hubHtml = beforeTbody + '\n' + htmlRows + '\n        ' + afterTbody;
  fs.writeFileSync(hubHtmlPath, hubHtml, 'utf8');
  console.log(`✓ Updated public/qrs/hub-links.html with exactly ${parsedDelegates.length} table rows.`);
}
