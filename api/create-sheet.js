import { google } from 'googleapis';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

    // RNS MUN 26 Headers
    const headers = isInternal
      ? [
          'Sl No',
          'Name',
          'USN',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3'
        ]
      : [
          'Sl No',
          'Name',
          'Institution',
          'USN',
          'Committee Preference 1',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3',
          'Committee Preference 2',
          'Portfolio Preference 1',
          'Portfolio Preference 2',
          'Portfolio Preference 3'
        ];

    const title = `RNS MUN 26 - ${delegationName.trim()} Roster`;

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
      console.warn('[INFO] GOOGLE_SERVICE_ACCOUNT not configured in environment. Using fallback Google Sheets template creation URL.');
      const encodedTitle = encodeURIComponent(title);
      const fallbackUrl = `https://docs.google.com/spreadsheets/create?title=${encodedTitle}`;
      return res.status(200).json({
        success: true,
        sheetUrl: fallbackUrl,
        isFallback: true,
        message: 'Google Service Account credentials not set. Returned Google Sheets template URL.'
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
    const sheetUrl = createResponse.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // 2. Insert Header Row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Delegates Roster!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    });

    // 3. Grant Writer access to anyone with link so delegation head can fill the roster
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'anyone'
        }
      });
    } catch (permError) {
      console.warn('Could not set anyone permission on sheet:', permError.message);
    }

    return res.status(200).json({
      success: true,
      sheetUrl,
      spreadsheetId
    });
  } catch (error) {
    console.error('Error creating Google Sheet:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Google Sheet'
    });
  }
}
