import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getPublicToken } from '../lib/token.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('=== Adding / Updating Delegates in Supabase & Local Stores ===\n');

  // 1. Update Supabase registrations
  const updates = [
    { id: 197, committee1: 'UNHRC', portfolio1_1: 'Ecuador', status: 'Confirmed' },
    { id: 198, committee1: 'UNODC', portfolio1_1: 'France', status: 'Confirmed' },
    { id: 171, committee1: 'Lok Sabha', portfolio1_1: 'Kiren Rijiju', status: 'Confirmed' },
    { id: 163, committee1: 'Lok Sabha', portfolio1_1: 'Tejasvi Surya (BJP)', status: 'Confirmed' }
  ];

  for (const u of updates) {
    const { error: regErr } = await supabase
      .from('registrations')
      .update({
        committee1: u.committee1,
        portfolio1_1: u.portfolio1_1,
        status: u.status
      })
      .eq('id', u.id);

    if (regErr) {
      console.error(`Failed to update registration ${u.id}:`, regErr.message);
    } else {
      console.log(`Updated registration ${u.id} in Supabase: ${u.committee1} - ${u.portfolio1_1}`);
    }
  }

  // 2. Upsert delegate_checkpoints
  const cpRecords = [
    {
      record_type: 'individual',
      record_id: '197',
      member_index: 0,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat',
      allocated_committee: 'UNHRC',
      allocated_portfolio: 'Ecuador',
      notes: 'Allocated to UNHRC (Ecuador)'
    },
    {
      record_type: 'individual',
      record_id: '198',
      member_index: 0,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat',
      allocated_committee: 'UNODC',
      allocated_portfolio: 'France',
      notes: 'Allocated to UNODC (France)'
    },
    {
      record_type: 'individual',
      record_id: '171',
      member_index: 0,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat',
      allocated_committee: 'Lok Sabha',
      allocated_portfolio: 'Kiren Rijiju',
      notes: 'Updated portfolio to Kiren Rijiju'
    },
    {
      record_type: 'individual',
      record_id: '163',
      member_index: 0,
      checkpoint_key: 'allocation',
      redeemed: true,
      redeemed_at: new Date().toISOString(),
      redeemed_by: 'Secretariat',
      allocated_committee: 'Lok Sabha',
      allocated_portfolio: 'Tejasvi Surya (BJP)',
      notes: 'Allocated to Lok Sabha (Tejasvi Surya (BJP))'
    }
  ];

  for (const cp of cpRecords) {
    const { error: cpErr } = await supabase
      .from('delegate_checkpoints')
      .upsert(cp, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });

    if (cpErr) {
      console.error(`Failed checkpoint upsert for ${cp.record_id}:`, cpErr.message);
    } else {
      console.log(`Upserted checkpoint for ${cp.record_id}: ${cp.allocated_committee} - ${cp.allocated_portfolio}`);
    }
  }

  // 3. Update .data/checkpoints.json
  const cpLocalPath = path.resolve('.data/checkpoints.json');
  let cpLocal = {};
  if (fs.existsSync(cpLocalPath)) {
    try {
      cpLocal = JSON.parse(fs.readFileSync(cpLocalPath, 'utf8'));
    } catch (_) {}
  }
  cpRecords.forEach(c => {
    const k = `individual_${c.record_id}`;
    cpLocal[k] = {
      allocatedCommittee: c.allocated_committee,
      allocatedPortfolio: c.allocated_portfolio,
      allocation: {
        redeemed: true,
        allocated_committee: c.allocated_committee,
        allocated_portfolio: c.allocated_portfolio
      }
    };
  });
  fs.writeFileSync(cpLocalPath, JSON.stringify(cpLocal, null, 2) + '\n', 'utf8');
  console.log('Updated .data/checkpoints.json.');

  // 4. Ensure QR badge copies exist
  const indDir = path.resolve('public/qrs/individual_delegates');
  const melvin1 = path.join(indDir, 'IND-198_Melvin_Josh_m.png');
  const melvin2 = path.join(indDir, 'IND-198_Melvin_Josh_M.png');
  if (fs.existsSync(melvin1) && !fs.existsSync(melvin2)) {
    fs.copyFileSync(melvin1, melvin2);
    console.log('Created copy: IND-198_Melvin_Josh_M.png');
  }

  // Token lookups
  const token197 = getPublicToken('individual', 197);
  const token198 = getPublicToken('individual', 198);

  const newRecords = [
    {
      allocation_id: 'IND-197',
      registration_type: 'Individual',
      record_id: 197,
      member_index: 0,
      delegate_name: 'Maithreyi R',
      email: 'maithreyivasishtar19@gmail.com',
      phone: '9591887583',
      institution: 'Dayanand Sagar Business Academy',
      college_name: 'Dayanand Sagar Business Academy',
      delegate_category: 'External',
      delegation_name: 'Individual',
      allocated_committee: 'UNHRC',
      allocated_portfolio: 'Ecuador',
      session_chamber: 'Committee Room 102 • Mech Seminar Hall',
      whatsapp_community_url: 'https://chat.whatsapp.com/Kqgvxt2yVwsGGDcWAaC1sC',
      hub_pass_url: `https://mun.rnsit.ac.in/hub?t=${token197}`,
      qr_badge_path: '/qrs/individual_delegates/IND-197_Maithreyi_R.png',
      allocation_status: 'Confirmed',
      payment_status: 'Confirmed'
    },
    {
      allocation_id: 'IND-198',
      registration_type: 'Individual',
      record_id: 198,
      member_index: 0,
      delegate_name: 'Melvin Josh M',
      email: 'melvinofficial90@gmail.com',
      phone: '9944154691',
      institution: "St Joseph's university",
      college_name: "St Joseph's university",
      delegate_category: 'External',
      delegation_name: 'Individual',
      allocated_committee: 'UNODC',
      allocated_portfolio: 'France',
      session_chamber: 'Committee Room 301 • ECE Seminar Hall',
      whatsapp_community_url: 'https://chat.whatsapp.com/IcgBAXEcbO8F9UCf0DiFJm',
      hub_pass_url: `https://mun.rnsit.ac.in/hub?t=${token198}`,
      qr_badge_path: '/qrs/individual_delegates/IND-198_Melvin_Josh_m.png',
      allocation_status: 'Confirmed',
      payment_status: 'Confirmed'
    }
  ];

  // 5. Update data/allocations.json and public/allocations.json
  ['data/allocations.json', 'public/allocations.json'].forEach(f => {
    const p = path.resolve(f);
    let arr = JSON.parse(fs.readFileSync(p, 'utf8'));

    // Update Divyansh (IND-171)
    const dItem = arr.find(a => a.allocation_id === 'IND-171');
    if (dItem) {
      dItem.allocated_portfolio = 'Kiren Rijiju';
      console.log(`[${f}] Updated IND-171 portfolio to Kiren Rijiju`);
    }

    // Insert IND-197 & IND-198 right after IND-194
    const idx194 = arr.findIndex(a => a.allocation_id === 'IND-194');
    newRecords.forEach((rec, offset) => {
      if (!arr.find(a => a.allocation_id === rec.allocation_id)) {
        if (idx194 !== -1) {
          arr.splice(idx194 + 1 + offset, 0, rec);
        } else {
          arr.push(rec);
        }
        console.log(`[${f}] Inserted ${rec.allocation_id}`);
      }
    });

    fs.writeFileSync(p, JSON.stringify(arr, null, 2) + '\n', 'utf8');
    console.log(`[${f}] Final count: ${arr.length}`);
  });

  // 6. Update data/allocations.csv and public/allocations.csv
  ['data/allocations.csv', 'public/allocations.csv'].forEach(f => {
    const p = path.resolve(f);
    let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);

    // Update IND-171 line
    lines = lines.map(line => {
      if (line.startsWith('"IND-171"')) {
        return line.replace('"Amit Shah (BJP)"', '"Kiren Rijiju"');
      }
      return line;
    });

    // Insert IND-197 and IND-198 CSV lines
    const line194Idx = lines.findIndex(l => l.startsWith('"IND-194"'));
    const csvNewLines = newRecords.map(r => {
      return [
        `"${r.allocation_id}"`,
        `"${r.registration_type}"`,
        `"${r.record_id}"`,
        `"${r.member_index}"`,
        `"${r.delegate_name}"`,
        `"${r.email}"`,
        `"${r.phone}"`,
        `"${r.institution}"`,
        `"${r.college_name}"`,
        `"${r.delegate_category}"`,
        `"${r.delegation_name}"`,
        `"${r.allocated_committee}"`,
        `"${r.allocated_portfolio}"`,
        `"${r.session_chamber}"`,
        `"${r.whatsapp_community_url}"`,
        `"${r.hub_pass_url}"`,
        `"${r.qr_badge_path}"`,
        `"${r.allocation_status}"`,
        `"${r.payment_status}"`
      ].join(',');
    });

    csvNewLines.forEach((cLine, offset) => {
      const allocId = newRecords[offset].allocation_id;
      if (!lines.some(l => l.startsWith(`"${allocId}"`))) {
        if (line194Idx !== -1) {
          lines.splice(line194Idx + 1 + offset, 0, cLine);
        } else {
          lines.push(cLine);
        }
        console.log(`[${f}] Inserted CSV row for ${allocId}`);
      }
    });

    fs.writeFileSync(p, lines.join('\n') + '\n', 'utf8');
    console.log(`[${f}] Final lines count: ${lines.length}`);
  });

  // 7. Update public/qrs/hub-links.csv
  const hubCsvPath = path.resolve('public/qrs/hub-links.csv');
  let hubLines = fs.readFileSync(hubCsvPath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  const hubHeader = hubLines[0];
  let hubRows = hubLines.slice(1);

  // Update IND-171 in hubRows
  hubRows = hubRows.map(line => {
    if (line.includes('"IND-171"')) {
      return line.replace('"Amit Shah (BJP)"', '"Kiren Rijiju"');
    }
    return line;
  });

  // Insert IND-197 and IND-198 in hubRows right after IND-194
  const hub194Idx = hubRows.findIndex(l => l.includes('"IND-194"'));
  const hubNewRows = newRecords.map(r => {
    return [
      0, // placeholder, will reindex
      `"${r.allocation_id}"`,
      `"${r.delegate_name}"`,
      `"${r.email} • ${r.phone}"`,
      `"Individual Delegate"`,
      `"${r.allocated_committee}"`,
      `"${r.allocated_portfolio}"`,
      `"${r.hub_pass_url}"`
    ].join(',');
  });

  hubNewRows.forEach((rowStr, offset) => {
    const allocId = newRecords[offset].allocation_id;
    if (!hubRows.some(l => l.includes(`"${allocId}"`))) {
      if (hub194Idx !== -1) {
        hubRows.splice(hub194Idx + 1 + offset, 0, rowStr);
      } else {
        hubRows.push(rowStr);
      }
      console.log(`[hub-links.csv] Inserted ${allocId}`);
    }
  });

  // Re-number serial numbers 1..N
  const finalHubLines = [hubHeader];
  hubRows.forEach((row, i) => {
    const renumbered = row.replace(/^\d+,/, `${i + 1},`);
    finalHubLines.push(renumbered);
  });
  fs.writeFileSync(hubCsvPath, finalHubLines.join('\n') + '\n', 'utf8');
  console.log(`[hub-links.csv] Saved with ${hubRows.length} delegates.`);

  console.log('\n=== Local and database updates completed. Now synchronizing HTML and JSON ===\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
