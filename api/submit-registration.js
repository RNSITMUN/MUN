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
  const { name, email, phone, delegateType } = body;

  console.log('📥 [submit-registration] Received registration request for:', email, name);

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'Full name is required.' });
  }
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }
  if (!phone || !String(phone).trim()) {
    return res.status(400).json({ success: false, error: 'WhatsApp phone number is required.' });
  }

  // ─── Sanitise all string fields ──────────────────────────────
  function clean(val) {
    return val ? String(val).trim().substring(0, 500) : '';
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = clean(name);

  // ─── Supabase Integration ────────────────────────────────────
  if (!supabase) {
    console.error('❌ [submit-registration] SUPABASE_URL or SUPABASE_KEY is missing!');
    return res.status(500).json({
      success: false,
      error: 'Database configuration missing. Please check SUPABASE_URL and SUPABASE_KEY.'
    });
  }

  try {
    // 1. Check for Duplicate Email
    const { data: existingUser, error: checkError } = await supabase
      .from('registrations')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1);

    if (checkError) {
      console.warn('[submit-registration] Duplicate check warning:', checkError.message);
    } else if (existingUser && existingUser.length > 0) {
      console.warn('⚠️ [submit-registration] Duplicate email rejected:', cleanEmail);
      return res.status(409).json({
        success: false,
        duplicate: true,
        error: "This email address has already been registered for RNS MUN '26. Each delegate may only register once."
      });
    }

    // 2. Upload Payment Screenshot to Supabase Storage
    let screenshotUrl = '';
    if (body.screenshotBase64) {
      console.log('📸 [submit-registration] Uploading payment screenshot...');
      screenshotUrl = await uploadScreenshotToStorage(
        body.screenshotBase64,
        cleanName,
        body.screenshotFormat || 'webp'
      );
      console.log('📸 [submit-registration] Screenshot URL:', screenshotUrl);
    }

    // 3. Insert Registration Record into Supabase PostgreSQL
    const { data: insertedRecord, error: insertError } = await supabase
      .from('registrations')
      .insert([
        {
          delegate_type:      clean(delegateType),
          name:               cleanName,
          institution:        clean(body.institution),
          usn:                clean(body.usn),
          city:               clean(body.city),
          phone:              clean(phone),
          email:              cleanEmail,
          mun_experience:     clean(body.munExperience),
          experience_count:   clean(body.experienceCount),
          experience_details: clean(body.experienceDetails),
          committee1:         clean(body.committee1),
          portfolio1_1:       clean(body.portfolio1_1),
          portfolio1_2:       clean(body.portfolio1_2),
          committee2:         clean(body.committee2),
          portfolio2_1:       clean(body.portfolio2_1),
          portfolio2_2:       clean(body.portfolio2_2),
          ieee_id:            clean(body.ieeeId),
          payment_amount:     clean(body.paymentAmount),
          screenshot_url:     screenshotUrl,
          status:             'Pending Verification'
        }
      ])
      .select('id, created_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({
          success: false,
          duplicate: true,
          error: "This email address has already been registered for RNS MUN '26."
        });
      }
      console.error('❌ [submit-registration] Supabase insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Database error: ' + insertError.message });
    }

    console.log('✅ [submit-registration] Successfully saved to Supabase! ID:', insertedRecord?.id);

    return res.status(200).json({
      success: true,
      id: insertedRecord?.id,
      screenshotUrl: screenshotUrl || ''
    });

  } catch (err) {
    console.error('❌ [submit-registration] Fatal error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
