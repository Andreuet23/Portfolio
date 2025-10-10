import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { withCors } from './_cors';

/* -------------------- Helpers -------------------- */
function kvReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
function ipKey(ip) { return `rl:ip:${ip}`; }
function failKey(ip) { return `fails:ip:${ip}`; }
function lockKey(ip) { return `lock:ip:${ip}`; }
function apiKeyKey(k) { return `apikey:${k}`; }

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function toArraySafe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[') || s.startsWith('{')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
      } catch { }
    }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(String(v));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

/* -------------------- Handler -------------------- */
export default async function handler(req, res) {
  try {
    if (!kvReady()) {
      return res.status(500).json({
        error: 'KV not configured',
        hint: 'Run `vercel env pull .env` and ensure KV_* exist for Development/Production.'
      });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')?.[0] || req.socket.remoteAddress || 'unknown';

    /* ===== GET ===== */
    if (req.method === 'GET') {
      try {
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
        const ids = await kv.lrange('posts:ids', 0, limit - 1);

        if (!Array.isArray(ids) || ids.length === 0) {
          res.setHeader('Cache-Control', 'no-store');
          return res.status(200).json([]);
        }

        // lee cada hash sin pipeline (más estable)
        const hashes = await Promise.all(ids.map(id => kv.hgetall(`post:${id}`)));

        const posts = hashes.map((p, i) => ({
          id: ids[i],
          slug: p?.slug,
          title: p?.title,
          excerpt: p?.excerpt,
          contentHtml: p?.contentHtml,
          cover: p?.cover || null,
          createdAt: p?.createdAt,
          updatedAt: p?.updatedAt || null,
          tags: toArraySafe(p?.tags),
          images: toArraySafe(p?.images)
        }));

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(posts);
      } catch (e) {
        console.error('[api/posts GET] error', e);
        return res.status(500).json({ error: 'GET failed', detail: e?.message || String(e) });
      }
    }

    /* ===== POST ===== */
    if (req.method === 'POST') {
      try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
        if (!token) return res.status(401).json({ error: 'Missing token' });

        const record = await kv.get(apiKeyKey(token));
        if (!record) return res.status(401).json({ error: 'Unauthorized' });

        const body = req.body || {};
        const title = String(body.title || '').trim();
        const contentHtml = String(body.contentHtml || '').trim();
        if (!title || !contentHtml) return res.status(400).json({ error: 'Missing title or contentHtml' });

        const slugBase = body.slug ? String(body.slug).trim() : slugify(title);
        const nowIso = new Date().toISOString();
        const id = `${slugBase}-${Date.now()}`;

        const post = {
          slug: slugBase,
          title,
          excerpt: String(body.excerpt || '').trim(),
          contentHtml,
          cover: body.cover || null,
          createdAt: nowIso,
          updatedAt: null,
          tags: Array.isArray(body.tags) ? body.tags : [],
          images: Array.isArray(body.images) ? body.images : []
        };

        await kv.hset(`post:${id}`, {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          contentHtml: post.contentHtml,
          cover: post.cover || '',
          createdAt: post.createdAt,
          updatedAt: post.updatedAt || '',
          tags: JSON.stringify(post.tags || []),
          images: JSON.stringify(post.images || [])
        });
        await kv.lpush('posts:ids', id);

        res.setHeader('Cache-Control', 'no-store');
        return res.status(201).json({ ok: true, post: { id, ...post } });
      } catch (e) {
        console.error('[api/posts POST] error', e);
        return res.status(500).json({ error: 'POST failed', detail: e?.message || String(e) });
      }
    }

    /* ===== DELETE ===== */
    if (req.method === 'DELETE') {
      try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
        if (!token) return res.status(401).json({ error: 'Missing token' });

        const record = await kv.get(apiKeyKey(token));
        if (!record) return res.status(401).json({ error: 'Unauthorized' });

        const id = String(req.query.id || '').trim();
        if (!id) return res.status(400).json({ error: 'Missing id' });

        await kv.del(`post:${id}`);
        await kv.lrem('posts:ids', 0, id);

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ ok: true, id });
      } catch (e) {
        console.error('[api/posts DELETE] error', e);
        return res.status(500).json({ error: 'DELETE failed', detail: e?.message || String(e) });
      }
    }

    return res.status(405).send('Method Not Allowed');
  } catch (err) {
    console.error('[api/posts] fatal', err);
    return res.status(500).json({ error: 'Fatal server error', detail: err?.message || String(err) });
  }
}