import { Resend } from 'resend';

const { RESEND_API_KEY, TO_EMAIL, FROM_EMAIL, NODE_ENV } = process.env;
const resend = new Resend(RESEND_API_KEY || '');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { name, email, message, nickname } = req.body || {};

    // Honeypot anti-spam
    if (nickname && String(nickname).trim() !== '') {
      return res.status(200).json({ ok: true });
    }

    // Validaciones
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (String(message).length > 5000) return res.status(400).json({ error: 'Message too long' });

    // 1) Email para TI (notificación)
    const ownerHtml = `
      <h2>Nuevo mensaje desde syco.dev</h2>
      <p><strong>Nombre:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Mensaje:</strong><br>${esc(message).replace(/\n/g, '<br/>')}</p>
    `;

    // 2) Email para ELLOS (acuse)
    const ackHtml = `
      <div style="font-family: Inter, Arial, sans-serif; background-color: #f9fafb; padding: 32px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px;">
          <h2 style="font-size: 20px; color: #111827; margin-bottom: 12px;">¡Hola ${esc(name)}!</h2>
          <p style="font-size: 15px; color: #374151; line-height: 1.6;">
            Gracias por ponerte en contacto conmigo a través de <strong>syco.dev</strong>.<br>
            He recibido tu mensaje y te responderé personalmente en cuanto me sea posible.
          </p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 14px; color: #6b7280;">Tu mensaje:</p>
          <blockquote style="font-size: 14px; color: #374151; margin: 8px 0 20px; padding: 12px 16px; background:#f3f4f6; border-left: 3px solid #3b82f6; border-radius: 4px;">
            ${esc(message).replace(/\n/g, '<br/>')}
          </blockquote>
          <p style="font-size: 15px; color: #111827; margin-bottom: 24px;">— Andreu Simonet<br><span style="color:#6b7280;">syco.dev</span></p>
          <a href="https://syco.dev" style="display:inline-block; background:#3b82f6; color:white; padding:10px 18px; border-radius:8px; text-decoration:none; font-size:14px;">
            Visitar mi portfolio
          </a>
        </div>
        <p style="text-align:center; font-size:12px; color:#9ca3af; margin-top:24px;">
          Este correo fue enviado automáticamente desde <strong>syco.dev</strong>
        </p>
      </div>
    `;

    // Enviamos ambos en paralelo
    const [ownerRes, ackRes] = await Promise.allSettled([
      await resend.emails.send({
        from: FROM_EMAIL,      // p.ej. "Portfolio <contact@syco.dev>"
        to: TO_EMAIL,          // p.ej. "contact@syco.dev" (Cloudflare lo reenvía a tu inbox)
        subject: `Nuevo contacto: ${esc(name)}`,
        html: ownerHtml,
        reply_to: email        // responderás directo a quien escribió
      }),
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Hemos recibido tu mensaje — syco.dev`,
        html: ackHtml,
        text: `¡Hola ${name}!\n\nGracias por contactarme a través de syco.dev.\nHe recibido tu mensaje y te responderé en cuanto pueda.\n\nTu mensaje:\n${message}\n\n— Andreu Simonet\nsyco.dev`,
        reply_to: TO_EMAIL
      })
    ]);

    // Si el aviso a TI falla, consideramos error; si solo falla el acuse, devolvemos 200 pero avisamos
    if (ownerRes.status === 'rejected') {
      console.error('[contact] owner email failed:', ownerRes.reason);
      return res.status(500).json({ error: 'Email failed (owner)' });
    }
    if (ackRes.status === 'rejected') {
      console.warn('[contact] ack email failed:', ackRes.reason);
      return res.status(200).json({ ok: true, ack: 'failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] email failed name:', err?.name);
    console.error('[contact] email failed message:', err?.message);
    console.error('[contact] email failed status:', err?.statusCode || err?.status);
    if (err?.response?.data) console.error('[contact] response.data:', err.response.data);

    const payload = NODE_ENV === 'development'
      ? { error: 'Email failed', detail: err?.message || String(err) }
      : { error: 'Email failed' };

    return res.status(500).json(payload);
  }
}