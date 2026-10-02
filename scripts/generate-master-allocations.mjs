import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getPublicToken } from '../lib/token.js';

// ── Load Environment Variables ──────────────────────────────────────
const env = {};
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const k = trimmed.substring(0, eqIdx).trim();
    let v = trimmed.substring(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  });
}

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Supabase credentials missing in .env');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ── Venue / Session Chamber Resolver ────────────────────────────────
function resolveChamber(committee) {
  const c = String(committee || '').toUpperCase();
  if (c.includes('UNSC') || c.includes('SECURITY')) return 'Council Chamber • MBA Seminar Hall (2nd Floor)';
  if (c.includes('UNHRC') || c.includes('HUMAN')) return 'Committee Room 102 • Mech Seminar Hall';
  if (c.includes('DISEC') || c.includes('DISARMAMENT')) return 'Committee Room 204 • Civil Seminar Hall';
  if (c.includes('UNODC') || c.includes('DRUGS')) return 'Committee Room 301 • ECE Seminar Hall';
  if (c.includes('LOK') || c.includes('SABHA')) return 'Central Plenary Hall • Chanakya Block';
  if (c.includes('IP') || c.includes('PRESS')) return 'Press Bureau & Media Lab • Academic Block 1';
  return 'Main Plenary Hall • Academic Block 2';
}

// ── WhatsApp Community Link Resolver ────────────────────────────────
const COMMITTEE_WHATSAPP_MAP = {
  'UNSC': 'https://chat.whatsapp.com/JZij2Vt7Vg64qTSFcMNLRh',
  'LOK SABHA': 'https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5',
  'UNODC': 'https://chat.whatsapp.com/IcgBAXEcbO8F9UCf0DiFJm',
  'UNHRC': 'https://chat.whatsapp.com/Kqgvxt2yVwsGGDcWAaC1sC',
  'IPC': 'https://chat.whatsapp.com/Id2vun9PhQhGlRFTQZKoZm',
  'DISEC': 'https://chat.whatsapp.com/ChdeFdrcg0U88lUuaMLrI2'
};

function resolveWhatsApp(committee) {
  const c = String(committee || '').toUpperCase();
  if (c.includes('UNSC')) return COMMITTEE_WHATSAPP_MAP['UNSC'];
  if (c.includes('LOK') || c.includes('SABHA')) return COMMITTEE_WHATSAPP_MAP['LOK SABHA'];
  if (c.includes('UNODC')) return COMMITTEE_WHATSAPP_MAP['UNODC'];
  if (c.includes('UNHRC')) return COMMITTEE_WHATSAPP_MAP['UNHRC'];
  if (c.includes('IP') || c.includes('PRESS')) return COMMITTEE_WHATSAPP_MAP['IPC'];
  if (c.includes('DISEC')) return COMMITTEE_WHATSAPP_MAP['DISEC'];
  return 'https://mun.rnsit.ac.in/channels';
}

function normalizeCommittee(comm) {
  const c = String(comm || '').trim();
  const lower = c.toLowerCase();
  if (lower.includes('lok sabha')) return 'Lok Sabha';
  if (lower.includes('disec')) return 'DISEC';
  if (lower.includes('unsc')) return 'UNSC';
  if (lower.includes('unhrc')) return 'UNHRC';
  if (lower.includes('unodc')) return 'UNODC';
  if (lower.includes('ip') || lower.includes('press')) return 'IP';
  return c;
}

// ── Manual Delegation College Name Overrides ────────────────────────
// Specify official full college / university names here by delegation ID or name:
export const DELEGATION_COLLEGE_MAP = {
  47: 'CMS Business School',
  67: 'Alliance University',
  92: 'PES University',
  95: 'MCU MUN Society',
  96: 'EC casino royale',
  97: 'KLE Society'
};

function resolveDelegationCollege(del) {
  if (DELEGATION_COLLEGE_MAP[del.id]) return DELEGATION_COLLEGE_MAP[del.id];
  if (DELEGATION_COLLEGE_MAP[del.delegation_name]) return DELEGATION_COLLEGE_MAP[del.delegation_name];
  return del.college_name || del.institution || del.delegation_name;
}

