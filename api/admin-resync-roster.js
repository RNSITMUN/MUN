import { supabase } from '../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getEnv(key) {
  if (process.env[key]) return process.env[key];
  try {
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
          process.env[k] = v;
          if (k === key) return v;
        }
      }
    }
  } catch (e) {
    // silent catch
  }
  return process.env[key] || '';
}

export default async function handler(req, res) {
  // ─── CORS Guard ───────────────────────────────────────────────
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,PATCH,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST or PATCH.' });
  }

  // ─── Token Verification (Supabase Auth) ──────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Missing session token.'
    });
  }

  const supabaseUrl =
    getEnv('SUPABASE_URL') ||
    getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
    getEnv('VITE_SUPABASE_URL') ||
    '';

  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey =
    getEnv('SUPABASE_ANON_KEY') ||
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    getEnv('VITE_SUPABASE_ANON_KEY') ||
    '';

  const privilegedClient = (supabaseUrl && (serviceKey || anonKey))
    ? createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } })
    : supabase;

  if (!privilegedClient) {
    return res.status(500).json({
      success: false,
      error: 'Database configuration missing. Please check Supabase credentials.'
    });
  }

  try {
    const { data: authData, error: authError } = await privilegedClient.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session invalid or expired. Please sign in again.'
      });
    }

    const adminUser = authData.user;
    const body = req.body || {};
    const { id, rosterData } = body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Delegation ID is required.' });
    }

    if (!Array.isArray(rosterData)) {
      return res.status(400).json({ success: false, error: 'rosterData must be an array of delegate objects.' });
    }

    console.log(`📝 [admin-resync-roster] Admin ${adminUser.email} re-syncing roster for delegation ID ${id} (${rosterData.length} delegates)`);

    const updatePayload = {
      roster_data: rosterData
    };
    if (rosterData.length > 0) {
      updatePayload.member_count = rosterData.length;
    }

    const { data: updatedRecord, error: updateError } = await privilegedClient
      .from('delegations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [admin-resync-roster] Update error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update roster: ' + updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Roster re-synced successfully (${rosterData.length} delegates).`,
      record: updatedRecord,
      count: rosterData.length
    });

  } catch (err) {
    console.error('❌ [admin-resync-roster] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
