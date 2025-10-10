// api/auth/verify.js
import { kv } from '@vercel/kv';
import crypto from 'crypto';

const OTP_TTL = 60 * 15;     // 15 min (must match)
const APIKEY_TTL = 60 * 60 * 24; // 24h

function otpKey(code) { return `otp:${code}`; }
function apiKeyKey(key) { return `apikey:${key}`; }
function adminListKey() { return 'admin:keys'; } // list of active apikeys (optional)

function genApiKey() {
  return crypto.randomBytes(32).toString('hex'); // 64 chars
}

function safeEqual(a, b) {
  try {
    const A = Buffer.from(String(a));
    const B = Buffer.from(String(b));
    if (A.length !== B.length) {
      crypto.timingSafeEqual(A, Buffer.alloc(A.length));
      return false;
    }
    return crypto.timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const key = otpKey(code);
    const raw = await kv.get(key);
    if (!raw) return res.status(400).json({ error: 'Invalid or expired code' });

    // parse and ensure not used
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (obj.used) return res.status(400).json({ error: 'Code already used' });

    // mark used (atomic-ish)
    await kv.set(key, JSON.stringify({ ...obj, used: true }), { ex: 60 }); // short keep for audit

    // generate API key
    const apikey = genApiKey();
    const apikeyKey = apiKeyKey(apikey);

    // store apikey meta
    await kv.set(apikeyKey, JSON.stringify({ createdAt: new Date().toISOString() }), { ex: APIKEY_TTL });
    // optional: keep index of keys
    await kv.lpush(adminListKey(), apikey);
    await kv.expire(adminListKey(), APIKEY_TTL);

    // return apikey to client
    return res.status(200).json({ ok: true, apiKey: apikey, expiresIn: APIKEY_TTL });
  } catch (err) {
    console.error('[auth:verify] error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}