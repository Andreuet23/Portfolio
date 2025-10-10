// api/posts.js
import { kv } from '@vercel/kv';

/**
 * ESQUEMA (igual que feed.js):
 * - Lista:  posts:ids           → orden cronológico (nuevo primero si usamos LPUSH)
 * - Hash:   post:{id}           → contenido del post (campos string)
 *
 * Notas:
 * - tags e images se guardan como JSON string para mantener compatibilidad.
 * - GET es público; POST/DELETE requieren sesión admin (Authorization: Bearer ak_xxx)
 */

function kvReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function toArraySafe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[') || s.startsWith('{')) {
      try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []; } catch { }
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  try { const parsed = JSON.parse(String(v)); return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : []; } catch { return []; }
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s = '') {
  return String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function nowMs() { return Date.now(); }

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

async function isAdmin(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const token = m[1];
  try {
    // Usamos la misma KV para sesiones: auth:session:{token} → email
    const owner = await kv.get(`auth:session:${token}`);
    return Boolean(owner);
  } catch {
    return false;
  }
}

/* ===================== HANDLER ===================== */

export default async function handler(req, res) {
  try {
    if (!kvReady()) {
      res.status(500).json({ error: 'KV not configured' });
      return;
    }

    /* ---------- GET: listar posts (público) ---------- */
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

      // La lista ya está ordenada (nuevo primero si hicimos LPUSH).
      const ids = await kv.lrange('posts:ids', 0, limit - 1);

      let items = [];
      if (Array.isArray(ids) && ids.length) {
        const rows = await Promise.all(ids.map(id => kv.hgetall(`post:${id}`)));
        items = rows.map((p, i) => {
          const id = ids[i];
          const title = p?.title ?? '';
          const slug = (p?.slug ?? slugify(title)) || `post-${i}`;
          const contentHtml = String(p?.contentHtml ?? '');
          const excerpt = p?.excerpt ?? stripHtml(contentHtml).slice(0, 180);
          const cover = p?.cover ?? null;
          const createdAt = p?.createdAt ?? new Date().toISOString();
          const createdAtMs = Number(p?.createdAtMs ?? nowMs());
          const updatedAt = p?.updatedAt ?? null;
          const tags = toArraySafe(p?.tags);
          const images = toArraySafe(p?.images);

          return {
            id,
            slug,
            title,
            excerpt,
            contentHtml,
            cover,
            createdAt,
            createdAtMs,
            updatedAt,
            tags,
            images
          };
        });
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send({ ok: true, items, nextCursor: null });
      return;
    }

    /* ---------- POST: crear post (privado) ---------- */
    if (req.method === 'POST') {
      if (!(await isAdmin(req))) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const body = await readJsonBody(req).catch(() => null);
      const title = String(body?.title || '').trim();
      const contentHtml = String(body?.contentHtml || '').trim();
      const cover = body?.cover ?? null;
      const tags = toArraySafe(body?.tags);
      const images = toArraySafe(body?.images);

      if (!title || !contentHtml) {
        res.status(400).json({ error: 'validation', detail: ['Missing title or contentHtml'] });
        return;
      }

      const createdAtMs = nowMs();
      const slug = slugify(body?.slug || title) || `post-${createdAtMs}`;
      const id = `${slug}-${createdAtMs}`;
      const excerpt = stripHtml(contentHtml).slice(0, 180);
      const createdAt = new Date(createdAtMs).toISOString();

      // Guardar hash del post (strings)
      await kv.hset(`post:${id}`, {
        id,
        slug,
        title,
        excerpt,
        contentHtml,
        cover: cover || '',
        createdAt,
        createdAtMs: String(createdAtMs),
        updatedAt: '',
        tags: JSON.stringify(tags),
        images: JSON.stringify(images)
      });

      // Insertar al principio de la lista (nuevo primero)
      await kv.lpush('posts:ids', id);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send({
        ok: true,
        post: {
          id, slug, title, excerpt, contentHtml, cover, createdAt, createdAtMs, updatedAt: null, tags, images
        }
      });
      return;
    }

    /* ---------- DELETE: borrar post (privado) ---------- */
    if (req.method === 'DELETE') {
      if (!(await isAdmin(req))) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }

      const id = String(req.query.id || '').trim();
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }

      // Eliminar hash y quitar de la lista
      await kv.del(`post:${id}`);
      await kv.lrem('posts:ids', 0, id);

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).send({ ok: true, id });
      return;
    }

    res.setHeader('Allow', 'GET,POST,DELETE');
    res.status(405).send('Method Not Allowed');
  } catch (err) {
    console.error('[api/posts] 500', err);
    res.status(500).json({ error: 'Server error', detail: err?.message || String(err) });
  }
}