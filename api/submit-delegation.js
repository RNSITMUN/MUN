import { supabase, uploadScreenshotToStorage } from './_supabase.js';

export default async function handler(req, res) {
  // ─── CORS Guard ───────────────────────────────────────────────
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
  const { delegationName, headName, email, phone } = body;

  if (!delegationName || !String(delegationName).trim()) {
    return res.status(400).json({ success: false, error: 'Delegation / Institution name is required.' });
  }
  if (!headName || !String(headName).trim()) {
    return res.status(400).json({ success: false, error: 'Head of Delegation name is required.' });
  }
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ success: false, error: 'Contact phone number is required.' });
  }

  function clean(val) {
    return val ? String(val).trim().substring(0, 500) : '';
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanDelegationName = clean(delegationName);
  const cleanHeadName = clean(headName);

  // ─── Supabase Integration ────────────────────────────────────
  if (!supabase) {
    console.warn('[submit-delegation] SUPABASE_URL or SUPABASE_KEY not configured in environment.');
    return res.status(200).json({
      success: true,
      message: 'Delegation received (Supabase credentials pending in environment).'
    });
  }

  try {
    // 1. Upload Payment Screenshot (if present)
    let screenshotUrl = '';
    if (body.screenshotBase64) {
      screenshotUrl = await uploadScreenshotToStorage(
        body.screenshotBase64,
        'delegation_' + cleanDelegationName,
        body.screenshotFormat || 'webp'
      );
    }

    // 2. Insert Delegation Record into Supabase
    const { data: insertedRecord, error: insertError } = await supabase
      .from('delegations')
      .insert([
        {
          delegation_name: cleanDelegationName,
          delegation_type: clean(body.delegationType) || 'Club / Society / School',
          head_name:       cleanHeadName,
          email:           cleanEmail,
          phone:           clean(phone),
          member_count:    parseInt(body.memberCount, 10) || 1,
          roster_data:     Array.isArray(body.rosterData) ? body.rosterData : (body.rosterData ? [body.rosterData] : []),
          payment_amount:  clean(body.paymentAmount),
          screenshot_url:  screenshotUrl,
          status:          'Pending Verification'
        }
      ])
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[submit-delegation] Supabase insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Database error: ' + insertError.message });
    }

    return res.status(200).json({
      success: true,
      id: insertedRecord?.id,
      screenshotUrl: screenshotUrl || ''
    });

  } catch (err) {
    console.error('[submit-delegation] Fatal error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
