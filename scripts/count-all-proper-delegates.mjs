import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = {};
fs.readFileSync('.env', 'utf8').split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function countEverything() {
  console.log('=====================================================');
  console.log('OFFICIAL DELEGATE HEADCOUNT & REGISTRATION AUDIT');
  console.log('=====================================================\n');

  // 1. Individual Registrations
  const { data: allRegs, error: e1 } = await sb.from('registrations').select('*').order('id');
  if (e1) throw e1;

  const confirmedRegs = allRegs.filter(r => String(r.status || '').toLowerCase() === 'confirmed');
  const rejectedRegs = allRegs.filter(r => String(r.status || '').toLowerCase() === 'rejected');
  const pendingRegs = allRegs.filter(r => String(r.status || '').toLowerCase() === 'pending verification');

  const internalRegs = confirmedRegs.filter(r => String(r.delegate_type || '').toLowerCase().includes('internal'));
  const externalRegs = confirmedRegs.filter(r => !String(r.delegate_type || '').toLowerCase().includes('internal'));

  console.log('--- 1. INDIVIDUAL DELEGATES ---');
  console.log(`• Total Confirmed Individuals : ${confirmedRegs.length}`);
  console.log(`    - Internal (RNSIT)        : ${internalRegs.length}`);
  console.log(`    - External Delegates      : ${externalRegs.length}`);
  console.log(`• Pending Verification        : ${pendingRegs.length} (e.g. ID 202 Karthik)`);
  console.log(`• Rejected / Superseded       : ${rejectedRegs.length}`);

  // 2. Delegations
  const { data: allDels, error: e2 } = await sb.from('delegations').select('*').order('id');
  if (e2) throw e2;

  const confirmedDels = allDels.filter(d => String(d.status || '').toLowerCase() === 'confirmed');
  const pendingDels = allDels.filter(d => String(d.status || '').toLowerCase() === 'pending verification');

  console.log('\n--- 2. INSTITUTIONAL DELEGATIONS ---');
  console.log(`• Total Confirmed Delegations : ${confirmedDels.length}`);
  
  let totalDelegationMembers = 0;
  confirmedDels.forEach((d, idx) => {
    const rosterLen = Array.isArray(d.roster_data) ? d.roster_data.length : (d.member_count || 0);
    totalDelegationMembers += rosterLen;
    console.log(`    ${idx + 1}. [ID ${d.id}] ${d.delegation_name.padEnd(25)} : ${rosterLen} delegates (Head: ${d.head_name})`);
  });

  console.log(`• Total Confirmed Delegation Members : ${totalDelegationMembers}`);
  if (pendingDels.length > 0) {
    console.log(`• Pending Verification Delegations   : ${pendingDels.length} (${pendingDels.map(d => `${d.delegation_name} - ${d.member_count} members`).join(', ')})`);
  }

  // 3. Grand Total Headcount
  // Note on Aathif Hussain: He has individual reg (ID 208) AND is DEL-95-16 in MCU.
  // In master allocations, he is counted as DEL-95-16 (1 unique attending person).
  console.log('\n=====================================================');
  console.log(`GRAND TOTAL PROPER REGISTERED DELEGATES: ${confirmedRegs.length + totalDelegationMembers - (confirmedRegs.some(r => r.id === 208) ? 1 : 0)} (Unique Attending Delegates)`);
  console.log(`  [Confirmed Individuals (${confirmedRegs.length - 1}) + Confirmed Delegation Members (${totalDelegationMembers})]`);
  console.log('=====================================================\n');

  // 4. Master Allocations Database Check
  const masterAllocations = JSON.parse(fs.readFileSync('data/allocations.json', 'utf8'));
  console.log(`--- 3. MASTER ALLOCATIONS ACTIVE DATABASE (${masterAllocations.length} delegates) ---`);
  
  const commCounts = {};
  masterAllocations.forEach(d => {
    const c = d.allocated_committee || 'Unassigned';
    commCounts[c] = (commCounts[c] || 0) + 1;
  });

  console.log('Breakdown by Council / Committee:');
  Object.keys(commCounts).sort().forEach(c => {
    console.log(`  • ${c.padEnd(14)} : ${commCounts[c]} delegates`);
  });

  console.log(`\n  Total in Master Allocations: ${masterAllocations.length}`);
}

countEverything().catch(console.error);
