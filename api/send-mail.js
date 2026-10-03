import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';
import { getPublicToken } from '../lib/token.js';
import {
  createMailLogEntry,
  updateMailLogEntry,
  checkAlreadySent
} from '../lib/mail-logger.js';
import adminMailLogHandler from '../lib/admin-mail-log.js';
import { privilegedSupabase } from '../lib/mail-logger.js';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envPaths = ['.env.local', '.env'];
    for (const file of envPaths) {
      const fullPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const k = trimmed.substring(0, eqIdx).trim();
          let v = trimmed.substring(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length - 1);
          }
          process.env[k] = v;
          if (k === key) return v;
        }
      }
    }
  } catch (e) {
    // silent catch
  }
  return process.env[key] || '';
}

const COMMITTEE_WHATSAPP_MAP = {
  'UNSC': 'https://chat.whatsapp.com/LSB4bvcexqoK3JkmQyYqCx',
  'LOK SABHA': 'https://chat.whatsapp.com/BA9IXk3MU8c6oEH69noPf5',
  'UNODC': 'https://chat.whatsapp.com/IcgBAXEcbO8F9UCf0DiFJm',
  'UNHRC': 'https://chat.whatsapp.com/Kqgvxt2yVwsGGDcWAaC1sC',
  'IPC': 'https://chat.whatsapp.com/Id2vun9PhQhGlRFTQZKoZm',
  'DISEC': 'https://chat.whatsapp.com/ChdeFdrcg0U88lUuaMLrI2'
};

function resolveCommitteeWhatsApp(committee) {
  if (!committee) return 'https://chat.whatsapp.com/G5y1o155s6y9017';
  const c = String(committee).toUpperCase();
  if (c.includes('UNSC') || c.includes('SECURITY')) return COMMITTEE_WHATSAPP_MAP['UNSC'];
  if (c.includes('LOK') || c.includes('SABHA') || c.includes('PARLIAMENT')) return COMMITTEE_WHATSAPP_MAP['LOK SABHA'];
  if (c.includes('UNODC') || c.includes('DRUGS')) return COMMITTEE_WHATSAPP_MAP['UNODC'];
  if (c.includes('UNHRC') || c.includes('HUMAN')) return COMMITTEE_WHATSAPP_MAP['UNHRC'];
  if (c.includes('IPC') || c.includes('PRESS') || c.includes('IP')) return COMMITTEE_WHATSAPP_MAP['IPC'];
  if (c.includes('DISEC') || c.includes('DISARMAMENT')) return COMMITTEE_WHATSAPP_MAP['DISEC'];
  return 'https://chat.whatsapp.com/G5y1o155s6y9017';
}

// ── Shared cloud mail log (Supabase `mail_logs`) ─────────────────────────────
// Single source of truth read by every device. One row per attempt: inserted as 'queued',
// then updated in place to 'sent' / 'failed' so status changes propagate (realtime + polling).
// NOTE: Supabase query builders are thenables without .catch(); always await and read { error }.
const logDb = () => privilegedSupabase || supabase;
const OPTIONAL_LOG_COLS = ['error', 'updated_at', 'attempts'];
const isMissingCol = (err) => err && (err.code === '42703' || err.code === 'PGRST204' || /column/i.test(err.message || ''));

async function sharedLogCreate(row) {
  const db = logDb();
  if (!db) return { id: null, error: 'Supabase client is not configured' };
  try {
    let { data, error } = await db.from('mail_logs').insert([row]).select('id').single();
    if (error && isMissingCol(error)) {
      const slim = { ...row }; OPTIONAL_LOG_COLS.forEach(c => delete slim[c]);
      ({ data, error } = await db.from('mail_logs').insert([slim]).select('id').single());
    }
    return { id: data?.id ?? null, error: error ? error.message : null };
  } catch (e) {
    return { id: null, error: e.message || 'Unknown logging error' };
  }
}

async function sharedLogUpdate(id, patch) {
  const db = logDb();
  if (!db || id === null || id === undefined) return 'no log row to update';
  try {
    let { error } = await db.from('mail_logs').update(patch).eq('id', id);
    if (error && isMissingCol(error)) {
      const slim = { ...patch }; OPTIONAL_LOG_COLS.forEach(c => delete slim[c]);
      ({ error } = await db.from('mail_logs').update(slim).eq('id', id));
    }
    return error ? error.message : null;
  } catch (e) {
    return e.message || 'Unknown logging error';
  }
}

