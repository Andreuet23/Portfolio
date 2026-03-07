// api/auth/request.js
import { kv } from '@vercel/kv';
import { Resend } from 'resend';
import crypto from 'crypto';

function kvReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
function missingEnv() {
  const miss = [];
  if (!process.env.RESEND_API_KEY) miss.push('RESEND_API_KEY');
  if (!process.env.FROM_EMAIL) miss.push('FROM_EMAIL');
  if (!process.env.ADMIN_EMAIL) miss.push('ADMIN_EMAIL');
  if (!process.env.KV_REST_API_URL) miss.push('KV_REST_API_URL');
  if (!process.env.KV_REST_API_TOKEN) miss.push('KV_REST_API_TOKEN');
  return miss;
}

const CODE_TTL_SECONDS = 10 * 60; // 10 min
const RATE_LIMIT_WINDOW = 60;     // 60s
const RATE_LIMIT_MAX = 3;

function ipFromReq(req) {
  const xf = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function genCode() {
  // Generador criptográficamente seguro (Math.random no lo es)
  return crypto.randomInt(100000, 1000000).toString();
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).send('Method Not Allowed');
    }

    // Comprobación de entorno con detalle
    const miss = missingEnv();
    if (miss.length) {
      // El detalle va al log del servidor, no al cliente
      console.error('[auth/request] missing env', miss.join(', '));
      return res.status(500).json({ error: 'Server misconfigured' });
    }
    if (!kvReady()) {
      return res.status(500).json({ error: 'KV not configured properly' });
    }

    const { RESEND_API_KEY, FROM_EMAIL, ADMIN_EMAIL } = process.env;

    // Rate limit por IP
    const ip = ipFromReq(req);
    const rlKey = `auth:rl:${ip}`;
    const count = await kv.incr(rlKey);
    if (count === 1) await kv.expire(rlKey, RATE_LIMIT_WINDOW);
    if (count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Generar y guardar el código con TTL
    const code = genCode();
    await kv.set(`auth:code:${ADMIN_EMAIL}`, code, { ex: CODE_TTL_SECONDS });
    await kv.del(`auth:attempts:${ADMIN_EMAIL}`); // código nuevo, contador de intentos a cero

    // Enviar email con Resend
    try {
      const resend = new Resend(RESEND_API_KEY);
      const r = await resend.emails.send({
        from: FROM_EMAIL,           // Debe estar verificado en Resend
        to: ADMIN_EMAIL,            // Tu correo personal o donde quieras recibir el código
        subject: 'Tu código de acceso (panel admin)',
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 8px">Código de acceso</h2>
            <p style="margin:0 0 12px">Usa este código para iniciar sesión en el panel:</p>
            <p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:0 0 12px">${code}</p>
            <p style="color:#9ca3af;margin:0">Caduca en 10 minutos.</p>
          </div>
        `
      });

      return res.status(200).json({ ok: true, id: r?.id || null });
    } catch (e) {
      // Devuelve detalle del error de Resend para diagnosticar remitente/domino
      const msg = e?.message || e?.toString?.() || 'Resend send failed';
      console.error('[auth/request] resend error', msg);
      return res.status(500).json({ error: 'Send failed' });
    }

  } catch (err) {
    console.error('[auth/request] 500', err?.message || err);
    return res.status(500).json({ error: 'Failed to send code' });
  }
}