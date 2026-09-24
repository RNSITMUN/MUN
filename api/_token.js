import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Master Secret for HMAC and Session Signatures (Fails closed in production)
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

  if (isProduction && !sec) {
    console.error('🚨 [CRITICAL SECURITY ERROR] SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is NOT set in production environment variables.');
    return null;
  }

  return sec || 'rnsmun2026_sec_dev_fallback_secret_local_only';
}

const SECRET = getMasterSecret();
const TOKEN_REGISTRY_PATH = path.resolve(process.cwd(), '.data', 'token_registry.json');

function ensureDataDir() {
  const dir = path.dirname(TOKEN_REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
}

function readTokenRegistry() {
  ensureDataDir();
  try {
    if (fs.existsSync(TOKEN_REGISTRY_PATH)) {
      const raw = fs.readFileSync(TOKEN_REGISTRY_PATH, 'utf8');
      return JSON.parse(raw) || { toToken: {}, toRecord: {} };
    }
  } catch (e) {
    // Ephemeral or read-only filesystem fallback
  }
  return { toToken: {}, toRecord: {} };
}

function writeTokenRegistry(data) {
  ensureDataDir();
  try {
    fs.writeFileSync(TOKEN_REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // Read-only filesystem warning handled gracefully
  }
}

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function bufferToBase62(buf) {
  let n = 0n;
  for (let i = 0; i < buf.length; i++) {
    n = (n << 8n) + BigInt(buf[i]);
  }
  let s = '';
  const base = 62n;
  while (n > 0n) {
    s = BASE62_CHARS[Number(n % base)] + s;
    n = n / base;
  }
  return s.padStart(14, '0');
}

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

/**
 * Generates a permanent, cryptographically verifiable, unguessable public token for a delegate or delegation.
 * e.g. /hub?t=01SkYaqZI5vA0q
 */
export function getPublicToken(type, id) {
  if (!SECRET) {
    throw new Error('Security Error: SESSION_SECRET is not configured in production. Cannot generate tokens.');
  }
  const cleanType = String(type || 'individual').toLowerCase() === 'delegation' ? 'delegation' : 'individual';
  const cleanId = String(id).trim();
  const recordKey = `${cleanType}_${cleanId}`;

  const registry = readTokenRegistry();
  if (registry.toToken && registry.toToken[recordKey]) {
    return registry.toToken[recordKey];
  }

  // Stateless 10-byte signed buffer if ID is numeric
  const numId = parseInt(cleanId, 10);
  let token = '';

  if (!isNaN(numId) && numId > 0 && numId < 4294967295) {
    const typeByte = cleanType === 'delegation' ? 2 : 1;
    const buf = Buffer.alloc(10);
    buf.writeUInt8(typeByte, 0);
    buf.writeUInt32BE(numId, 1);
    
    // Deterministic salt based on secret + type + id
    const salt = crypto.createHmac('sha256', SECRET).update(`salt:${typeByte}:${numId}`).digest();
    buf.writeUInt16BE(salt.readUInt16BE(0), 5);
    
    // 3-byte HMAC signature covering first 7 bytes
    const sig = crypto.createHmac('sha256', SECRET).update(buf.subarray(0, 7)).digest();
    sig.copy(buf, 7, 0, 3);
    
    token = bufferToBase62(buf);
  } else {
    // Fallback for non-numeric IDs: HMAC-based token
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(`public_pass:${cleanType}:${cleanId}`);
    token = hmac.digest('hex').substring(0, 14);
  }

  // Cache in registry
  registry.toToken = registry.toToken || {};
  registry.toRecord = registry.toRecord || {};
  registry.toToken[recordKey] = token;
  registry.toRecord[token] = { type: cleanType, id: cleanId };
  writeTokenRegistry(registry);

  return token;
}

/**
 * Resolves a public pass token (e.g. 01SkYaqZI5vA0q) back to { type, id }.
 */
export function resolvePublicToken(token) {
  if (!SECRET) {
    console.error('Security Error: SESSION_SECRET is not configured in production. Cannot verify tokens.');
    return null;
  }
  if (!token || typeof token !== 'string') return null;
  const cleanToken = token.trim();

  // 1. Try registry cache
  const registry = readTokenRegistry();
  if (registry.toRecord && registry.toRecord[cleanToken]) {
    return registry.toRecord[cleanToken];
  }

  // 2. Try stateless cryptographic decode
  if (cleanToken.length === 14) {
    try {
      const buf = base62ToBuffer(cleanToken);
      if (buf && buf.length === 10) {
        const typeByte = buf.readUInt8(0);
        const numId = buf.readUInt32BE(1);
        const expectedSig = crypto.createHmac('sha256', SECRET).update(buf.subarray(0, 7)).digest().subarray(0, 3);
        
        if (crypto.timingSafeEqual(buf.subarray(7, 10), expectedSig)) {
          const resolved = {
            type: typeByte === 2 ? 'delegation' : 'individual',
            id: String(numId)
          };
          // Cache it for subsequent lookups
          registry.toToken = registry.toToken || {};
          registry.toRecord = registry.toRecord || {};
          registry.toRecord[cleanToken] = resolved;
          registry.toToken[`${resolved.type}_${resolved.id}`] = cleanToken;
          writeTokenRegistry(registry);
          return resolved;
        }
      }
    } catch (e) {
      // Decode failed
    }
  }

  return null;
}

/**
 * Creates a cryptographically signed staff session token valid for 24 hours.
 */
export function createStaffSession() {
  if (!SECRET) {
    throw new Error('Security Error: SESSION_SECRET is not configured in production. Cannot create staff session.');
  }
  const timestamp = Date.now();
  const randomSalt = crypto.randomBytes(8).toString('hex');
  const payload = `staff.${timestamp}.${randomSalt}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verifies a staff session token signature and expiration.
 */
export function verifyStaffSession(sessionToken) {
  if (!SECRET) return false;
  if (!sessionToken || typeof sessionToken !== 'string') return false;

  const parts = sessionToken.trim().split('.');
  if (parts.length !== 4 || parts[0] !== 'staff') return false;

  const [prefix, timestampStr, randomSalt, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Check 24-hour expiration
  const MAX_AGE = 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > MAX_AGE || timestamp > Date.now() + 60000) {
    return false;
  }

  // Verify HMAC signature
  const payload = `${prefix}.${timestampStr}.${randomSalt}`;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch (e) {
    return false;
  }
}

// Fallback handler if Vercel serverless engine attempts to invoke helper module
export default function handler(req, res) {
  res.status(404).json({ error: 'Private helper module' });
}
