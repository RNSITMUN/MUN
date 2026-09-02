import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://mun.rnsit.ac.in',
    'https://www.mun.rnsit.ac.in',
    'https://mun-rose.vercel.app',
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
    return res.status(405).json({ success: false, error: 'Only POST supported' });
  }

  const { email, sheetUrl, delegationName, headName, phone, delegationType } = req.body || {};
  if (!email || !sheetUrl) {
    return res.status(400).json({ success: false, error: 'Email and sheetUrl are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!supabase) {
    return res.status(200).json({ success: true, sheetUrl });
  }

  try {
    // 1. Check if email already has a sheet registered in delegations
    const { data: existing, error: findErr } = await supabase
      .from('delegations')
      .select('id, roster_data, status')
      .ilike('email', cleanEmail)
      .limit(1);

    if (existing && existing.length > 0) {
      const row = existing[0];
      const curRoster = row.roster_data;
      let existingUrl = '';
      if (Array.isArray(curRoster) && curRoster.length > 0) {
        existingUrl = typeof curRoster[0] === 'string' ? curRoster[0] : (curRoster[0]?.sheetUrl || '');
      } else if (typeof curRoster === 'string') {
        existingUrl = curRoster;
      }
      // Never overwrite an existing sheet with a new one! Return original sheet
      return res.status(200).json({
        success: true,
        sheetUrl: existingUrl || sheetUrl,
        isExisting: true
      });
    }

    // 2. Persist new draft sheet in Supabase delegations table
    const { error: insertErr } = await supabase.from('delegations').insert({
      delegation_name: String(delegationName || 'Delegation').trim().substring(0, 500),
      delegation_type: String(delegationType || 'External').trim(),
      head_name:       String(headName || 'Delegation Head').trim().substring(0, 500),
      email:           cleanEmail,
      phone:           String(phone || 'N/A').trim().substring(0, 100),
      member_count:    9,
      roster_data:     [sheetUrl],
      status:          'Draft Sheet Created'
    });

    if (insertErr) {
      console.warn('[save-draft-sheet] Insert notice:', insertErr.message);
    }

    return res.status(200).json({ success: true, sheetUrl, isNew: true });
  } catch (err) {
    console.error('[save-draft-sheet] Error:', err);
    return res.status(200).json({ success: true, sheetUrl });
  }
}
