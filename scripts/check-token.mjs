import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function getMasterSecret() {
  const isProduction = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
  let sec = (process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!sec && !isProduction) {
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
            if (k === 'SESSION_SECRET' || k === 'SUPABASE_SERVICE_ROLE_KEY') {
              sec = v;
              process.env[k] = v;
              break;
            }
          }
          if (sec) break;
        }
      }
    } catch (e) {}
  }

  return sec || 'rnsmun2026_sec_dev_fallback_secret_local_only';
}

const SECRET = getMasterSecret();
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function base62ToBuffer(str) {
  let n = 0n;
  const base = 62n;
  for (let i = 0; i < str.length; i++) {
    const idx = BASE62_CHARS.indexOf(str[i]);
    if (idx === -1) return null;
    n = n * base + BigInt(idx);
  }
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const buf = Buffer.from(hex, 'hex');
  if (buf.length < 10) {
    const padded = Buffer.alloc(10);
    buf.copy(padded, 10 - buf.length);
    return padded;
  }
  return buf.subarray(buf.length - 10);
}

function extractToken(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.includes('hub')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed);
      return url.searchParams.get('t') || trimmed;
    } catch (e) {
      const match = trimmed.match(/[?&]t=([a-zA-Z0-9]+)/);
      if (match) return match[1];
    }
  }
  return trimmed;
}

const inputArg = process.argv[2] || '02vV7BWYCbOTYS';
const token = extractToken(inputArg);

console.log(`Analyzing token: ${token}`);

if (!token || token.length !== 14) {
  console.log(`Invalid token length: ${token ? token.length : 0} (expected 14)`);
  process.exit(1);
}

const buf = base62ToBuffer(token);
if (!buf || buf.length !== 10) {
  console.log('Failed to decode base62 buffer or buffer size is not 10 bytes');
  process.exit(1);
}

const typeByte = buf.readUInt8(0);
const numId = buf.readUInt32BE(1);
const salt = buf.readUInt16BE(5);
const actualSig = buf.subarray(7, 10);
const sigHex = actualSig.toString('hex');

const typeStr = typeByte === 2 ? 'delegation' : (typeByte === 1 ? 'individual' : `unknown (${typeByte})`);

console.log('--- Decoded Token Data ---');
console.log(`Type:       ${typeStr} (typeByte: ${typeByte})`);
console.log(`ID:         ${numId}`);
console.log(`Salt:       ${salt}`);
console.log(`Token Sig:  ${sigHex}`);

// Check cryptographic HMAC directly
const expectedSig = crypto.createHmac('sha256', SECRET).update(buf.subarray(0, 7)).digest().subarray(0, 3);
const isHmacValid = crypto.timingSafeEqual(actualSig, expectedSig);

console.log('--- Cryptographic HMAC Verification ---');
console.log(`Expected Sig with current secret: ${expectedSig.toString('hex')}`);
console.log(`HMAC signature validates: ${isHmacValid}`);

// Also check dev fallback secret specifically if current secret differs
const DEV_FALLBACK = 'rnsmun2026_sec_dev_fallback_secret_local_only';
const devFallbackSig = crypto.createHmac('sha256', DEV_FALLBACK).update(buf.subarray(0, 7)).digest().subarray(0, 3);
const isDevFallbackValid = crypto.timingSafeEqual(actualSig, devFallbackSig);
console.log(`HMAC signature validates under dev fallback: ${isDevFallbackValid}`);

// Check if present in token_registry cache
let inRegistry = false;
try {
  const regPath = path.resolve(process.cwd(), '.data', 'token_registry.json');
  if (fs.existsSync(regPath)) {
    const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    if (reg.toRecord && reg.toRecord[token]) {
      inRegistry = true;
    }
  }
} catch (e) {}
console.log(`Present in .data/token_registry.json cache: ${inRegistry}`);
