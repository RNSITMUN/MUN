import { supabase } from './_supabase.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const EXTERNAL_QR_POOL = [
  { upiId: 'nikhilnayak2005@okicici',    file: 'nikhilnayak2005@okicici.png' },
  { upiId: 'koushikr955@okhdfcbank',     file: 'koushikr955@okhdfcbank.png' },
  { upiId: 'vamshiganesh274@oksbi',      file: 'vamshiganesh274@oksbi.png' },
  { upiId: 'wingspawn28-1@okaxis',       file: 'wingspawn28-1@okaxis.png' }
];

const MAX_PER_24H = 17;
const WINDOW_MS = 24 * 60 * 60 * 1000;

// Local persistent file fallback for tracking impressions (Vercel /tmp compatible)
const CACHE_DIR = process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), '.temp_data');
const CACHE_FILE = path.join(CACHE_DIR, 'qr_impressions.json');

function getLocalImpressions() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const list = JSON.parse(raw);
      const cutoff = Date.now() - WINDOW_MS;
      return Array.isArray(list) ? list.filter(item => item && item.time >= cutoff) : [];
    }
  } catch (e) {
    // Ignore read errors
  }
  return [];
}

function saveLocalImpression(upiId) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = getLocalImpressions();
    current.push({ upiId, time: Date.now() });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(current), 'utf8');
  } catch (e) {
    // Ignore write errors
  }
}

export default async function handler(req, res) {
  // CORS & Security headers
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

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const cutoffDate = new Date(Date.now() - WINDOW_MS);
    const counts = {};
    EXTERNAL_QR_POOL.forEach(acc => { counts[acc.upiId] = 0; });

    let supabaseAvailable = false;

    // 1. Check Supabase qr_rotations if table exists
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('qr_rotations')
          .select('upi_id, created_at')
          .gte('created_at', cutoffDate.toISOString());

        if (!error && Array.isArray(data)) {
          supabaseAvailable = true;
          data.forEach(row => {
            if (row && row.upi_id && counts[row.upi_id] !== undefined) {
              counts[row.upi_id]++;
            }
          });
        }
      } catch (err) {
        // Fall back to local tracking
      }
    }

    // 2. If Supabase is unavailable or table doesn't exist, use persistent local tracking
    if (!supabaseAvailable) {
      const localImpressions = getLocalImpressions();
      localImpressions.forEach(item => {
        if (item && item.upiId && counts[item.upiId] !== undefined) {
          counts[item.upiId]++;
        }
      });
    }

    // 3. Filter eligible accounts whose 24h count is strictly < MAX_PER_24H (17)
    let eligible = EXTERNAL_QR_POOL.filter(acc => counts[acc.upiId] < MAX_PER_24H);

    let selected;
    if (eligible.length > 0) {
      // Find the minimum appearance count among eligible
      const minCount = Math.min(...eligible.map(acc => counts[acc.upiId]));
      const candidates = eligible.filter(acc => counts[acc.upiId] === minCount);
      // Randomize tie-break among least used for fair distribution
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Emergency overflow: all 5 accounts have reached 17 appearances
      // Pick the account with the lowest overall count
      const minCount = Math.min(...EXTERNAL_QR_POOL.map(acc => counts[acc.upiId]));
      const candidates = EXTERNAL_QR_POOL.filter(acc => counts[acc.upiId] === minCount);
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    }

    // 4. Record new impression
    if (supabaseAvailable) {
      try {
        await supabase.from('qr_rotations').insert([
          { upi_id: selected.upiId, created_at: new Date().toISOString() }
        ]);
      } catch (e) {
        console.warn('[get-external-qr] Supabase insert warning:', e);
      }
    }
    saveLocalImpression(selected.upiId);

    const assignedCount = counts[selected.upiId] + 1;

    return res.status(200).json({
      success: true,
      upiId: selected.upiId,
      qrUrl: '/Payment_external/' + selected.file,
      count24h: assignedCount,
      maxAllowed: MAX_PER_24H
    });

  } catch (err) {
    console.error('[get-external-qr] Error:', err);
    // Safe deterministic fallback to pool[0] if error occurs
    const fallback = EXTERNAL_QR_POOL[0];
    return res.status(200).json({
      success: true,
      upiId: fallback.upiId,
      qrUrl: '/Payment_external/' + fallback.file,
      count24h: 1,
      maxAllowed: MAX_PER_24H
    });
  }
}
