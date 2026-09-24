import { supabase } from '../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getPublicToken } from '../lib/token.js';

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
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 30;
    const offset = (page - 1) * limit;

    let regSearchOr = search ? `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,usn.ilike.%${search}%,institution.ilike.%${search}%,city.ilike.%${search}%,committee1.ilike.%${search}%,committee2.ilike.%${search}%` : null;
    let dlgSearchOr = search ? `delegation_name.ilike.%${search}%,head_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,delegation_type.ilike.%${search}%` : null;

    const stats = {
      totalIndividuals: 0, pendingIndividuals: 0, confirmedIndividuals: 0, rejectedIndividuals: 0,
      totalDelegations: 0, pendingDelegations: 0, confirmedDelegations: 0, rejectedDelegations: 0,
      totalRegPages: 1, totalDlgPages: 1, currentPage: page, limit: limit,
      internalCount: 0, externalCount: 0, totalAmount: 0, totalDelegatesRep: 0,
      confirmedDelegateHeadcount: 0
    };

    function parsePaymentAmount(amt) {
      if (!amt) return 0;
      const match = String(amt).match(/[\d,]+/);
      if (match) {
        const num = parseInt(match[0].replace(/,/g, ''), 10);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    }

    // ─── Fetch Stats & Counts (Optimized select) ─────────────────
    if (type === 'all' || type === 'individual') {
      let q = privilegedClient.from('registrations').select('status, delegate_type, payment_amount', { count: 'exact' });
      if (statusFilter) q = q.eq('status', statusFilter);
      if (regSearchOr) q = q.or(regSearchOr);
      
      const { data, count, error } = await q;
      if (!error && data) {
         stats.totalIndividuals = data.filter(r => r.status !== 'Rejected').length;
         stats.totalRegPages = Math.ceil(count / limit) || 1;
         data.forEach(r => {
           if (r.status === 'Pending Verification') stats.pendingIndividuals++;
           else if (r.status === 'Confirmed') {
             stats.confirmedIndividuals++;
             stats.totalAmount += parsePaymentAmount(r.payment_amount);
           }
           else if (r.status === 'Rejected') stats.rejectedIndividuals++;

           if ((r.delegate_type || '').toLowerCase().startsWith('internal')) stats.internalCount++;
           else stats.externalCount++;

           // In the individual-registrations loop:
           if (r.status !== 'Rejected') stats.totalDelegatesRep++; // one per non-rejected individual
         });
      }
    }

    if (type === 'all' || type === 'delegation') {
      let q = privilegedClient.from('delegations').select('status, member_count, payment_amount', { count: 'exact' });
      if (statusFilter) q = q.eq('status', statusFilter);
      if (dlgSearchOr) q = q.or(dlgSearchOr);
      
      const { data, count, error } = await q;
      if (!error && data) {
         stats.totalDelegations = count;
         stats.totalDlgPages = Math.ceil(count / limit) || 1;
         data.forEach(r => {
           if (r.status === 'Pending Verification') stats.pendingDelegations++;
           else if (r.status === 'Confirmed') {
             stats.confirmedDelegations++;
             stats.totalAmount += parsePaymentAmount(r.payment_amount);
             stats.confirmedDelegateHeadcount = (stats.confirmedDelegateHeadcount || 0) + (parseInt(r.member_count, 10) || 1);
           }
           else if (r.status === 'Rejected') stats.rejectedDelegations++;

           // In the delegations loop:
           if (r.status !== 'Rejected') {
             stats.totalDelegatesRep += (parseInt(r.member_count, 10) || 1); // headcount per non-rejected delegation
           }
         });
      }
    }

    // ─── Fetch Paginated Data ───────────────────────────────────
    let registrations = [];
    let delegations = [];

    // Helper to read local checkpoints store
    const localCheckpoints = (() => {
      try {
        const lp = path.resolve(process.cwd(), '.data', 'checkpoints.json');
        if (fs.existsSync(lp)) return JSON.parse(fs.readFileSync(lp, 'utf8')) || {};
      } catch (e) {}
      return {};
    })();

    // Helper map of database allocations
    let allocationsMap = {};
    try {
      const { data: cpData } = await privilegedClient
        .from('delegate_checkpoints')
        .select('record_id, record_type, allocated_committee, allocated_portfolio')
        .eq('checkpoint_key', 'allocation');

      if (Array.isArray(cpData)) {
        cpData.forEach(cp => {
          const k = `${cp.record_type}_${cp.record_id}`;
          allocationsMap[k] = {
            committee: cp.allocated_committee,
            portfolio: cp.allocated_portfolio
          };
        });
      }
    } catch (e) {
      // Non-blocking fallback to local store
    }

    if (type === 'all' || type === 'individual') {
      let regQuery = privilegedClient
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter) regQuery = regQuery.eq('status', statusFilter);
      if (regSearchOr) regQuery = regQuery.or(regSearchOr);

      const { data: regData, error: regError } = await regQuery;
      if (regError) {
        console.error('❌ [admin-registrations] Error fetching registrations:', regError);
      } else {
        registrations = (regData || []).map(r => {
          const alloc = allocationsMap[`individual_${r.id}`] || (localCheckpoints[`individual_${r.id}`] ? {
            committee: localCheckpoints[`individual_${r.id}`].allocatedCommittee,
            portfolio: localCheckpoints[`individual_${r.id}`].allocatedPortfolio
          } : null);

          return {
            ...r,
            allocated_committee: alloc?.committee || r.allocated_committee || r.committee1 || '',
            allocated_portfolio: alloc?.portfolio || r.allocated_portfolio || r.portfolio1_1 || '',
            public_token: getPublicToken('individual', r.id)
          };
        });
      }
    }

    if (type === 'all' || type === 'delegation') {
      let dlgQuery = privilegedClient
        .from('delegations')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (statusFilter) dlgQuery = dlgQuery.eq('status', statusFilter);
      if (dlgSearchOr) dlgQuery = dlgQuery.or(dlgSearchOr);

      const { data: dlgData, error: dlgError } = await dlgQuery;
      if (dlgError) {
        console.error('❌ [admin-registrations] Error fetching delegations:', dlgError);
      } else {
        delegations = (dlgData || []).map(d => {
          const alloc = allocationsMap[`delegation_${d.id}`] || (localCheckpoints[`delegation_${d.id}`] ? {
            committee: localCheckpoints[`delegation_${d.id}`].allocatedCommittee,
            portfolio: localCheckpoints[`delegation_${d.id}`].allocatedPortfolio
          } : null);

          return {
            ...d,
            allocated_committee: alloc?.committee || d.allocated_committee || 'Institutional Delegation',
            allocated_portfolio: alloc?.portfolio || d.allocated_portfolio || `${d.member_count || 1} Delegates Delegation`,
            public_token: getPublicToken('delegation', d.id)
          };
        });
      }
    }

    // ─── Fetch Shared Mail Logs from Supabase (Limit to current data views)
    let mailLogs = [];
    try {
      const { data: logsData, error: logsError } = await privilegedClient
        .from('mail_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!logsError && logsData) {
        mailLogs = logsData;
      }
    } catch (logErr) {
      console.warn('⚠️ [admin-registrations] Non-blocking error fetching mail_logs:', logErr.message);
    }

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
