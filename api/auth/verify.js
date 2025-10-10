// api/auth/verify.js
import { kv } from '@vercel/kv';
import crypto from 'crypto';

function kvReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24h

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}
function genToken() {
  return 'ak_' + crypto.randomBytes(24).toString('hex');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).send('Method Not Allowed');
    }

    if (!kvReady() || !process.env.ADMIN_EMAIL) {
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    const body = await readJsonBody(req).catch(() => ({}));
    const code = String(body?.code || '').trim();

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const stored = await kv.get(`auth:code:${ADMIN_EMAIL}`);

    if (!stored || String(stored) !== code) {
      return res.status(401).json({ error: 'Código inválido o caducado' });
    }

    const apiKey = genToken();
    await Promise.all([
      kv.set(`auth:session:${apiKey}`, ADMIN_EMAIL, { ex: SESSION_TTL_SECONDS }),
      kv.del(`auth:code:${ADMIN_EMAIL}`)
    ]);

    return res.status(200).json({ ok: true, apiKey, expiresIn: SESSION_TTL_SECONDS });
  } catch (err) {
    console.error('[auth/verify] 500', err);
    return res.status(500).json({ error: 'Verify failed' });
  }
}