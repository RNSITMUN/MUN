import { google } from 'googleapis';

export default async function handler(req, res) {
  // CORS & Origin Validation Security Check
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://mun-rnsit.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is supported.' });
  }

  try {
    const { delegationName, delegationType, headName, email, phone } = req.body || {};

    if (!delegationName || !delegationName.trim()) {
      return res.status(400).json({ success: false, error: 'Delegation Name is required.' });
    }

    const isInternal = (delegationType || '').toLowerCase() === 'internal';

    // RNS MUN 26 Official Standard Headers (with Email & WhatsApp)
    const headers = isInternal
      ? [
          'Sl No',
          'Delegate Name',
          'Email Address',
          'WhatsApp / Mobile Number',
          'USN / Roll No',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Comm 2 - Portfolio Preference 1',
          'Comm 2 - Portfolio Preference 2',
          'Comm 2 - Portfolio Preference 3'
        ]
      : [
          'Sl No',
          'Delegate Name',
          'Email Address',
          'WhatsApp / Mobile Number',
          'Institution / College Name',
          'USN / Roll No',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Comm 2 - Portfolio Preference 1',
          'Comm 2 - Portfolio Preference 2',
          'Comm 2 - Portfolio Preference 3'
        ];

    // Prepare Row 2: Pre-fill Head of Delegation Name, Email, and Phone!
    const headRow = isInternal
      ? [
          '1',
          headName ? `${headName.trim()} (Head of Delegation)` : 'Head of Delegation',
          email ? email.trim() : '',
          phone ? phone.trim() : '',
          '', // USN / Roll No (blank for user)
          '', // Committee Preference 1
          '', // Portfolio Preference 1
          '', // Portfolio Preference 2
          '', // Portfolio Preference 3
          '', // Committee Preference 2
          '', // Comm 2 - Portfolio Preference 1
          '', // Comm 2 - Portfolio Preference 2
          ''  // Comm 2 - Portfolio Preference 3
        ]
      : [
          '1',
          headName ? `${headName.trim()} (Head of Delegation)` : 'Head of Delegation',
          email ? email.trim() : '',
          phone ? phone.trim() : '',
          delegationName ? delegationName.trim() : '',
          '', // USN / Roll No (blank for user)
          '', // Committee Preference 1
          '', // Portfolio Preference 1
          '', // Portfolio Preference 2
          '', // Portfolio Preference 3
          '', // Committee Preference 2
          '', // Comm 2 - Portfolio Preference 1
          '', // Comm 2 - Portfolio Preference 2
          ''  // Comm 2 - Portfolio Preference 3
        ];

    const title = `RNS MUN 26 - ${delegationName.trim()} Roster`;

    // 1. Google Apps Script Webhook URL
    const gasEndpoint = process.env.GOOGLE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxE1kr1fAjSP4JiNyRQYu-JU9vMk61chP6YGX_rG2n-5M7iTMz4oE1UJpsIfN5d5f1VRw/exec';
    if (gasEndpoint) {
      try {
        const gasResponse = await fetch(gasEndpoint, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            delegationName,
            delegationType,
            headName,
            email,
            phone,
            headers,
            headRow,
            ownerEmail: 'mun@rnsit.ac.in'
          })
        });
        const rawText = await gasResponse.text();
        try {
          const gasData = JSON.parse(rawText);
          if (gasData && gasData.sheetUrl) {
            return res.status(200).json({
              success: true,
              sheetUrl: gasData.sheetUrl,
              headers,
              headRow
            });
          }
        } catch (jsonErr) {
          console.warn('Google Apps Script returned HTML instead of JSON. Ensure "Who has access" is set to "Anyone" in Apps Script deployment.');
        }
      } catch (gasErr) {
        console.warn('Google Apps Script proxy notice:', gasErr.message);
      }
    }

    // Parse Google Credentials from process.env.GOOGLE_SERVICE_ACCOUNT or individual vars
    let credentials = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        credentials = typeof process.env.GOOGLE_SERVICE_ACCOUNT === 'string'
          ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
          : process.env.GOOGLE_SERVICE_ACCOUNT;
      } catch (err) {
        console.error('Error parsing GOOGLE_SERVICE_ACCOUNT JSON:', err);
      }
    } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_PROJECT_ID
      };
    }

    // Graceful fallback for local development or until env credentials are provided
    if (!credentials) {
      console.warn('[INFO] GOOGLE_SERVICE_ACCOUNT not configured. Returning formatted client template & copy payload for mun@rnsit.ac.in.');
      const encodedTitle = encodeURIComponent(title);
      const fallbackUrl = `https://docs.google.com/spreadsheets/create?title=${encodedTitle}`;
      return res.status(200).json({
        success: true,
        sheetUrl: fallbackUrl,
        headers,
        headRow,
        isFallback: true,
        message: 'Google Sheet payload ready. Row 1 (Headers) and Row 2 (Head of Delegation) generated.'
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Create Spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title
        },
        sheets: [
          {
            properties: {
              title: 'Delegates Roster',
              gridProperties: {
                rowCount: 100,
                columnCount: headers.length,
                frozenRowCount: 1
              }
            }
          }
        ]
      }
    });

    const spreadsheetId = createResponse.data.spreadsheetId;
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;

    // 2. Insert Header Row (Row 1) and Head of Delegation (Row 2) + numbered rows (3..18)
    const rows = [
      headers,
      headRow
    ];
    for (let i = 2; i <= 18; i++) {
      rows.push([`${i}`, '', '', '', '', '', '', '', '', '', '']);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Delegates Roster!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows
      }
    });

    // 3. Grant Writer (Edit Access) directly to the User / Delegation Head's email
    if (email && email.trim() && /^\S+@\S+\.\S+$/.test(email.trim())) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          sendNotificationEmail: false,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: email.trim()
          }
        });
      } catch (userPermErr) {
        console.warn('Could not share edit permission directly with user email:', userPermErr.message);
      }
    }

    // 4. Grant Editor permission to mun@rnsit.ac.in so organizing committee retains access
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: 'mun@rnsit.ac.in'
        }
      });
    } catch (munErr) {
      console.warn('Could not share with mun@rnsit.ac.in:', munErr.message);
    }

    // 5. Grant Writer access to anyone with link (ensures seamless edit access for all delegation members)
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'anyone',
          allowFileDiscovery: false
        }
      });
    } catch (permError) {
      console.warn('Could not set anyone edit permission on sheet:', permError.message);
    }

    return res.status(200).json({
      success: true,
      sheetUrl,
      spreadsheetId,
      headers,
      headRow
    });
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Google Sheet'
    });
  }
}
