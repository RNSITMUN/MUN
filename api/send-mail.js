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
  'UNSC': 'https://chat.whatsapp.com/JZij2Vt7Vg64qTSFcMNLRh',
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
    const { isResend, recordId, recordType = 'individual', memberIndex, member_index, allocated_committee, allocated_portfolio, recipientName, bg_guide_url, institution, delegateType, type, batchId, whatsapp_link } = req.body || {};
    if (!isResend && recordId && recipient) {
      const alreadySent = await checkAlreadySent(recipient, recordId);
      if (alreadySent) {
        return res.status(200).json({
          success: true,
          skipped: true,
          message: `Notice already sent to ${recipient} for ID #${recordId}. Use Resend to override.`
        });
      }
    }

    const targetUrl = (scriptUrl || getEnv('GOOGLE_SCRIPT_MAILER_URL') || '').trim();

    if (!targetUrl || !targetUrl.startsWith('https://script.google.com/')) {
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
        registrationId: recordId ? String(recordId) : null,
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

    const payload = {
      recipient: recipient.trim(),
      subject: preparedSubject,
      htmlBody: preparedHtml,
      from: 'mun@rnsit.ac.in',
      senderName: senderName || 'RNS MUN Secretariat',
      replyTo: replyTo || 'mun@rnsit.ac.in',
      attachments: Array.isArray(attachments) ? attachments : []
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Google Apps Script handles text/plain without triggering complex CORS preflights
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    if (!response.ok) {
      let errorMsg = responseData.error || `Google Apps Script returned status ${response.status}`;
      
      if (response.status === 401) {
        errorMsg = 'Google Apps Script 401 Unauthorized: In Google Apps Script, click "Deploy" -> "Manage deployments" -> Edit (pencil) -> Set "Who has access" to "Anyone" (not "Only myself"), then click "Deploy" and Authorize access.';
      } else if (response.status === 404) {
        errorMsg = 'Google Apps Script 404 Not Found: Check that your Web App URL ends with /exec and that the deployment is active in Google Apps Script.';
      }

      if (mailLogRecord) {
        await updateMailLogEntry(mailLogRecord.id, {
          status: 'failed',
          error: errorMsg
        });
      }

      return res.status(response.status).json({
        success: false,
        error: errorMsg,
        statusCode: response.status,
        details: responseData
      });
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

    // ─── Record to Legacy Supabase Shared Mail Logs Table ────────────
    let logWarning = null;
    try {
      if (supabase && responseData.success !== false) {
        const { templateId, templateName } = req.body || {};
        const safeRecipient = recipient ? recipient.trim() : 'Unknown Recipient';
        const safeName = (recipientName || 'Test / Unregistered').trim();
        
        await supabase.from('mail_logs').insert([{
          recipient: safeRecipient,
          recipient_name: safeName,
          record_type: (recordType || 'system').trim(),
          record_id: recordId ? String(recordId) : null,
          template_id: (templateId || 'custom').trim(),
          template_name: (templateName || 'Custom Email').trim(),
          subject: (subject || "Notice from RNS MUN '26").trim(),
          status: 'sent'
        }]).catch(() => {});
      }
    } catch (dbErr) {
      // non-blocking
    }

    const responsePayload = {
      success: responseData.success !== false,
      message: responseData.message || 'Email successfully sent via Google Apps Script.',
      details: responseData,
      mailLogId: mailLogRecord?.id
    };

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('Error forwarding to Google Apps Script:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error while communicating with email dispatch service.'
    });
  }
}
