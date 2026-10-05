import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function removeDrafts() {
  console.log('=== 1. Removing orphaned checkpoints in Supabase for delegation 97 & 99 ===');
  const { data: cps, error: cpErr } = await sb
    .from('delegate_checkpoints')
    .select('id, record_type, record_id, allocated_committee, allocated_portfolio')
    .eq('record_type', 'delegation')
    .in('record_id', ['97', '99']);

  if (cpErr) console.error('CP fetch error:', cpErr);
  else {
    console.log('Found delegation checkpoints to delete:', cps);
    if (cps && cps.length > 0) {
      const ids = cps.map(c => c.id);
      const { error: delErr } = await sb.from('delegate_checkpoints').delete().in('id', ids);
      if (delErr) console.error('Delete error:', delErr);
      else console.log(`✓ Deleted ${ids.length} checkpoints in Supabase.`);
    }
  }

  console.log('\n=== 2. Removing from public/allocations.csv & data/allocations.csv ===');
  ['public/allocations.csv', 'data/allocations.csv'].forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const filtered = lines.filter(line => {
      if (!line.trim()) return false;
      return !line.startsWith('"DEL-97-') && !line.startsWith('"DEL-99-');
    });
    fs.writeFileSync(filePath, filtered.join('\n') + '\n', 'utf8');
    console.log(`✓ ${filePath}: updated to ${filtered.length - 1} delegate rows.`);
  });

  console.log('\n=== 3. Removing from public/allocations.json & data/allocations.json ===');
  ['public/allocations.json', 'data/allocations.json'].forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const filtered = list.filter(item => {
      const id = String(item.allocation_id || '');
      return !id.startsWith('DEL-97-') && !id.startsWith('DEL-99-');
    });
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
    console.log(`✓ ${filePath}: updated to ${filtered.length} delegates.`);
  });

  console.log('\n=== 4. Removing from public/qrs/hub-links.csv, .json, .html ===');
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

  const delegates = hubRows
    .map(line => {
      const r = parseCsvLine(line);
      return {
        code: r[1],
        name: r[2],
        email: r[3],
        delegation: r[4],
        committee: r[5],
        portfolio: r[6],
        hubUrl: r[7]
      };
    })
    .filter(d => !d.code.startsWith('DEL-97-') && !d.code.startsWith('DEL-99-'));

  // Re-index
  delegates.forEach((d, idx) => {
    d.slNo = idx + 1;
  });

  const newCsv = [header, ...delegates.map(d => {
    const clean = str => `"${String(str || '').replace(/"/g, '""')}"`;
    return `${d.slNo},${clean(d.code)},${clean(d.name)},${clean(d.email)},${clean(d.delegation)},${clean(d.committee)},${clean(d.portfolio)},${clean(d.hubUrl)}`;
  })].join('\n') + '\n';

  fs.writeFileSync(hubCsvPath, newCsv, 'utf8');
  console.log(`✓ public/qrs/hub-links.csv updated with ${delegates.length} delegates.`);

  // Update JSON
  const jsonExport = delegates.map(d => ({
    code: d.code,
    name: d.name,
    email: d.email,
    delegation: d.delegation,
    committee: d.committee,
    portfolio: d.portfolio,
    hubUrl: d.hubUrl
  }));
  fs.writeFileSync('public/qrs/hub-links.json', JSON.stringify(jsonExport, null, 2) + '\n', 'utf8');
  console.log(`✓ public/qrs/hub-links.json updated with ${jsonExport.length} delegates.`);

  // Update HTML
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const hubHtmlPath = path.resolve('public/qrs/hub-links.html');
  let hubHtml = fs.readFileSync(hubHtmlPath, 'utf8');
  hubHtml = hubHtml.replace(/all \d+ accredited delegates/g, `all ${delegates.length} accredited delegates`);

  const htmlRows = delegates.map(d => {
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
    console.log(`✓ public/qrs/hub-links.html updated with ${delegates.length} rows.`);
  }

  console.log('\n=== 5. Cleaning .data/checkpoints.json ===');
  if (fs.existsSync('.data/checkpoints.json')) {
    const cpData = JSON.parse(fs.readFileSync('.data/checkpoints.json', 'utf8'));
    delete cpData['delegation_97'];
    delete cpData['delegation_97_0'];
    delete cpData['delegation_99'];
    delete cpData['delegation_99_0'];
    fs.writeFileSync('.data/checkpoints.json', JSON.stringify(cpData, null, 2), 'utf8');
    console.log('✓ .data/checkpoints.json cleaned.');
  }
}

removeDrafts().catch(console.error);
