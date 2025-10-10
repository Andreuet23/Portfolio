import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const TO = process.env.TO_EMAIL;
const FROM = process.env.FROM_EMAIL;

const OTP_TTL = 60 * 15; // 15 minutos
const RATE_LIMIT = 6; // Máximo 6 intentos por IP
const RL_WINDOW = 60 * 60; // 1 hora

function otpKey(code) { return `otp:${code}`; }
function ipRLKey(ip) { return `rl:auth:${ip}`; }

function randomCode(len = 6) {
  const n = Math.floor(Math.random() * Math.pow(10, len)).toString().padStart(len, '0');
  return n;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const ip = req.headers['x-forwarded-for']?.split(',')?.[0] || req.socket.remoteAddress || 'unknown';

    // rate limit simple por IP
    const rl = await kv.incr(ipRLKey(ip));
    if (rl === 1) await kv.expire(ipRLKey(ip), RL_WINDOW);
    if (rl > RATE_LIMIT) return res.status(429).json({ error: 'Too many requests' });

    // genera el código
    const code = randomCode(6);
    const key = otpKey(code);

    // guarda en KV (valor puede ser un objeto stringificado)
    await kv.set(key, JSON.stringify({ createdAt: new Date().toISOString(), used: false, ip }), { ex: OTP_TTL });

    //envía correo con el código
    const subject = 'Código de acceso a syco.dev';
    const html = `
      <div style="font-family: Inter, Arial, sans-serif;">
        <h3>Tu código de acceso a syco.dev</h3>
        <p>Usa este código en la página de administración (válido ${Math.floor(OTP_TTL / 60)} minutos):</p>
        <pre style="font-size:20px; background:#111; color:#fff; padding:12px; border-radius:8px;">${code}</pre>
        <p>Si no lo solicitaste, ignora este email.</p>
      </div>
    `;

    await resend.emails.send({ from: FROM, to: TO, subject, html });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[auth:request] error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}