import { supabase } from './_supabase.js';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Only GET is supported.' });
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

  // Privileged client for database queries (service role if available)
  const privilegedClient = (supabaseUrl && (serviceKey || anonKey))
    ? createClient(supabaseUrl, serviceKey || anonKey, { auth: { persistSession: false } })
    : supabase;

  if (!privilegedClient) {
    return res.status(500).json({
      success: false,
      error: 'Supabase client could not be initialized. Missing credentials.'
    });
  }

  try {
    // Validate session token against Supabase Auth
    const { data: authData, error: authError } = await privilegedClient.auth.getUser(token);

    if (authError || !authData?.user) {
      console.warn('⚠️ [admin-registrations] Invalid session token:', authError?.message);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Session invalid or expired. Please sign in again.'
      });
    }

    const adminUser = authData.user;
    console.log(`🔒 [admin-registrations] Authenticated request from member: ${adminUser.email}`);

    // ─── Query Parameters ────────────────────────────────────────
    const query = req.query || {};
    const type = (query.type || 'all').toLowerCase();
    const statusFilter = query.status && query.status !== 'all' ? String(query.status).trim() : null;
    const search = query.search ? String(query.search).trim().toLowerCase() : '';

    let registrations = [];
    let delegations = [];

    // ─── Fetch Individual Registrations ─────────────────────────
    if (type === 'all' || type === 'individual') {
      let regQuery = privilegedClient
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        regQuery = regQuery.eq('status', statusFilter);
      }

      const { data: regData, error: regError } = await regQuery;

      if (regError) {
        console.error('❌ [admin-registrations] Error fetching registrations:', regError);
        return res.status(500).json({ success: false, error: 'Database error: ' + regError.message });
      }

      registrations = regData || [];

      // Optional client search filter across fields
      if (search) {
        registrations = registrations.filter(item => {
          return (
            (item.name && item.name.toLowerCase().includes(search)) ||
            (item.email && item.email.toLowerCase().includes(search)) ||
            (item.phone && item.phone.toLowerCase().includes(search)) ||
            (item.usn && item.usn.toLowerCase().includes(search)) ||
            (item.institution && item.institution.toLowerCase().includes(search)) ||
            (item.city && item.city.toLowerCase().includes(search)) ||
            (item.committee1 && item.committee1.toLowerCase().includes(search)) ||
            (item.committee2 && item.committee2.toLowerCase().includes(search))
          );
        });
      }
    }

    // ─── Fetch Delegations ──────────────────────────────────────
    if (type === 'all' || type === 'delegation') {
      let dlgQuery = privilegedClient
        .from('delegations')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        dlgQuery = dlgQuery.eq('status', statusFilter);
      }

      const { data: dlgData, error: dlgError } = await dlgQuery;

      if (dlgError) {
        console.error('❌ [admin-registrations] Error fetching delegations:', dlgError);
        return res.status(500).json({ success: false, error: 'Database error: ' + dlgError.message });
      }

      delegations = dlgData || [];

      if (search) {
        delegations = delegations.filter(item => {
          return (
            (item.delegation_name && item.delegation_name.toLowerCase().includes(search)) ||
            (item.head_name && item.head_name.toLowerCase().includes(search)) ||
            (item.email && item.email.toLowerCase().includes(search)) ||
            (item.phone && item.phone.toLowerCase().includes(search)) ||
            (item.delegation_type && item.delegation_type.toLowerCase().includes(search))
          );
        });
      }
    }

    // ─── Fetch Shared Mail Logs from Supabase ───────────────────
    let mailLogs = [];
    try {
      const { data: logsData, error: logsError } = await privilegedClient
        .from('mail_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!logsError && logsData) {
        mailLogs = logsData;
      }
    } catch (logErr) {
      console.warn('⚠️ [admin-registrations] Non-blocking error fetching mail_logs:', logErr.message);
    }

    // ─── Calculate Summary Stats ────────────────────────────────
    const stats = {
      totalIndividuals: registrations.length,
      totalDelegations: delegations.length,
      pendingIndividuals: registrations.filter(r => r.status === 'Pending Verification').length,
      confirmedIndividuals: registrations.filter(r => r.status === 'Confirmed').length,
      rejectedIndividuals: registrations.filter(r => r.status === 'Rejected').length,
      pendingDelegations: delegations.filter(d => d.status === 'Pending Verification').length,
      confirmedDelegations: delegations.filter(d => d.status === 'Confirmed').length,
      rejectedDelegations: delegations.filter(d => d.status === 'Rejected').length
    };

    return res.status(200).json({
      success: true,
      stats,
      registrations,
      delegations,
      mailLogs,
      user: {
        id: adminUser.id,
        email: adminUser.email
      }
    });

  } catch (err) {
    console.error('❌ [admin-registrations] Unexpected handler error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