// Cluster-wide duplicate guard (reads the shared table, not a per-instance /tmp file).
// A mail is a duplicate only if the SAME template was already sent to this person for this record;
// sending a different template (e.g. WhatsApp reminder after the pass) is a new mail, never "skipped".
async function sharedAlreadySent(email, registrationId, templateId) {
  const db = logDb();
  if (!db || !email) return false;
  try {
    let q = db.from('mail_logs').select('id').ilike('recipient', String(email).trim()).eq('status', 'sent');
    if (registrationId) q = q.eq('record_id', String(registrationId));
    if (templateId) q = q.eq('template_id', String(templateId));
    const { data, error } = await q.limit(1);
    return !error && Array.isArray(data) && data.length > 0;
  } catch (e) { return false; }
}

// Turn raw Apps Script / Gmail errors into something an admin can act on.
function explainMailError(raw) {
  const msg = String(raw || '').trim();
  if (/too many times|quota|limit exceeded|daily/i.test(msg)) {
    return 'Gmail daily sending quota reached for the mailer account (about 100 recipients/day on a free @gmail.com account, 1,500 on Google Workspace). It resets ~24h after the first send. Original: ' + msg;
  }
  if (/lock/i.test(msg)) return 'Mail service was busy (another send held the lock). Safe to retry. Original: ' + msg;
  if (/authorization|permission|not authorized/i.test(msg)) return 'Mail service needs authorization: re-deploy the Apps Script web app and approve access. Original: ' + msg;
  return msg || 'Mail service reported failure';
}
const isRetryable = (status, msg) => status === 429 || status === 503 || /lock/i.test(String(msg || '')) && !/quota|too many times/i.test(String(msg || ''));

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://mun.rnsit.ac.in',
    'https://www.mun.rnsit.ac.in',
    'https://mun-rose.vercel.app',
    'https://mun-rnsit.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ];

  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.rnsit.ac.in');

  if (!isAllowed) {
    return res.status(403).json({ success: false, error: 'Access forbidden: unauthorized origin.' });
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Dispatch to Admin Mail Log handler if applicable ──────────────
  const url = req.url || '';
  if (
    url.includes('admin-mail-log') ||
    req.method === 'GET' ||
    req.body?.action === 'backfill_local' ||
    req.body?.action === 'resend' ||
    req.body?.action === 'retry_all_failed'
  ) {
    return adminMailLogHandler(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST supported.' });
  }

  try {
    const { recipient, subject, htmlBody, attachments, senderName, replyTo, scriptUrl } = req.body || {};

    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid recipient email is required.' });
    }

    if (!htmlBody) {
      return res.status(400).json({ success: false, error: 'Email content (htmlBody) is required.' });
    }

    // ── Idempotency Check ───────────────────────────────────────────
    const { isResend, recordId, recordType = 'individual', memberIndex, member_index, allocated_committee, allocated_portfolio, recipientName, bg_guide_url, institution, delegateType, type, batchId, whatsapp_link, allocationId } = req.body || {};
    // Delegation members are logged/deduplicated per person (e.g. DEL-47-04), not per delegation,
    // so mailing the head never blocks mailing the rest of the delegation (and vice versa).
    const memberLogId = (String(recordType || '').toLowerCase() === 'delegation' && /^DEL-\d+-\d{2,}$/.test(String(allocationId || '')))
      ? String(allocationId)
      : null;
    const logRegistrationId = memberLogId || (recordId ? String(recordId) : null);
    const { templateId: bodyTemplateId, templateName: bodyTemplateName } = req.body || {};
    let sharedLogId = null;
    // One shared-log row per attempt: first call inserts it, later calls update its status in place.
    const logAttempt = async (status, errMsg, subj) => {
      const finalSubject = String(subj || subject || "Notice from RNS MUN '26").trim();
      const now = new Date().toISOString();
      if (sharedLogId === null) {
        const { id, error } = await sharedLogCreate({
          recipient: recipient.trim(),
          recipient_name: (recipientName || 'Test / Unregistered').trim(),
          record_type: String(recordType || 'system').trim(),
          record_id: logRegistrationId,
          template_id: String(bodyTemplateId || 'custom').trim(),
          template_name: String(bodyTemplateName || 'Custom Email').trim(),
          subject: finalSubject,
          status,
          error: errMsg ? String(errMsg).slice(0, 500) : null,
          attempts: 1,
          updated_at: now
        });
        if (id !== null) sharedLogId = id;
        return error;
      }
      return sharedLogUpdate(sharedLogId, {
        status,
        subject: finalSubject,
        error: errMsg ? String(errMsg).slice(0, 500) : null,
        updated_at: now
      });
    };
    if (!isResend && logRegistrationId && recipient) {
      const alreadySent = await sharedAlreadySent(recipient, logRegistrationId, bodyTemplateId);
      if (alreadySent) {
        // Nothing was attempted, so no log row is written: the original 'sent' row already records this mail.
        return res.status(200).json({
          success: true,
          skipped: true,
          message: `"${bodyTemplateName || 'This template'}" was already sent to ${recipient} for ID #${logRegistrationId}. Use Resend to send it again, or pick a different template.`
        });
      }
    }

    const targetUrl = (scriptUrl || getEnv('GOOGLE_SCRIPT_MAILER_URL') || '').trim();

    if (!targetUrl || !targetUrl.startsWith('https://script.google.com/')) {
      await logAttempt('failed', 'Google Apps Script URL not configured');
      return res.status(400).json({
        success: false,
        error: 'Google Apps Script Web App URL is not configured. Please provide a valid script URL starting with https://script.google.com/ in Mail Templates settings.'
      });
    }

    const publicAssetBase = 'https://mun.rnsit.ac.in/assets/';
    let preparedHtml = htmlBody
      .replace(/src=["'](?:https?:\/\/[^\/]+)?\/?assets\//gi, `src="${publicAssetBase}`)
      .replace(/src=["']https:\/\/raw\.githubusercontent\.com\/RNSITMUN\/MUN\/main\/assets\//gi, `src="${publicAssetBase}`);

    const driveUrl = bg_guide_url || 'https://drive.google.com/drive/folders/1B7PFiz_J2mTs0U__33MRS_Y5BMcsVsWY';
    
    let preparedSubject = (subject || "Notice from RNS MUN '26").trim();

    preparedHtml = preparedHtml
      .replace(/\{\{bg_guide_url\}\}/g, driveUrl)
      .replace(/\{\{background_guide_url\}\}/g, driveUrl)
      .replace(/\{\{gdrive_link\}\}/g, driveUrl);

    if (allocated_committee) {
      preparedHtml = preparedHtml
        .replace(/\{\{allocated_committee\}\}/g, allocated_committee)
        .replace(/\{\{committee\}\}/g, allocated_committee);
      preparedSubject = preparedSubject
        .replace(/\{\{allocated_committee\}\}/g, allocated_committee)
        .replace(/\{\{committee\}\}/g, allocated_committee);

      const waLink = resolveCommitteeWhatsApp(allocated_committee);
      preparedHtml = preparedHtml
        .replace(/\{\{whatsapp_link\}\}/g, waLink)
        .replace(/\{\{committee_whatsapp\}\}/g, waLink)
        .replace(/\{\{whatsapp_url\}\}/g, waLink)
        // Enforce that any committee caucus link in the mail points strictly to this delegate's assigned committee group
        .replace(/https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+/g, waLink);
    }

    if (allocated_portfolio) {
      preparedHtml = preparedHtml
        .replace(/\{\{allocated_portfolio\}\}/g, allocated_portfolio)
        .replace(/\{\{portfolio\}\}/g, allocated_portfolio);
      preparedSubject = preparedSubject
        .replace(/\{\{allocated_portfolio\}\}/g, allocated_portfolio)
        .replace(/\{\{portfolio\}\}/g, allocated_portfolio);
    }

    if (recipientName) {
      preparedHtml = preparedHtml.replace(/\{\{name\}\}/g, recipientName);
      preparedSubject = preparedSubject.replace(/\{\{name\}\}/g, recipientName);
    }

    if (institution) {
      preparedHtml = preparedHtml.replace(/\{\{institution\}\}/g, institution);
    }

    const safeType = type || delegateType || (String(recordType || '').toLowerCase() === 'delegation' ? 'Delegation' : 'Individual');
    preparedHtml = preparedHtml.replace(/\{\{type\}\}/g, safeType);

    if (recordId) {
      try {
        const cleanRecType = String(recordType || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';
        const pubToken = getPublicToken(cleanRecType, recordId);
        const mIdx = memberIndex !== undefined ? memberIndex : (member_index !== undefined ? member_index : null);
        const mSuffix = (cleanRecType === 'delegation' && mIdx !== null && mIdx !== undefined && mIdx !== '') ? `&m=${encodeURIComponent(mIdx)}` : '';
        const secureHubUrl = `https://mun.rnsit.ac.in/hub?t=${encodeURIComponent(pubToken)}${mSuffix}`;
        const secureQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(secureHubUrl)}`;
        const paddedId = String(recordId).padStart(4, '0');

        preparedSubject = preparedSubject
          .replace(/\{\{registration_id\}\}/g, paddedId)
          .replace(/#RNSMUN-26-(?:\{\{registration_id\}\}|REG-[a-zA-Z0-9_-]+|\d+)/g, `#RNSMUN-26-${paddedId}`);

        preparedHtml = preparedHtml
          // 1. Literal token replacements
          .replace(/\{\{public_token\}\}/g, pubToken)
          .replace(/\{\{hub_url\}\}/g, secureHubUrl)
          .replace(/\{\{qr_code_url\}\}/g, secureQrUrl)
          .replace(/\{\{registration_id\}\}/g, paddedId)
          // 2. Standardize credential pass ID header
          .replace(/#RNSMUN-26-(?:\{\{registration_id\}\}|REG-[a-zA-Z0-9_-]+|\d+)/g, `#RNSMUN-26-${paddedId}`)
          // 3. Replace any QR code image URLs pointing to any hub URL with the recipient's own QR code URL
          .replace(/https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?size=\d+x\d+&(?:amp;)?data=(?:https%3A%2F%2F|http%3A%2F%2F)[^"'\s<>]+/g, secureQrUrl)
          // 4. Replace any onerror fallback on QR images with the recipient's own QR code URL
          .replace(/onerror="this\.onerror=null;this\.src='https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/\?[^']+'(?:\s*\+\s*encodeURIComponent\('[^']+'\))?;?"/g, `onerror="this.onerror=null;this.src='${secureQrUrl}';"`)
          // 5. Replace any existing hub URLs (dev, vercel, production, with ?t= or ?id=) with the recipient's own secureHubUrl
          .replace(/https?:\/\/(?:mun\.rnsit\.ac\.in|localhost:\d+|127\.0\.0\.1:\d+|mun[a-zA-Z0-9-]*\.vercel\.app)\/hub\?(?:t=[a-zA-Z0-9_-]+|id=[^"'&<>\s]+(?:&amp;|&)type=[^"'&<>\s]+)/g, secureHubUrl);
      } catch (e) {
        console.warn('[send-mail] Token injection error:', e.message);
      }
    }

    // ── Log 'queued' status before dispatch ──────────────────────────
    let mailLogRecord = null;
    try {
      mailLogRecord = await createMailLogEntry({
        batchId: batchId || null,
        registrationId: logRegistrationId,
        delegateName: recipientName || null,
        recipientEmail: recipient.trim(),
        delegation: req.body.delegation || institution || null,
        committee: allocated_committee || null,
        whatsappLink: whatsapp_link || (allocated_committee ? resolveCommitteeWhatsApp(allocated_committee) : null),
        subject: preparedSubject,
        status: 'queued',
        attempts: 1
      });
    } catch (e) {
      console.warn('[send-mail] Could not create queued log row:', e.message);
    }

    // 'queued' only when we can update the row afterwards (service role); otherwise a single final row is written.
    if (privilegedSupabase) await logAttempt('queued', null, preparedSubject);

    const payload = {
      recipient: recipient.trim(),
      subject: preparedSubject,
      htmlBody: preparedHtml,
      from: 'mun@rnsit.ac.in',
      senderName: senderName || 'RNS MUN Secretariat',
      replyTo: replyTo || 'mun@rnsit.ac.in',
      attachments: Array.isArray(attachments) ? attachments : []
    };

    // Call Apps Script; retry only when it is clearly safe (lock contention / 429 / 503), never after a quota error.
    let response, responseText, responseData;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8' // Google Apps Script handles text/plain without triggering complex CORS preflights
          },
          body: JSON.stringify(payload),
          redirect: 'follow'
        });
      } catch (netErr) {
        const m = `Could not reach mail service: ${netErr.message}`;
        if (mailLogRecord) await updateMailLogEntry(mailLogRecord.id, { status: 'failed', error: m });
        await logAttempt('failed', m, preparedSubject);
        return res.status(502).json({ success: false, error: m });
      }
      responseText = await response.text();
      try { responseData = JSON.parse(responseText); } catch (e) { responseData = { rawResponse: responseText }; }
      const errText = responseData.error || responseData.message || '';
      if (attempt < MAX_ATTEMPTS && isRetryable(response.status, errText) && (!response.ok || responseData.success === false)) {
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      break;
    }

    if (!response.ok) {
      let errorMsg = responseData.error || `Google Apps Script returned status ${response.status}`;
      
      if (response.status === 401) {
        errorMsg = 'Google Apps Script 401 Unauthorized: In Google Apps Script, click "Deploy" -> "Manage deployments" -> Edit (pencil) -> Set "Who has access" to "Anyone" (not "Only myself"), then click "Deploy" and Authorize access.';
      } else if (response.status === 404) {
        errorMsg = 'Google Apps Script 404 Not Found: Check that your Web App URL ends with /exec and that the deployment is active in Google Apps Script.';
      } else {
        errorMsg = explainMailError(errorMsg);
      }

      if (mailLogRecord) {
        await updateMailLogEntry(mailLogRecord.id, { status: 'failed', error: errorMsg });
      }
      await logAttempt('failed', errorMsg, preparedSubject);
      return res.status(response.status).json({ success: false, error: errorMsg, statusCode: response.status, details: responseData });
    }

    // Only an explicit { success: true } from Apps Script counts as sent. An HTML page (quota/login) or a
    // JSON body without success:true is NOT proof of delivery.
    if (responseData.success !== true) {
      const raw = responseData.error || responseData.message || (responseData.rawResponse ? 'Unexpected non-JSON reply from mail service: ' + String(responseData.rawResponse).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : 'Mail service reported failure');
      const scriptErr = explainMailError(raw);
      if (mailLogRecord) await updateMailLogEntry(mailLogRecord.id, { status: 'failed', error: scriptErr });
      await logAttempt('failed', scriptErr, preparedSubject);
      return res.status(502).json({ success: false, error: scriptErr, details: responseData });
    }

    // ── Update mail_log record to 'sent' ───────────────────────────
    if (mailLogRecord) {
      await updateMailLogEntry(mailLogRecord.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
        error: null,
        provider_message_id: responseData.messageId || responseData.id || null
      });
    }

    // ─── Record to shared cloud log (mail_logs) so it syncs across devices ───
    const logWarning = await logAttempt('sent', null, preparedSubject);
    if (logWarning) console.warn('[send-mail] Shared mail log write failed:', logWarning);

    const responsePayload = {
      success: responseData.success !== false,
      message: responseData.message || 'Email successfully sent via Google Apps Script.',
      details: responseData,
      mailLogId: mailLogRecord?.id,
      sharedLogId,
      logWarning: logWarning || undefined
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('Error forwarding to Google Apps Script:', error);
    try {
      const b = req.body || {};
      if (b.recipient && String(b.recipient).includes('@')) {
        await sharedLogCreate({
          recipient: String(b.recipient).trim(),
          recipient_name: String(b.recipientName || 'Test / Unregistered').trim(),
          record_type: String(b.recordType || 'system').trim(),
          record_id: b.allocationId || (b.recordId ? String(b.recordId) : null),
          template_id: String(b.templateId || 'custom').trim(),
          template_name: String(b.templateName || 'Custom Email').trim(),
          subject: String(b.subject || "Notice from RNS MUN '26").trim(),
          status: 'failed',
          error: String(error.message).slice(0, 500),
          attempts: 1,
          updated_at: new Date().toISOString()
        });
      }
    } catch (_) {}
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error while communicating with email dispatch service.'
    });
  }
}
