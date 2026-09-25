import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const k = trimmed.substring(0, eqIdx).trim();
  let v = trimmed.substring(eqIdx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[k] = v;
}

const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: reg, error: e1 } = await sb.from('registrations').select('*').limit(1);
if (e1) { console.error('registrations error:', e1.message); } 
else { console.log('REGISTRATIONS columns:', Object.keys(reg[0] || {}).join(', ')); }

const { data: del, error: e2 } = await sb.from('delegations').select('*').limit(1);
if (e2) { console.error('delegations error:', e2.message); }
else { console.log('DELEGATIONS columns:', Object.keys(del[0] || {}).join(', ')); }
