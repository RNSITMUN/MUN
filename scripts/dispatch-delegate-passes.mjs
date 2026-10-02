/**
 * Delegate Pass Mailer & WhatsApp Caucus Dispatcher
 * RNS MUN 2026
 *
 * Sends personalized pass emails to EACH INDIVIDUAL DELEGATE at their OWN email address
 * with their committee's official WhatsApp group link and background guide.
 *
 * Usage:
 *   node scripts/dispatch-delegate-passes.mjs                      (Default: Dry-run for all delegates)
 *   node scripts/dispatch-delegate-passes.mjs --only test@email.com (Dry-run for single email)
 *   node scripts/dispatch-delegate-passes.mjs --live              (Perform real sending - requires explicit confirmation)
 *   node scripts/dispatch-delegate-passes.mjs --live --only test@email.com
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { normalizeCommitteeName, getCommitteeConfig, resolveCommitteeWhatsApp, resolveCommitteeBgGuide } from '../lib/committees.js';

// ── Environment Variables ───────────────────────────────────────────
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const k = trimmed.substring(0, eqIdx).trim();
        let v = trimmed.substring(eqIdx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
        if (k === key) return v;
      }
    }
  }
  return process.env[key] || '';
}

// ── CLI Arguments ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const isLive = args.includes('--live') || args.includes('--send') || args.includes('--no-dry-run');
const isDryRun = !isLive;
const ccHead = args.includes('--cc-head'); // Default is NO CC

let onlyEmail = null;
const onlyIdx = args.findIndex(a => a === '--only');
if (onlyIdx !== -1 && args[onlyIdx + 1]) {
  onlyEmail = args[onlyIdx + 1].trim().toLowerCase();
}

let limitCount = Infinity;
const limitIdx = args.findIndex(a => a === '--limit');
if (limitIdx !== -1 && args[limitIdx + 1]) {
  limitCount = parseInt(args[limitIdx + 1], 10) || Infinity;
}

const delayMs = 600; // Small delay between sends to respect SMTP / Apps Script limits

console.log('===============================================================');
console.log("       RNS MUN 2026 — INDIVIDUAL DELEGATE PASS DISPATCHER      ");
console.log('===============================================================');
console.log(`Mode:       ${isDryRun ? '🔍 DRY RUN (Simulating send, no emails dispatched)' : '🚀 LIVE SENDING ACTIVE'}`);
if (onlyEmail) console.log(`Filter:     Only targeting email: "${onlyEmail}"`);
if (limitCount !== Infinity) console.log(`Limit:      Maximum ${limitCount} delegates`);
console.log(`CC Head:    ${ccHead ? 'Enabled' : 'Disabled (Default)'}\n`);

// ── Sent Log Persistence ────────────────────────────────────────────
const SENT_LOG_PATH = path.resolve(process.cwd(), '.data', 'sent_mail_log.json');

function readSentLog() {
  try {
    if (fs.existsSync(SENT_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(SENT_LOG_PATH, 'utf8')) || {};
    }
  } catch (e) {}
  return {};
}

function writeSentLog(log) {
  try {
    const dir = path.dirname(SENT_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
  } catch (e) {
    console.warn('Warning: Could not save local sent log:', e.message);
  }
}

const sentLog = readSentLog();

// ── HTML Escaper ────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Master Email Template ───────────────────────────────────────────
// Canonical template with all mandated sections intact
const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RNS MUN 2026 — Official Digital Pass &amp; Committee Credential</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FBF8F5;
      color: #1F1B19;
      margin: 0;
      padding: 24px 12px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1.5px solid #E6DED8;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(108, 13, 44, 0.05);
    }
    .header-banner {
      background: linear-gradient(135deg, #6C0D2C 0%, #4A081D 100%);
      color: #FFFFFF;
      padding: 32px 24px 24px 24px;
      text-align: center;
    }
    .header-logo {
      display: block;
      margin: 0 auto 12px auto;
      max-width: 260px;
      height: auto;
    }
    .header-kicker {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #F8C366;
      margin-bottom: 6px;
    }
    .header-headline {
      font-size: 21px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }
    .content-area {
      padding: 30px 24px;
    }
    .salutation {
      font-size: 19px;
      font-weight: 800;
      color: #6C0D2C;
      margin-bottom: 12px;
    }
    .lead-text {
      font-size: 14.5px;
      color: #38312E;
      line-height: 1.65;
      margin: 0 0 16px 0;
    }
    .dossier-card {
      background: #FAF7F4;
      border: 1.5px solid #E4DBD3;
      border-radius: 12px;
      padding: 20px;
      margin: 22px 0;
    }
    .dossier-tag {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #6C0D2C;
      background: #F3EAE3;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .dossier-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7D736E;
      margin-bottom: 4px;
      display: block;
    }
    .dossier-value-primary {
      font-size: 18px;
      font-weight: 800;
      color: #6C0D2C;
      margin-bottom: 12px;
    }
    .dossier-value-secondary {
      font-size: 17px;
      font-weight: 800;
      color: #1F1B19;
    }
    .dossier-meta-table {
      width: 100%;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed #D9CFC7;
      font-size: 13px;
    }
    .dossier-meta-table td {
      padding: 4px 0;
    }
    .pass-card {
      border: 2px solid #6C0D2C;
      background: #FFFDFB;
      border-radius: 14px;
      margin: 24px 0;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(108, 13, 44, 0.08);
    }
    .pass-header {
      background: #6C0D2C;
      color: #FFFFFF;
      padding: 12px 16px;
      text-align: center;
    }
    .pass-header-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .pass-header-sub {
      font-size: 11px;
      opacity: 0.85;
      margin-top: 2px;
    }
    .pass-body {
      padding: 20px 16px;
      text-align: center;
    }
    .qr-frame {
      display: inline-block;
      padding: 12px;
      background: #FFFFFF;
      border: 1.5px solid #E8E0DA;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      margin-bottom: 12px;
    }
    .pass-pill {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 12px;
      font-weight: 800;
      color: #6C0D2C;
      background: #F4EBE5;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid #E6D6CC;
      margin-bottom: 10px;
    }
    .pass-instruction {
      font-size: 12.5px;
      color: #605753;
      line-height: 1.45;
      max-width: 440px;
      margin: 0 auto 16px auto;
    }
    .btn-pill-maroon {
      display: inline-block;
      background: #6C0D2C;
      color: #FFFFFF !important;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      padding: 10px 22px;
      border-radius: 999px;
      box-shadow: 0 4px 10px rgba(108, 13, 44, 0.2);
    }
    .pass-url-note {
      font-size: 11px;
      color: #8C827D;
      margin-top: 12px;
      word-break: break-all;
    }
    .pass-url-note a {
      color: #6C0D2C;
      font-weight: 600;
      text-decoration: underline;
    }
    .caucus-card {
      background: #F1F9F4;
      border: 1.5px solid #C4E3D1;
      border-radius: 14px;
      padding: 20px;
      margin: 24px 0;
    }
    .caucus-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .caucus-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #0F5132;
    }
    .caucus-badge {
      font-size: 10px;
      font-weight: 800;
      color: #FFFFFF;
      background: #198754;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .caucus-chamber {
      background: #FFFFFF;
      border: 1px solid #D4EADB;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
    }
    .caucus-chamber-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0F5132;
      opacity: 0.8;
      display: block;
      margin-bottom: 2px;
    }
    .caucus-chamber-name {
      font-size: 15px;
      font-weight: 800;
      color: #0B4228;
    }
    .caucus-copy {
      font-size: 13.5px;
      color: #2D4C3C;
      line-height: 1.5;
      margin: 0 0 14px 0;
    }
    .btn-pill-green {
      display: inline-block;
      background: #198754;
      color: #FFFFFF !important;
      font-size: 13.5px;
      font-weight: 700;
      text-decoration: none;
      padding: 10px 22px;
      border-radius: 999px;
      box-shadow: 0 4px 10px rgba(25, 135, 84, 0.2);
    }
    .guide-card {
      background: #FDF9F2;
      border: 1.5px solid #ECD8B6;
      border-radius: 14px;
      padding: 18px 20px;
      margin: 22px 0;
    }
    .guide-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #8C590E;
      margin-bottom: 8px;
    }
    .guide-copy {
      font-size: 13.5px;
      color: #5C431B;
      line-height: 1.5;
      margin: 0 0 12px 0;
    }
    .btn-pill-gold {
      display: inline-block;
      background: #A16A14;
      color: #FFFFFF !important;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      padding: 8px 18px;
      border-radius: 999px;
    }
    .venue-card {
      background: #FFFFFF;
      border: 1.5px solid #E6DED8;
      border-radius: 12px;
      padding: 18px 20px;
      margin: 24px 0;
    }
    .venue-table {
      width: 100%;
      font-size: 13.5px;
      border-collapse: collapse;
    }
    .venue-table td {
      padding: 6px 0;
      vertical-align: top;
    }
    .venue-label {
      color: #7D736E;
      font-weight: 600;
      width: 110px;
    }
    .venue-value {
      color: #1F1B19;
      font-weight: 700;
      line-height: 1.45;
    }
    .contact-card {
      background: #F7F3EF;
      border-radius: 10px;
      padding: 14px 16px;
      margin: 16px 0 24px 0;
      font-size: 13px;
    }
    .contact-row {
      margin-bottom: 6px;
    }
    .contact-row a {
      color: #6C0D2C;
      font-weight: 700;
      text-decoration: none;
    }
    .contact-divider {
      height: 1px;
      background: #E5DCD4;
      margin: 8px 0;
    }
    .footer-signoff {
      font-size: 14px;
      color: #5C524D;
      line-height: 1.5;
      border-top: 1px solid #EBE3DC;
      padding-top: 18px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header-banner">
      <img src="https://mun.rnsit.ac.in/assets/Logos/RNS_MUN_2026.png" alt="RNS MUN 2026" class="header-logo" width="260" onerror="this.onerror=null;this.src='/assets/Logos/RNS_MUN_2026.png';">
      <div class="header-kicker">Core Secretariat &bull; Official Dossier</div>
      <h1 class="header-headline">Digital Delegate Pass &amp; Committee Credential</h1>
    </div>

    <div class="content-area">
      <div class="salutation">Dear {{name}},</div>
      <p class="lead-text">
        Greetings from the Core Secretariat of <strong>RNS Model United Nations 2026</strong>.
      </p>
      <p class="lead-text">
        We are pleased to formally convey your diplomatic assignment, verified Digital QR Pass, and exclusive access to your committee's official caucus channel. Please review your credentials and conference details below:
      </p>

      <!-- Assignment Dossier Card -->
      <div class="dossier-card">
        <div class="dossier-tag">✦ Diplomatic Appointment Dossier</div>
        <div class="dossier-item">
          <span class="dossier-label">Allocated Committee</span>
          <div class="dossier-value-primary">{{allocated_committee}}</div>
        </div>
        <div class="dossier-item" style="margin-bottom: 0;">
          <span class="dossier-label">Allocated Portfolio / Representation</span>
          <div class="dossier-value-secondary">{{allocated_portfolio}}</div>
        </div>

        <table class="dossier-meta-table">
          <tr>
            <td style="color: #7D736E; font-weight: 600;">Delegate Reference:</td>
            <td style="text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 700; color: #6C0D2C;">#RNSMUN-26-{{registration_id}}</td>
          </tr>
          <tr>
            <td style="color: #7D736E; font-weight: 600;">Institution / College:</td>
            <td style="text-align: right; font-weight: 600; color: #2D2725;">{{institution}}</td>
          </tr>
          <tr>
            <td style="color: #7D736E; font-weight: 600;">Delegation Type:</td>
            <td style="text-align: right; font-weight: 600; color: #2D2725;">{{type}}</td>
          </tr>
        </table>
      </div>

      <!-- Official Digital Pass & QR Code -->
      <div class="pass-card">
        <div class="pass-header">
          <div class="pass-header-title">Official Digital Delegate Pass</div>
          <div class="pass-header-sub">Conference Credential &amp; Chamber Entry Token</div>
        </div>
        <div class="pass-body">
          <div class="qr-frame">
            <img src="{{qr_code_url}}" alt="Delegate QR Pass" width="170" height="170" onerror="this.onerror=null;this.src='https://api.qrserver.com/v1/create-qr-code/?size=250x250&amp;data=' + encodeURIComponent('{{hub_url}}');">
          </div>
          <div>
            <span class="pass-pill">#RNSMUN-26-{{registration_id}}</span>
          </div>
          <p class="pass-instruction">
            Present this QR code on your mobile device or as a printout at the registration desk on Day 1 for instant badge issuance and chamber clearance.
          </p>
          <div style="margin: 6px 0 10px 0;">
            <a href="{{hub_url}}" target="_blank" class="btn-pill-maroon">
              Open Live Delegate Pass &rarr;
            </a>
          </div>
          <div class="pass-url-note">
            Direct access portal:<br>
            <a href="{{hub_url}}" target="_blank">{{hub_url}}</a>
          </div>
        </div>
      </div>

      <!-- Official WhatsApp Caucus Card -->
      <div class="caucus-card">
        <div class="caucus-header">
          <span class="caucus-title">Committee WhatsApp Caucus</span>
          <span class="caucus-badge">Official Group</span>
        </div>
        <div class="caucus-chamber">
          <span class="caucus-chamber-label">Assigned Caucus Channel</span>
          <div class="caucus-chamber-name">{{allocated_committee}}</div>
        </div>
        <p class="caucus-copy">
          Connect directly with your Executive Board and fellow diplomats. Real-time announcements, unmoderated caucus collaboration, and session notices are communicated exclusively through this group.
        </p>
        <div style="text-align: center; margin: 12px 0 6px 0;">
          <a href="{{whatsapp_link}}" target="_blank" class="btn-pill-green">
            Join Official WhatsApp Channel &rarr;
          </a>
        </div>
        <div style="text-align: center; font-size: 11.5px; color: #1B6C4B; margin-top: 10px; word-break: break-all;">
          Invite link: <a href="{{whatsapp_link}}" target="_blank" style="color: #0E4331; font-weight: 700; text-decoration: underline;">{{whatsapp_link}}</a>
        </div>
      </div>

      <!-- Study Dossier & Background Guide -->
      <div class="guide-card">
        <div class="guide-title">Background Guide &amp; Study Dossier</div>
        <p class="guide-copy">
          Comprehensive background guides, committee Rules of Procedure (RoP), and position paper guidelines have been curated by your Executive Board to direct your substantive research.
        </p>
        <div style="text-align: center; margin: 8px 0 4px 0;">
          <a href="{{bg_guide_url}}" target="_blank" class="btn-pill-gold">
            Access Background Guides &rarr;
          </a>
        </div>
      </div>

      <!-- Conference Dates & Venue -->
      <div class="venue-card">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #6C0D2C; margin-bottom: 12px;">
          Conference Schedule &amp; Venue
        </div>
        <table class="venue-table">
          <tr>
            <td class="venue-label">Dates:</td>
            <td class="venue-value">
              Tuesday, 06 October 2026 (Day 1)<br>
              Wednesday, 07 October 2026 (Day 2)
            </td>
          </tr>
          <tr>
            <td class="venue-label">Reporting:</td>
            <td class="venue-value">
              08:00 AM Registration Desk Opens<br>
              08:30 AM Opening Plenary
            </td>
          </tr>
          <tr>
            <td class="venue-label">Venue:</td>
            <td class="venue-value">
              <strong>RNS Institute of Technology (RNSIT) Campus</strong><br>
              Dr. Vishnuvardhan Road, Channasandra, RR Nagar, Bengaluru &ndash; 560098
            </td>
          </tr>
          <tr>
            <td class="venue-label">Navigation:</td>
            <td>
              <a href="https://maps.google.com/?q=RNS+Institute+of+Technology,+Bengaluru" target="_blank" style="color: #6C0D2C; font-weight: 700; text-decoration: underline; font-size: 13px;">
                Open in Google Maps &rarr;
              </a>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14.5px; color: #4A423F; line-height: 1.55; margin-top: 20px;">
        For any inquiries regarding your committee agenda, position papers, or logistical details, please reach out to our Delegate Affairs desk:
      </p>

      <!-- Contact Card -->
      <div class="contact-card">
        <div class="contact-row"><strong>Zeyan</strong> (Delegate Affairs): <a href="tel:+919155973955">+91 91559 73955</a></div>
        <div class="contact-divider"></div>
        <div class="contact-row"><strong>Adith</strong> (Delegate Affairs): <a href="tel:+918970262490">+91 89702 62490</a></div>
        <div class="contact-divider"></div>
        <div class="contact-row"><strong>Official Secretariat Email:</strong> <a href="mailto:mun@rnsit.ac.in">mun@rnsit.ac.in</a></div>
      </div>

      <p style="font-size: 14.5px; color: #4A423F; line-height: 1.55;">
        We look forward to welcoming you for two days of spirited debate and diplomacy at RNS MUN 2026.
      </p>

      <div class="footer-signoff">
        Warm regards,<br>
        <strong>Core Secretariat of RNS MUN 2026</strong><br>
        RNSIT MUN Society, Bengaluru
      </div>
    </div>
  </div>
</body>
</html>`;

// ── Parse CSV ───────────────────────────────────────────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur);
      cur = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
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

const csvPath = path.resolve(process.cwd(), 'data', 'allocations.csv');
const parsed = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const headers = parsed[0].map(h => h.trim().toLowerCase());
const rawDataRows = parsed.slice(1);

const col = {
  allocId: headers.findIndex(h => h.includes('allocation id')),
  regType: headers.findIndex(h => h.includes('registration type')),
  recordId: headers.findIndex(h => h.includes('record id')),
  memberIndex: headers.findIndex(h => h.includes('member index')),
  name: headers.findIndex(h => h.includes('delegate name')),
  email: headers.findIndex(h => h.includes('email')),
  phone: headers.findIndex(h => h.includes('phone')),
  institution: headers.findIndex(h => h.includes('institution') || h.includes('college')),
  delegationName: headers.findIndex(h => h.includes('delegation name')),
  comm: headers.findIndex(h => h.includes('allocated committee')),
  port: headers.findIndex(h => h.includes('allocated portfolio')),
  hubUrl: headers.findIndex(h => h.includes('hub pass url')),
  qrPath: headers.findIndex(h => h.includes('qr badge path'))
};

// ── Map and Validate Delegates ──────────────────────────────────────
const delegates = [];
const skipped = [];

rawDataRows.forEach((r, idx) => {
  const allocId = r[col.allocId] || `ROW-${idx + 1}`;
  const regType = (r[col.regType] || '').trim();
  const recordId = (r[col.recordId] || '').trim();
  const memberIndex = parseInt(r[col.memberIndex] || '0', 10);
  const name = (r[col.name] || '').trim();
  const rawEmail = (r[col.email] || '').trim();
  const institution = (r[col.institution] || 'Institutional Representative').trim();
  const delegationName = (r[col.delegationName] || '').trim();
  const rawComm = (r[col.comm] || '').trim();
  const rawPort = (r[col.port] || '').trim();
  const hubUrl = (r[col.hubUrl] || '').trim();

  // Clean email using standard regex
  const emailMatch = rawEmail.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const cleanEmail = emailMatch ? emailMatch[1].toLowerCase() : '';

  if (!cleanEmail) {
    skipped.push({ allocId, name, reason: 'Invalid or missing email address', email: rawEmail });
    return;
  }

  // Lookup committee & WhatsApp URL
  const normComm = normalizeCommitteeName(rawComm);
  const commConfig = normComm ? getCommitteeConfig(normComm) : null;
  const waLink = commConfig ? commConfig.whatsapp_link : null;

  if (!waLink) {
    skipped.push({ allocId, name, reason: `No verified WhatsApp link configured for committee "${rawComm}"`, email: cleanEmail });
    return;
  }

  const bgGuideUrl = commConfig.bg_guide_url || 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(hubUrl)}`;

  delegates.push({
    allocId,
    regType,
    recordId,
    memberIndex,
    name,
    email: cleanEmail,
    institution,
    delegationName,
    allocated_committee: normComm,
    allocated_portfolio: rawPort,
    whatsapp_link: waLink,
    bg_guide_url: bgGuideUrl,
    hub_url: hubUrl,
    qr_code_url: qrCodeUrl
  });
});

console.log(`Parsed ${rawDataRows.length} total rows:`);
console.log(`  Valid delegates ready for dispatch: ${delegates.length}`);
console.log(`  Skipped delegates (missing email/link): ${skipped.length}`);

if (skipped.length > 0) {
  console.log('\n--- Skipped Delegates Summary ---');
  skipped.forEach(s => {
    console.log(`  - [${s.allocId}] ${s.name} (${s.email || 'no email'}): ${s.reason}`);
  });
  console.log('');
}

// Filter if --only specified
let targetQueue = delegates;
if (onlyEmail) {
  targetQueue = delegates.filter(d => d.email.toLowerCase() === onlyEmail);
  if (targetQueue.length === 0) {
    console.error(`Error: No delegate found matching email "${onlyEmail}".`);
    process.exit(1);
  }
}

if (limitCount < targetQueue.length) {
  targetQueue = targetQueue.slice(0, limitCount);
}

// ── Google Apps Script Dispatch Config ──────────────────────────────
const scriptUrl = (getEnv('GOOGLE_SCRIPT_MAILER_URL') || '').trim();
const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

// ── Dispatch Loop ───────────────────────────────────────────────────
async function runDispatch() {
  console.log(`Processing queue of ${targetQueue.length} delegate(s)...\n`);

  let sentCount = 0;
  let skippedAlreadySent = 0;
  let failCount = 0;

  for (let i = 0; i < targetQueue.length; i++) {
    const d = targetQueue[i];
    const logKey = `${d.allocId}_${d.email}`;

    // Double-send prevention check
    if (sentLog[logKey] && !onlyEmail) {
      skippedAlreadySent++;
      continue;
    }

    // Build personalized HTML
    let personalizedHtml = EMAIL_TEMPLATE
      .replace(/\{\{name\}\}/g, escapeHtml(d.name))
      .replace(/\{\{allocated_committee\}\}/g, escapeHtml(d.allocated_committee))
      .replace(/\{\{allocated_portfolio\}\}/g, escapeHtml(d.allocated_portfolio))
      .replace(/\{\{registration_id\}\}/g, escapeHtml(d.allocId))
      .replace(/\{\{institution\}\}/g, escapeHtml(d.institution))
      .replace(/\{\{type\}\}/g, escapeHtml(d.delegationName === 'Individual' ? 'Individual' : d.delegationName))
      .replace(/\{\{hub_url\}\}/g, d.hub_url)
      .replace(/\{\{qr_code_url\}\}/g, d.qr_code_url)
      .replace(/\{\{whatsapp_link\}\}/g, d.whatsapp_link)
      .replace(/\{\{bg_guide_url\}\}/g, d.bg_guide_url);

    // Fail loudly if any placeholder remains unreplaced
    const unreplacedMatch = personalizedHtml.match(/\{\{[a-zA-Z0-9_]+\}\}/g);
    if (unreplacedMatch) {
      console.error(`❌ Template error for ${d.allocId} (${d.name}): Unreplaced placeholders detected: ${unreplacedMatch.join(', ')}`);
      failCount++;
      continue;
    }

    const subject = `Official Delegate Pass, QR Code & Committee WhatsApp Group — RNS MUN 2026 | ${d.name}`;

    if (isDryRun) {
      console.log(`[DRY RUN #${i + 1}]`);
      console.log(`  Recipient:  ${d.email} (${d.name})`);
      console.log(`  Pass ID:    ${d.allocId} | Institution: ${d.institution}`);
      console.log(`  Committee:  ${d.allocated_committee} | Portfolio: ${d.allocated_portfolio}`);
      console.log(`  WhatsApp:   ${d.whatsapp_link}`);
      console.log(`  Hub Pass:   ${d.hub_url}`);
      console.log(`  Status:     Ready to send (Validation Passed)\n`);
      sentCount++;
      continue;
    }

    // ── Live Dispatch ───────────────────────────────────────────────
    if (!scriptUrl) {
      console.error('Error: GOOGLE_SCRIPT_MAILER_URL is not configured in .env / .env.local');
      process.exit(1);
    }

    try {
      const payload = {
        recipient: d.email,
        subject,
        htmlBody: personalizedHtml,
        from: 'mun@rnsit.ac.in',
        senderName: 'RNS MUN Secretariat',
        replyTo: 'mun@rnsit.ac.in'
      };

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const resText = await response.text();
      let resJson;
      try { resJson = JSON.parse(resText); } catch (e) { resJson = { raw: resText }; }

      if (response.ok && resJson.success !== false) {
        console.log(`✅ [${i + 1}/${targetQueue.length}] Sent to ${d.email} (${d.name}) — Committee: ${d.allocated_committee}`);
        sentCount++;

        // Update local sent-log
        sentLog[logKey] = {
          sent_at: new Date().toISOString(),
          recipient: d.email,
          name: d.name,
          committee: d.allocated_committee,
          portfolio: d.allocated_portfolio,
          allocId: d.allocId
        };
        writeSentLog(sentLog);

        // Record to Supabase mail_logs if available
        if (supabase) {
          try {
            await supabase.from('mail_logs').insert([{
              recipient: d.email,
              recipient_name: d.name,
              record_type: d.regType.toLowerCase().includes('delegation') ? 'delegation' : 'individual',
              record_id: d.recordId,
              template_id: 'official-pass-caucus',
              template_name: 'Official Pass (QR & WhatsApp Caucus)',
              subject,
              status: 'sent'
            }]);
          } catch (dbErr) {
            console.warn('  (Logged locally, Supabase mail_logs insert skipped)');
          }
        }
      } else {
        console.error(`❌ [${i + 1}/${targetQueue.length}] Failed for ${d.email}:`, resJson.error || resText);
        failCount++;
      }

      // Small throttling delay to protect provider quota
      await new Promise(r => setTimeout(r, delayMs));

    } catch (sendErr) {
      console.error(`❌ Network error dispatching to ${d.email}:`, sendErr.message);
      failCount++;
    }
  }

  console.log('\n===============================================================');
  console.log('                      DISPATCH SUMMARY                         ');
  console.log('===============================================================');
  console.log(`Processed:            ${targetQueue.length}`);
  console.log(`Successful:           ${sentCount}`);
  console.log(`Skipped (Sent Prior): ${skippedAlreadySent}`);
  console.log(`Failed / Errors:      ${failCount}`);
  if (isDryRun) {
    console.log('\n* Note: This was a DRY RUN. Zero emails were sent.');
    console.log('* To perform real dispatch, verify and run with --live.');
  }
}

runDispatch().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
