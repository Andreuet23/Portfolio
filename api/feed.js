// api/feed.js
import { kv } from '@vercel/kv';

function kvReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const SITE_URL = (process.env.SITE_URL || 'https://syco.dev').replace(/\/+$/, '');
const FEED_TITLE = process.env.FEED_TITLE || 'syco.dev — Feed';
const FEED_DESC = process.env.FEED_DESC || 'Actualizaciones y posts de syco.dev';

function toArraySafe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === 'string') {
    const s = v.trim();
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
function xmlEscape(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function guessMime(url = '') {
  const u = url.toLowerCase();
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}
function absolutizeUrls(html = '', site = SITE_URL) {
  return String(html).replace(
    /(src|href)=["'](\/[^"']*)["']/g,
    (_, attr, path) => `${attr}="${site}${path}"`
  );
}

export default async function handler(req, res) {
  try {
    if (!kvReady()) {
      return res.status(500).json({ error: 'KV not configured' });
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const ids = await kv.lrange('posts:ids', 0, limit - 1);

    let items = [];
    if (Array.isArray(ids) && ids.length) {
      const rows = await Promise.all(ids.map(id => kv.hgetall(`post:${id}`)));
      items = rows.map((p, i) => {
        const slug = p?.slug || `post-${i}`;
        const link = `${SITE_URL}/post/${encodeURIComponent(slug)}`; // cambia si tu ruta es otra
        const title = p?.title || slug;
        const descPlain = stripHtml(p?.excerpt || p?.contentHtml || '');
        const html = absolutizeUrls(p?.contentHtml || '');
        const pubDate = new Date(p?.createdAt || Date.now()).toUTCString();
        const tags = toArraySafe(p?.tags);
        const images = toArraySafe(p?.images);
        const cover = p?.cover || (images[0] || null);
        return { id: ids[i], link, title, descPlain, html, pubDate, tags, cover };
      });
    }

    const selfLink = `${SITE_URL}/feed.xml`;
    const rssItems = items.map(it => {
      const cats = it.tags.map(t => `<category>${xmlEscape(t)}</category>`).join('');
      const enclosure = it.cover ? `<enclosure url="${xmlEscape(it.cover)}" type="${guessMime(it.cover)}" />` : '';
      const contentEncoded = it.html ? `<content:encoded><![CDATA[${it.html}]]></content:encoded>` : '';
      return `
        <item>
          <title>${xmlEscape(it.title)}</title>
          <link>${xmlEscape(it.link)}</link>
          <guid isPermaLink="false">${xmlEscape(it.link)}</guid>
          <pubDate>${it.pubDate}</pubDate>
          <description>${xmlEscape(it.descPlain)}</description>
          ${contentEncoded}
          ${cats}
          ${enclosure}
        </item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${xmlEscape(FEED_TITLE)}</title>
  <link>${xmlEscape(SITE_URL)}</link>
  <description>${xmlEscape(FEED_DESC)}</description>
  <language>es</language>
  <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${xmlEscape(selfLink)}" rel="self" type="application/rss+xml" />
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${rssItems}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, must-revalidate');
    return res.status(200).send(xml);
  } catch (e) {
    console.error('[api/feed] error', e);
    return res.status(500).json({ error: 'Feed generation failed' });
  }
}