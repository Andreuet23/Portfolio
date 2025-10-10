// api/contact.js
const { Resend } = require('resend');

// --- helpers ---
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

async function readJsonBody(req) {
  // Vercel suele darte req.body ya parseado si es application/json,
  // pero por seguridad soportamos ambos caminos.
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch (e) { throw new Error('Invalid JSON body'); }
}

// --- handler ---
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      return res.end('Method Not Allowed');
    }

    const { RESEND_API_KEY, FROM_EMAIL, TO_EMAIL, NODE_ENV } = process.env;

    // Comprobación de envs
    if (!RESEND_API_KEY || !FROM_EMAIL || !TO_EMAIL) {
      console.error('[contact] Missing ENV', {
        hasKey: !!RESEND_API_KEY, hasFrom: !!FROM_EMAIL, hasTo: !!TO_EMAIL
      });
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Server misconfigured' }));
    }

    const body = await readJsonBody(req);
    const { name, email, message, nickname } = (body || {});

    // Honeypot
    if (nickname && String(nickname).trim() !== '') {
      // fingimos éxito para bots
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: true }));
    }

    // Validaciones
    if (!name || !email || !message) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing fields' }));
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid email' }));
    }
    if (String(message).length > 5000) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Message too long' }));
    }

    const resend = new Resend(RESEND_API_KEY);

    // 1) Email a TI (copia del mensaje del cliente)
    const toYou = await resend.emails.send({
      from: FROM_EMAIL,            // debe ser tu remitente verificado (p.e. contact@syco.dev)
      to: TO_EMAIL,                // tu buzón personal donde quieres recibir
      subject: `Nuevo contacto: ${name}`,
      html: `
        <h2>Nuevo mensaje desde el portfolio</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Mensaje:</strong><br/>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      `,
      replyTo: email
    });

    // 2) Auto-confirmación al cliente
    const toClient = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Hemos recibido tu mensaje ✔',
      html: `
        <h2>¡Gracias por contactarme!</h2>
        <p>Hola ${escapeHtml(name)},</p>
        <p>He recibido tu mensaje y te responderé lo antes posible.</p>
        <hr/>
        <p class="muted" style="color:#9ca3af">Si no fuiste tú, ignora este correo.</p>
      `
    });

    // respuesta OK
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true, idYou: toYou?.id, idClient: toClient?.id }));

  } catch (err) {
    console.error('[contact] 500', err?.message || err, err?.response || '');
    // Intenta exponer un mensaje legible si viene de Resend
    let detail = null;
    if (err && err.response && typeof err.response === 'object') {
      try { detail = JSON.stringify(err.response); } catch { }
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Email failed', detail: err?.message || null, extra: detail }));
  }
};