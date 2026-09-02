import { supabase } from './_supabase.js';

export default async function handler(req, res) {
  // CORS & Origin Validation Security Check
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

  if (!supabase) {
    // If Supabase not configured in local dev environment yet
    return res.status(200).json({ success: true, exists: false });
  }

  try {
    // 1. Check in individual registrations
    const { data: regRows, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (regError) {
      console.warn('[check-email] Supabase query notice:', regError.message);
    } else if (regRows && regRows.length > 0) {
      return res.status(200).json({
        success: true,
        exists: true,
        type: 'individual',
        message: "This email address is already registered for RNS MUN '26."
      });
    }

    // 2. Check in delegations
    const { data: dlgRows, error: dlgError } = await supabase
      .from('delegations')
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (dlgError) {
      console.warn('[check-email] Delegation query notice:', dlgError.message);
    } else if (dlgRows && dlgRows.length > 0) {
      return res.status(200).json({
        success: true,
        exists: true,
        type: 'delegation',
        message: "This email address is already registered as a Delegation Head for RNS MUN '26."
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: 'Email available'
    });

  } catch (err) {
    console.error('[check-email] Query error:', err);
    return res.status(200).json({ success: true, exists: false });
  }
}
