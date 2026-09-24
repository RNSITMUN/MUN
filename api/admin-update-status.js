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
    const { id, type, status, allocated_committee, allocated_portfolio } = body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Record ID is required.' });
    }

    const targetType = (type || 'individual').toLowerCase();
    const tableName = (targetType === 'delegation') ? 'delegations' : 'registrations';

    // ─── 1. Handle Allocation Updates ───────────────────────────
    let allocationSaved = false;
    if (allocated_committee !== undefined || allocated_portfolio !== undefined) {
      const allocComm = allocated_committee !== undefined ? String(allocated_committee).trim() : null;
      const allocPort = allocated_portfolio !== undefined ? String(allocated_portfolio).trim() : null;

      // Update Supabase delegate_checkpoints table
      try {
        const cpPayload = {
          record_type: targetType,
          record_id: String(id),
          member_index: 0,
          checkpoint_key: 'allocation',
          redeemed: true,
          redeemed_at: new Date().toISOString(),
          redeemed_by: adminUser.email || 'Admin',
          allocated_committee: allocComm,
          allocated_portfolio: allocPort
        };

        await privilegedClient
          .from('delegate_checkpoints')
          .upsert(cpPayload, { onConflict: 'record_type,record_id,member_index,checkpoint_key' });
        allocationSaved = true;
      } catch (cpErr) {
        console.warn('⚠️ [admin-update-status] Supabase allocation checkpoint warning:', cpErr.message);
      }

      // Update local checkpoints store
      try {
        const lp = path.resolve(process.cwd(), '.data', 'checkpoints.json');
        const lDir = path.dirname(lp);
        if (!fs.existsSync(lDir)) fs.mkdirSync(lDir, { recursive: true });

        let localData = {};
        if (fs.existsSync(lp)) {
          try { localData = JSON.parse(fs.readFileSync(lp, 'utf8')) || {}; } catch(e) {}
        }
        const k = `${targetType}_${id}`;
        if (!localData[k]) {
          localData[k] = { checkpoints: {}, memberCheckpoints: {}, allocatedCommittee: '', allocatedPortfolio: '' };
        }
        if (allocComm !== null) localData[k].allocatedCommittee = allocComm;
        if (allocPort !== null) localData[k].allocatedPortfolio = allocPort;

        fs.writeFileSync(lp, JSON.stringify(localData, null, 2), 'utf8');
        allocationSaved = true;
      } catch (fsErr) {
        console.warn('⚠️ [admin-update-status] Local cache allocation warning:', fsErr.message);
      }
    }

    // ─── 2. Handle Status Updates (if provided) ─────────────────
    let updatedRecord = null;
    if (status) {
      const validStatuses = ['Pending Verification', 'Confirmed', 'Rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      console.log(`📝 [admin-update-status] Admin ${adminUser.email} updating ${tableName} ID ${id} -> "${status}"`);

      const { data: rec, error: updateError } = await privilegedClient
        .from(tableName)
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [admin-update-status] Update error:', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update record: ' + updateError.message });
      }
      updatedRecord = rec;
    }

    if (!status && !allocationSaved) {
      return res.status(400).json({
        success: false,
        error: 'No valid update parameters provided (provide status, allocated_committee, or allocated_portfolio).'
      });
    }

    return res.status(200).json({
      success: true,
      message: status ? `Status updated to '${status}' successfully.` : 'Allocation updated successfully.',
      record: updatedRecord,
      allocated_committee: allocated_committee || undefined,
      allocated_portfolio: allocated_portfolio || undefined
    });

  } catch (err) {
    console.error('❌ [admin-update-status] Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
  }
}