// ── Local Fallback Store ────────────────────────────────────────────
function getLocalCheckpoints() {
  const p = path.resolve(process.cwd(), '.data', 'checkpoints.json');
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8')) || {};
    } catch (e) {}
  }
  return {};
}

async function main() {
  console.log('Fetching live records from Supabase...');

  const [regsRes, delsRes, cpsRes] = await Promise.all([
    sb.from('registrations').select('*').order('id', { ascending: true }),
    sb.from('delegations').select('*').order('id', { ascending: true }),
    sb.from('delegate_checkpoints').select('*').eq('checkpoint_key', 'allocation')
  ]);

  if (regsRes.error) throw regsRes.error;
  if (delsRes.error) throw delsRes.error;
  if (cpsRes.error) throw cpsRes.error;

  const registrations = regsRes.data || [];
  const delegations = delsRes.data || [];
  const checkpoints = cpsRes.data || [];
  const localCps = getLocalCheckpoints();

  console.log(`Fetched ${registrations.length} registrations, ${delegations.length} delegations, ${checkpoints.length} allocation checkpoints.`);

  // Build Checkpoint Lookup: `${record_type}_${record_id}_${member_index}`
  const cpMap = new Map();
  for (const cp of checkpoints) {
    const k = `${cp.record_type}_${cp.record_id}_${cp.member_index || 0}`;
    cpMap.set(k, cp);
  }

  const masterList = [];

  // 1. Process Individual Delegates
  for (const reg of registrations) {
    const k = `individual_${reg.id}_0`;
    const localKey = `individual_${reg.id}`;
    const cp = cpMap.get(k);
    const local = localCps[localKey] || {};

    let committee = cp?.allocated_committee ||
      local?.allocation?.allocated_committee ||
      local?.allocatedCommittee ||
      reg.committee1 ||
      'Unassigned';

    let portfolio = cp?.allocated_portfolio ||
      local?.allocation?.allocated_portfolio ||
      local?.allocatedPortfolio ||
      reg.portfolio1_1 ||
      'Unassigned';

    committee = normalizeCommittee(committee);

    const token = getPublicToken('individual', reg.id);
    const hubUrl = `https://mun.rnsit.ac.in/hub?t=${token}`;
    const qrImage = reg.qr_pass_url || `/qrs/individual_delegates/IND-${reg.id}_${reg.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    masterList.push({
      allocation_id: `IND-${reg.id}`,
      registration_type: 'Individual',
      record_id: reg.id,
      member_index: 0,
      delegate_name: reg.name,
      email: reg.email,
      phone: reg.phone,
      institution: reg.institution || 'RNSIT',
      college_name: reg.institution || 'RNS Institute of Technology',
      delegate_category: reg.delegate_type || 'Individual Delegate',
      delegation_name: 'Individual',
      allocated_committee: committee,
      allocated_portfolio: portfolio,
      session_chamber: resolveChamber(committee),
      whatsapp_community_url: resolveWhatsApp(committee),
      hub_pass_url: hubUrl,
      qr_badge_path: qrImage,
      allocation_status: (committee !== 'Unassigned' && portfolio !== 'Unassigned') ? 'Confirmed' : 'Pending',
      payment_status: reg.status || 'Verified'
    });
  }

  // 2. Process Delegations (College / School Roster Members)
  for (const del of delegations) {
    const roster = Array.isArray(del.roster_data) ? del.roster_data : [];
    const qrUrls = Array.isArray(del.qr_pass_urls) ? del.qr_pass_urls : [];
    const resolvedCollege = resolveDelegationCollege(del);

    roster.forEach((member, idx) => {
      const k = `delegation_${del.id}_${idx}`;
      const localKey = `delegation_${del.id}_${idx}`;
      const cp = cpMap.get(k);
      const local = localCps[localKey] || {};

      let committee = cp?.allocated_committee ||
        member.allocated_committee ||
        member.committee ||
        local?.allocation?.allocated_committee ||
        'Institutional Delegation';

      let portfolio = cp?.allocated_portfolio ||
        member.allocated_portfolio ||
        member.portfolio ||
        local?.allocation?.allocated_portfolio ||
        'Assigned Delegate';

      committee = normalizeCommittee(committee);

      const token = getPublicToken('delegation', del.id);
      const hubUrl = `https://mun.rnsit.ac.in/hub?t=${token}&m=${idx}`;
      const memberCode = `DEL-${del.id}-${String(idx + 1).padStart(2, '0')}`;
      const qrImage = qrUrls[idx] || `/qrs/${del.delegation_name.replace(/[^a-zA-Z0-9_-]/g, '_')}/${memberCode}_${(member.name || '').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

      masterList.push({
        allocation_id: memberCode,
        registration_type: 'Delegation Member',
        record_id: del.id,
        member_index: idx,
        delegate_name: member.name || `${del.delegation_name} Member ${idx + 1}`,
        email: member.email || del.email,
        phone: member.phone || del.phone,
        institution: del.delegation_name,
        college_name: resolvedCollege,
        delegate_category: del.delegation_type || 'External Delegation',
        delegation_name: del.delegation_name,
        allocated_committee: committee,
        allocated_portfolio: portfolio,
        session_chamber: resolveChamber(committee),
        whatsapp_community_url: resolveWhatsApp(committee),
        hub_pass_url: hubUrl,
        qr_badge_path: qrImage,
        allocation_status: (committee !== 'Unassigned' && portfolio !== 'Unassigned') ? 'Confirmed' : 'Pending',
        payment_status: del.status || 'Verified'
      });
    });
  }

  console.log(`Compiled master allocations database: ${masterList.length} total delegates.`);

  // ── Ensure 'data' Directory Exists ─────────────────────────────────
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // ── Write Master JSON ──────────────────────────────────────────────
  const jsonPath = path.join(dataDir, 'allocations.json');
  fs.writeFileSync(jsonPath, JSON.stringify(masterList, null, 2), 'utf8');
  console.log(`✓ Saved master JSON to ${jsonPath}`);

  // ── Write Master CSV Spreadsheet ───────────────────────────────────
  const csvHeaders = [
    'Allocation ID',
    'Registration Type',
    'Record ID',
    'Member Index',
    'Delegate Name',
    'Email Address',
    'Phone Number',
    'Institution / Delegation',
    'College Name',
    'Delegate Category',
    'Delegation Name',
    'Allocated Committee',
    'Allocated Portfolio',
    'Session Chamber',
    'WhatsApp Community Link',
    'Hub Pass URL',
    'QR Badge Path',
    'Allocation Status',
    'Registration Status'
  ];

  const escapeCsv = val => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const csvRows = masterList.map(row => [
    escapeCsv(row.allocation_id),
    escapeCsv(row.registration_type),
    escapeCsv(row.record_id),
    escapeCsv(row.member_index),
    escapeCsv(row.delegate_name),
    escapeCsv(row.email),
    escapeCsv(row.phone),
    escapeCsv(row.institution),
    escapeCsv(row.college_name),
    escapeCsv(row.delegate_category),
    escapeCsv(row.delegation_name),
    escapeCsv(row.allocated_committee),
    escapeCsv(row.allocated_portfolio),
    escapeCsv(row.session_chamber),
    escapeCsv(row.whatsapp_community_url),
    escapeCsv(row.hub_pass_url),
    escapeCsv(row.qr_badge_path),
    escapeCsv(row.allocation_status),
    escapeCsv(row.payment_status)
  ].join(','));

  const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows].join('\r\n');
  const csvPath = path.join(dataDir, 'allocations.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✓ Saved master CSV spreadsheet to ${csvPath}`);

  // Also copy to public/ so Secretariat can download it directly from browser
  const publicDir = path.resolve(process.cwd(), 'public');
  fs.writeFileSync(path.join(publicDir, 'allocations.json'), JSON.stringify(masterList, null, 2), 'utf8');
  fs.writeFileSync(path.join(publicDir, 'allocations.csv'), csvContent, 'utf8');
  console.log(`✓ Published public copies to /allocations.json and /allocations.csv`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
