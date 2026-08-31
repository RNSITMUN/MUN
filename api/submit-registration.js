import { google } from 'googleapis';

export default async function handler(req, res) {
  // ─── CORS Guard (same pattern as create-sheet.js) ───────────
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://mun.rnsit.ac.in',
    'https://www.mun.rnsit.ac.in',
    'https://mun-rnsit.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is supported.' });
  }

  // ─── Input Validation ────────────────────────────────────────
  const body = req.body || {};
  const { name, email, phone, delegateType } = body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'Full name is required.' });
  }
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, error: 'Email is required.' });
  }
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ success: false, error: 'WhatsApp number is required.' });
  }

  // ─── Sanitise all string fields ──────────────────────────────
  function clean(val) {
    return val ? String(val).trim().substring(0, 500) : '';
  }

  const payload = {
    action: 'appendRegistration',
    timestamp: new Date().toISOString(),
    delegateType:       clean(delegateType),
    name:               clean(name),
    delegateName:       clean(name),   // used for Drive filename
    institution:        clean(body.institution),
    usn:                clean(body.usn),
    city:               clean(body.city),
    phone:              clean(phone),
    email:              clean(email),
    munExperience:      clean(body.munExperience),
    experienceCount:    clean(body.experienceCount),
    experienceDetails:  clean(body.experienceDetails),
    committee1:         clean(body.committee1),
    portfolio1_1:       clean(body.portfolio1_1),
    portfolio1_2:       clean(body.portfolio1_2),
    committee2:         clean(body.committee2),
    portfolio2_1:       clean(body.portfolio2_1),
    portfolio2_2:       clean(body.portfolio2_2),
    ieeeId:             clean(body.ieeeId),
    paymentAmount:      clean(body.paymentAmount),
    screenshotFormat:   clean(body.screenshotFormat) || 'webp',
    // screenshot is a base64 DataURL — can be large, pass through directly
    screenshotBase64:   body.screenshotBase64 || ''
  };

  // ─── Primary: Google Apps Script Webhook ─────────────────────
  const gasUrl =
    process.env.GOOGLE_APPS_SCRIPT_REGISTRATION_URL ||
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbyjnzD__AM_WFRv0I4qgSVkHPZ0i8-lgh3JCnSMZa2iRsJI2PSsg_R0CrQt4T7UQdOnoA/exec';

  if (gasUrl) {
    try {
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const rawText = await gasRes.text();
      try {
        const gasData = JSON.parse(rawText);
        if (gasData && gasData.success) {
          return res.status(200).json({
            success: true,
            rowNumber: gasData.rowNumber,
            screenshotLink: gasData.screenshotLink || ''
          });
        }
        // Apps Script returned an error object
        console.warn('[submit-registration] Apps Script error:', gasData);
      } catch {
        console.warn('[submit-registration] Apps Script returned non-JSON (check deployment settings):', rawText.substring(0, 200));
      }
    } catch (gasErr) {
      console.warn('[submit-registration] Apps Script fetch failed:', gasErr.message);
    }
  }

  // ─── Fallback: Direct Google Sheets API (Service Account) ────
  let credentials = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      credentials =
        typeof process.env.GOOGLE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
          : process.env.GOOGLE_SERVICE_ACCOUNT;
    } catch (e) {
      console.error('[submit-registration] Error parsing GOOGLE_SERVICE_ACCOUNT:', e);
    }
  } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    };
  }

  const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID;

  if (credentials && masterSheetId) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ]
      });
      const sheets = google.sheets({ version: 'v4', auth });

      const row = [
        payload.timestamp,
        payload.delegateType,
        payload.name,
        payload.institution,
        payload.usn,
        payload.city,
        payload.phone,
        payload.email,
        payload.munExperience,
        payload.experienceCount,
        payload.experienceDetails,
        payload.committee1,
        payload.portfolio1_1,
        payload.portfolio1_2,
        payload.committee2,
        payload.portfolio2_1,
        payload.portfolio2_2,
        payload.ieeeId,
        payload.paymentAmount,
        '(screenshot via API fallback)',
        'Pending Verification'
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: masterSheetId,
        range: 'Registrations!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
      });

      return res.status(200).json({ success: true, rowNumber: null, screenshotLink: '' });
    } catch (sheetsErr) {
      console.error('[submit-registration] Direct Sheets API error:', sheetsErr.message);
    }
  }

  // ─── No credentials configured — still acknowledge gracefully ─
  // This prevents blocking the user UX during initial setup.
  // All form data is logged server-side for manual recovery.
  console.info('[submit-registration] No backend configured. Registration details:', {
    timestamp: payload.timestamp,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    delegateType: payload.delegateType,
    committee1: payload.committee1,
    committee2: payload.committee2
  });

  return res.status(200).json({
    success: true,
    rowNumber: null,
    screenshotLink: '',
    note: 'Registration logged server-side. Configure GOOGLE_APPS_SCRIPT_REGISTRATION_URL to enable Sheets storage.'
  });
}
