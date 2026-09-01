import { google } from 'googleapis';

export default async function handler(req, res) {
  // CORS & Origin Validation Security Check
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  const emailRaw =
    req.method === 'GET'
      ? req.query?.email || ''
      : (req.body?.email || '');

  const email = String(emailRaw).trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(200).json({ success: true, exists: false, message: 'Invalid or empty email' });
  }

  // Parse Google Credentials if available
  let credentials = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      credentials =
        typeof process.env.GOOGLE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
          : process.env.GOOGLE_SERVICE_ACCOUNT;
    } catch (e) {
      console.error('[check-email] Error parsing GOOGLE_SERVICE_ACCOUNT:', e);
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });
      const sheets = google.sheets({ version: 'v4', auth });

      let duplicateFound = false;
      let existingSheetUrl = null;

      // 1. Column H is Email in Registrations sheet
      try {
        const checkRes = await sheets.spreadsheets.values.get({
          spreadsheetId: masterSheetId,
          range: 'Registrations!H:H'
        });
        const rows = checkRes.data.values || [];
        duplicateFound = rows.some(
          r => r[0] && String(r[0]).trim().toLowerCase() === email
        );
      } catch (regErr) {
        console.warn('[check-email] Registrations sheet check warning:', regErr.message);
      }

      // 2. Check Google Drive for active delegation roster sheet
      try {
        const drive = google.drive({ version: 'v3', auth });
        const existingList = await drive.files.list({
          q: `'${email}' in writers and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
          fields: 'files(id, name, webViewLink)',
          pageSize: 5
        });
        const existingSheet = existingList.data.files?.find(f => f.name && f.name.includes('RNS MUN 26'));
        if (existingSheet && existingSheet.id) {
          existingSheetUrl = `https://docs.google.com/spreadsheets/d/${existingSheet.id}/edit?usp=sharing`;
          duplicateFound = true;
        }
      } catch (driveErr) {
        console.warn('[check-email] Drive search warning:', driveErr.message);
      }

      // 3. Check Delegations sheet for delegation email & sheetUrl
      try {
        const dlgRes = await sheets.spreadsheets.values.get({
          spreadsheetId: masterSheetId,
          range: 'Delegations!A:Z'
        });
        const dlgRows = dlgRes.data.values || [];
        for (const row of dlgRows) {
          const foundIdx = row.findIndex(cell => cell && String(cell).trim().toLowerCase() === email);
          if (foundIdx !== -1) {
            duplicateFound = true;
            const sheetCell = row.find(cell => cell && String(cell).includes('docs.google.com/spreadsheets'));
            if (sheetCell && !existingSheetUrl) {
              existingSheetUrl = String(sheetCell).trim();
            }
            break;
          }
        }
      } catch (dlgErr) {
        // Tab might not exist, silently proceed
      }

      return res.status(200).json({
        success: true,
        exists: duplicateFound,
        sheetUrl: existingSheetUrl,
        email
      });
    } catch (sheetsErr) {
      console.warn('[check-email] Google Sheets check warning:', sheetsErr.message);
    }
  }

  // ─── Query Google Apps Script Webhook (Fallback) ─────────────
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
        body: JSON.stringify({ action: 'checkEmail', email })
      });
      const rawText = await gasRes.text();
      try {
        const gasData = JSON.parse(rawText);
        if (gasData && typeof gasData.exists === 'boolean') {
          return res.status(200).json({
            success: true,
            exists: gasData.exists,
            type: gasData.type || null,
            sheetUrl: gasData.sheetUrl || null,
            email
          });
        }
      } catch (jsonErr) {}
    } catch (gasErr) {
      console.warn('[check-email] Apps Script check notice:', gasErr.message);
    }
  }

  // Fallback: When no direct lookup configured
  return res.status(200).json({
    success: true,
    exists: false,
    email,
    note: 'No direct sheet lookup configured'
  });
}
