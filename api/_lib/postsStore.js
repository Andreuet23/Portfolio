// api/_lib/postsStore.js
const { Redis } = require('@upstash/redis');

/** ========= Resolución de ENV coherente =========
 * Priorizamos, en este orden, para evitar leer distintas bases sin querer:
 * 1) UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (donde creaste los 3 posts)
 * 2) KV_REST_API_URL / KV_REST_API_TOKEN                (naming nuevo)
 * 3) KV_URL / REDIS_URL                                 (fallback)
 */
function resolveUrl() {
  return (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.KV_URL ||
    process.env.REDIS_URL ||
    null
  );
}
function resolveToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    null
  );
}

function getRedis() {
  const url = resolveUrl();
  const token = resolveToken();
  if (!url || !token) throw new Error('[postsStore] Missing Redis url/token env');
  return new Redis({ url, token });
}

/** ======= Claves y utils ======= */
const KEY_ZSET = 'posts:all';
const KEY_POST = (id) => `post:${id}`;

function safeParse(json) { try { return JSON.parse(json); } catch { return null; } }
function nowMs() { return Date.now(); }

function scoreFromPost(p) {
  if (p?.createdAtMs) return Number(p.createdAtMs);
  if (p?.createdAt) {
    const t = Date.parse(p.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  return nowMs();
}

async function listKeys(redis, pattern) {
  try {
    const keys = await redis.keys(pattern);
    return Array.isArray(keys) ? keys : [];
  } catch {
    try { const resp = await redis.request(['KEYS', pattern]); return Array.isArray(resp) ? resp : []; }
    catch { return []; }
  }
}

/** Reconstruye posts:all desde post:* si el índice está vacío */
async function rebuildIndexIfNeeded(redis) {
  const count = await redis.zcard(KEY_ZSET).catch(() => 0);
  if (count > 0) return { rebuilt: 0 };

  const keys = await listKeys(redis, 'post:*');
  if (!keys.length) return { rebuilt: 0 };

  const values = await redis.mget(...keys);
  const posts = (values || []).map(safeParse).filter(Boolean);
  if (!posts.length) return { rebuilt: 0 };

  const tx = redis.multi();
  for (const p of posts) {
    const score = scoreFromPost(p);
    const id = p?.id || p?.slug || `post-${score}`;
    // asegura JSON bajo la clave normalizada
    tx.set(KEY_POST(id), JSON.stringify({
      ...p,
      id,
      createdAtMs: score,
      createdAt: p.createdAt || new Date(score).toISOString()
    }));
    // mete en índice
    tx.zadd(KEY_ZSET, { score, member: id });
  }
  await tx.exec();
  return { rebuilt: posts.length };
}

/** ============ API del store ============ */
async function getLatestPosts({ limit = 20, cursor = null } = {}) {
  const redis = getRedis();

  // Paginación por score descendente con zrange BYSCORE REV
  const maxScore = cursor ? (Number(cursor) - 1) : '+inf';
  const minScore = '-inf';

  let members = await redis.zrange(
    KEY_ZSET,
    maxScore,
    minScore,
    { byScore: true, rev: true, limit: { offset: 0, count: Math.min(limit, 100) } }
  );

  // Si índice vacío, intentar reconstruir desde post:*
  if ((!members || members.length === 0) && !cursor) {
    const { rebuilt } = await rebuildIndexIfNeeded(redis);
    if (rebuilt > 0) {
      members = await redis.zrange(
        KEY_ZSET,
        '+inf',
        '-inf',
        { byScore: true, rev: true, limit: { offset: 0, count: Math.min(limit, 100) } }
      );
    }
  }

  const keys = (members || []).map(id => KEY_POST(id));
  let posts = [];
  if (keys.length) {
    const values = await redis.mget(...keys);
    posts = (values || []).map(safeParse).filter(Boolean);
  }

  const last = posts[posts.length - 1];
  const nextCursor = last?.createdAtMs ? String(last.createdAtMs) : null;

  return { items: posts, nextCursor };
}

function slugify(s = '') {
  return String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createPost({ title, contentHtml, cover = null, tags = [], images = [] }) {
  const redis = getRedis();
  if (!title || !contentHtml) throw new Error('validation');

  const createdAtMs = nowMs();
  const slug = slugify(title) || `post-${createdAtMs}`;
  const id = `${slug}-${createdAtMs}`;
  const excerpt = String(contentHtml).replace(/<[^>]+>/g, '').slice(0, 180);

  const post = {
    id, slug, title, excerpt, contentHtml,
    cover: cover || null,
    createdAt: new Date(createdAtMs).toISOString(),
    createdAtMs,
    updatedAt: null,
    tags: Array.isArray(tags) ? tags : [],
    images: Array.isArray(images) ? images : []
  };

  await redis.multi()
    .set(KEY_POST(id), JSON.stringify(post))
    .zadd(KEY_ZSET, { score: createdAtMs, member: id })
    .exec();

  return post;
}

async function deletePost(id) {
  const redis = getRedis();
  await redis.multi()
    .del(KEY_POST(id))
    .zrem(KEY_ZSET, id)
    .exec();
  return { ok: true, id };
}

module.exports = {
  getLatestPosts,
  createPost,
  deletePost
};