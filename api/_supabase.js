import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })
  : null;

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
