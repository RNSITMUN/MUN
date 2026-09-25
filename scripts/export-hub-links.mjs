import fs from 'fs';
import path from 'path';

const indHtml = fs.readFileSync('public/qrs/individual_delegates/index.html', 'utf8');
const allHtml = fs.readFileSync('public/qrs/Alliance_delegation/index.html', 'utf8');
const cmsHtml = fs.readFileSync('public/qrs/CMS_delegation/index.html', 'utf8');

function extractCards(html, delegationName) {
  const parts = html.split('<div class="card">').slice(1);
  return parts.map(part => {
    const codeMatch = part.match(/<span class="tag">([^<]+)<\/span>/);
    const nameMatch = part.match(/<h2 class="name">([^<]+)<\/h2>/);
    const commMatch = part.match(/<strong>Committee:<\/strong>\s*([^<]+)<\/div>/);
    const portMatch = part.match(/<strong>Portfolio:<\/strong>\s*([^<]+)<\/div>/);
    const linkMatch = part.match(/href="(https:\/\/mun\.rnsit\.ac\.in\/hub\?[^"]+)"/);
    const emailMatch = part.match(/style="font-size: 0\.78rem; opacity: 0\.8; margin-top: 4px;">([^<]+)<\/div>/);

    return {
      code: codeMatch ? codeMatch[1].trim() : '',
      name: nameMatch ? nameMatch[1].trim() : '',
      email: emailMatch ? emailMatch[1].trim() : '',
      delegation: delegationName,
      committee: commMatch ? commMatch[1].trim() : '',
      portfolio: portMatch ? portMatch[1].trim() : '',
      hubUrl: linkMatch ? linkMatch[1].trim() : ''
    };
  });
}

const allDelegates = [
  ...extractCards(indHtml, 'Individual Delegate'),
  ...extractCards(allHtml, 'Alliance University Delegation'),
  ...extractCards(cmsHtml, 'CMS Business School Delegation')
];

console.log(`Extracted ${allDelegates.length} delegates.`);

// 1. Export CSV
const csvHeader = 'Sl No,Delegation Code,Delegate Name,Email,Delegation Type,Allocated Committee,Allocated Portfolio,Hub Pass URL\n';
const csvRows = allDelegates.map((d, i) => {
  const clean = str => `"${String(str || '').replace(/"/g, '""')}"`;
  return [
    i + 1,
    clean(d.code),
    clean(d.name),
    clean(d.email),
    clean(d.delegation),
    clean(d.committee),
    clean(d.portfolio),
    clean(d.hubUrl)
  ].join(',');
}).join('\n');

fs.writeFileSync('public/qrs/hub-links.csv', csvHeader + csvRows, 'utf8');
console.log('Saved CSV to public/qrs/hub-links.csv');

// 2. Export JSON
fs.writeFileSync('public/qrs/hub-links.json', JSON.stringify(allDelegates, null, 2), 'utf8');
console.log('Saved JSON to public/qrs/hub-links.json');

// 3. Export Searchable HTML Table Directory
const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Master Hub Links Directory — RNSMUN 2026</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0A0D14; color: #F3F4F6; min-height: 100vh; padding: 2rem 1.5rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { margin-bottom: 2rem; }
    .badge { display: inline-block; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; background: rgba(212, 175, 55, 0.15); color: #F3C969; padding: 5px 12px; border-radius: 999px; margin-bottom: 0.75rem; border: 1px solid rgba(212, 175, 55, 0.3); }
    h1 { font-size: 2.2rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin-bottom: 0.4rem; }
    p { color: #9CA3AF; font-size: 0.95rem; margin-bottom: 1.5rem; }
    .toolbar { display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1.5rem; }
    .search-input { flex: 1; min-width: 280px; max-width: 480px; background: #131826; border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.95rem; }
    .search-input:focus { outline: none; border-color: #D4AF37; }
    .actions-bar { display: flex; gap: 0.75rem; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.65rem 1.1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-decoration: none; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-gold { background: #D4AF37; color: #000; }
    .btn-gold:hover { background: #e5be4c; }
    .btn-outline { background: transparent; color: #D4AF37; border: 1px solid #D4AF37; }
    .btn-outline:hover { background: rgba(212, 175, 55, 0.1); }
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.78rem; border-radius: 6px; }
    .btn-copy { background: #1E293B; color: #93C5FD; border: 1px solid #334155; }
    .btn-copy:hover { background: #334155; color: #fff; }
    .btn-pass { background: #2563EB; color: #fff; }
    .btn-pass:hover { background: #1D4ED8; }
    .table-card { background: #131826; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem; }
    thead { background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    th { padding: 0.9rem 1rem; color: #9CA3AF; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #E5E7EB; vertical-align: middle; }
    tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
    .code-tag { font-family: monospace; font-size: 0.75rem; background: rgba(212, 175, 55, 0.15); color: #F3C969; padding: 3px 6px; border-radius: 4px; font-weight: 700; }
    .delegation-tag { font-size: 0.75rem; color: #94A3B8; }
    .hub-link-text { font-family: monospace; font-size: 0.75rem; color: #60A5FA; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; }
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #059669; color: #fff; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.88rem; font-weight: 600; display: none; z-index: 999; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge">DELEGATE RELATIONS & SECRETARIAT</span>
      <h1>Master Delegate Hub Links</h1>
      <p>Instant directory of all 88 accredited delegates with direct pass links, portfolios, and one-click copy.</p>
      <div class="toolbar">
        <input type="text" id="searchInput" class="search-input" placeholder="Search by name, committee, portfolio, code, or email..." oninput="filterTable()" />
        <div class="actions-bar">
          <a href="./hub-links.csv" download="RNSMUN_2026_Hub_Pass_Links.csv" class="btn btn-gold">📥 Download CSV</a>
          <a href="./index.html" class="btn btn-outline">🪪 QR Badges View</a>
        </div>
      </div>
    </header>

    <div class="table-card">
      <table id="linksTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Code</th>
            <th>Delegate Name</th>
            <th>Delegation</th>
            <th>Committee & Portfolio</th>
            <th>Direct Pass Actions</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          ${allDelegates.map((d, i) => `
            <tr>
              <td style="color:#6B7280; font-weight:600;">${i + 1}</td>
              <td><span class="code-tag">${d.code}</span></td>
              <td>
                <div style="font-weight:700; color:#FFFFFF;">${d.name}</div>
                ${d.email ? `<div style="font-size:0.75rem; color:#9CA3AF; margin-top:2px;">${d.email}</div>` : ''}
              </td>
              <td><span class="delegation-tag">${d.delegation}</span></td>
              <td>
                <div style="font-weight:600; color:#F3C969;">${d.committee || '—'}</div>
                <div style="font-size:0.8rem; color:#D1D5DB; margin-top:2px;">${d.portfolio || '—'}</div>
              </td>
              <td>
                <div style="display:flex; gap:6px; align-items:center;">
                  <a href="${d.hubUrl}" target="_blank" class="btn btn-pass btn-sm">🎫 Open Pass</a>
                  <button class="btn btn-copy btn-sm" onclick="copyUrl('${d.hubUrl}')">📋 Copy</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div id="toast" class="toast">Link copied to clipboard!</div>

  <script>
    function copyUrl(url) {
      navigator.clipboard.writeText(url).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
      });
    }

    function filterTable() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const rows = document.querySelectorAll('#tableBody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync('public/qrs/hub-links.html', htmlPage, 'utf8');
console.log('Saved searchable directory to public/qrs/hub-links.html');
