import { supabase } from './_supabase.js';
import fs from 'fs';
import path from 'path';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
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

    const targetUrl = (scriptUrl || getEnv('GOOGLE_SCRIPT_MAILER_URL') || '').trim();

    if (!targetUrl || !targetUrl.startsWith('https://script.google.com/')) {
      return res.status(400).json({
        success: false,
        error: 'Google Apps Script Web App URL is not configured. Please provide a valid script URL starting with https://script.google.com/ in Mail Templates settings.'
      });
    }

    const preparedHtml = htmlBody.replace(/src=["']\/?assets\//g, 'src="https://raw.githubusercontent.com/RNSITMUN/MUN/main/assets/');

    const payload = {
      recipient: recipient.trim(),
      subject: (subject || "Notice from RNS MUN '26").trim(),
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

      return res.status(response.status).json({
        success: false,
        error: errorMsg,
        statusCode: response.status,
        details: responseData
      });
    }

    // ─── Record to Supabase Shared Mail Logs Table ───────────────
    let logWarning = null;
    try {
      if (supabase && responseData.success !== false) {
        const { recipientName, recordType, recordId, templateId, templateName } = req.body || {};
        const safeRecipient = recipient ? recipient.trim() : 'Unknown Recipient';
        const safeName = (recipientName || 'Test / Unregistered').trim();
        
        const { error: insertError } = await supabase.from('mail_logs').insert([{
          recipient: safeRecipient,
          recipient_name: safeName,
          record_type: (recordType || 'system').trim(),
          record_id: recordId ? String(recordId) : null,
          template_id: (templateId || 'custom').trim(),
          template_name: (templateName || 'Custom Email').trim(),
          subject: (subject || "Notice from RNS MUN '26").trim(),
          status: 'sent'
        }]);

        if (insertError) {
          console.warn('⚠️ [send-mail] Supabase insert error:', insertError.message);
          logWarning = 'Email sent but failed to log to history';
        }
      }
    } catch (dbErr) {
      console.warn('⚠️ [send-mail] Non-blocking error writing to mail_logs:', dbErr.message);
      logWarning = 'Email sent but failed to log to history';
    }

    const responsePayload = {
      success: responseData.success !== false,
      message: responseData.message || 'Email successfully sent via Google Apps Script.',
      details: responseData
    };
    if (logWarning) {
      responsePayload.logWarning = logWarning;
    }

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('Error forwarding to Google Apps Script:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error while communicating with email dispatch service.'
    });
  }
}
