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
    console.warn('[Supabase Config] Env load error:', e.message);
  }
  return process.env[key] || '';
}

const supabaseUrl =
  getEnv('SUPABASE_URL') ||
  getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnv('VITE_SUPABASE_URL') ||
  '';

const supabaseKey =
  getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnv('SUPABASE_ANON_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnv('VITE_SUPABASE_ANON_KEY') ||
  '';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

if (!supabase) {
  console.warn('⚠️ [Supabase] Client initialized with NULL credentials. Check .env.local or Vercel environment variables.');
} else {
  console.log('⚡ [Supabase] Client successfully initialized for URL:', supabaseUrl);
}

/**
 * Uploads a base64 payment screenshot to the Supabase Storage bucket.
 * @param {string} base64Data Base64 Data URL or raw base64 string
 * @param {string} filenamePrefix Optional prefix like delegate name
 * @param {string} format 'webp' | 'jpeg' | 'png'
 * @returns {Promise<string>} Public URL of uploaded screenshot
 */
export async function uploadScreenshotToStorage(base64Data, filenamePrefix = 'delegate', format = 'webp') {
  if (!supabase || !base64Data) return '';

  try {
    const rawBase64 = base64Data.replace(/^data:image\/[a-z0-9+]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    
    const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : (format === 'png' ? 'png' : 'webp');
    const mimeType = ext === 'jpg' ? 'image/jpeg' : (ext === 'png' ? 'image/png' : 'image/webp');
    
    const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const filePath = `${cleanPrefix}_${timestamp}_${randomSuffix}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-screenshots')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload notice:', uploadError.message);
      return '';
    }

    const { data: publicUrlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || '';
  } catch (err) {
    console.error('[Supabase Storage] Upload error:', err);
    return '';
  }
}
