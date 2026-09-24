import crypto from 'crypto';
import { createStaffSession } from './_token.js';

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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only POST is supported.' });
  }

  const body = req.body || {};
  const submittedPin = String(body.pin || '').trim();

  // Read Organizer PIN securely from Server Environment (never exposed to browser)
  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  let serverPin = (process.env.ORGANIZER_PIN || '').trim();

  if (!serverPin && !isProduction) {
    // In local dev, try loading from .env / .env.local if not already in process.env
    try {
      const fs = await import('fs');
      const path = await import('path');
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
            if (k === 'ORGANIZER_PIN') {
              serverPin = v;
              process.env[k] = v;
              break;
            }
          }
          if (serverPin) break;
        }
      }
    } catch (e) {}
  }

  // Fail closed in production: NEVER silently accept default PIN if secret is unconfigured
  if (isProduction && !serverPin) {
    console.error('🚨 [Security Alert] ORGANIZER_PIN is not configured in production environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server security configuration error: Staff authentication is disabled until ORGANIZER_PIN is configured in production environment variables.'
    });
  }

  if (!serverPin) {
    serverPin = '6078'; // Local dev fallback only
  }

  if (!submittedPin) {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  // Constant-time comparison to prevent timing side-channel attacks
  let isValid = false;
  try {
    const subBuf = Buffer.from(submittedPin);
    const srvBuf = Buffer.from(serverPin);
    if (subBuf.length === srvBuf.length && crypto.timingSafeEqual(subBuf, srvBuf)) {
      isValid = true;
    }
  } catch (e) {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Organizer PIN.'
    });
  }

  // Create cryptographically signed temporary session token (valid 24h)
  const sessionToken = createStaffSession();

  return res.status(200).json({
    success: true,
    message: 'Staff authentication successful.',
    sessionToken,
    expiresIn: 86400,
    role: 'organizer'
  });
}
