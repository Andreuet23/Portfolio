import fg from 'fast-glob';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { marked } from 'marked';

const SITE = {
  title: 'Andreu Simonet',
  url: 'https://andreuet23.github.io/Portfolio',
  feedUrl: 'https://andreuet23.github.io/Portfolio/rss.xml',
  description: 'Portfolio to introduce myself and share my job and learning process.'
};

const contentDir = 'content';
const outJson = 'src/assets/posts.json';
const outRss = 'public/rss.xml';
await fs.mkdir('public', { recursive: true });
await fs.mkdir('src/assets', { recursive: true });

const files = await fg(`${contentDir}/**/*.md`);
const posts = [];

for (const file of files) {
  const raw = await fs.readFile(file, 'utf-8');
  const { data, content } = matter(raw);
  const slug = data.slug || file.split('/').pop().replace(/\.md$/, '');
  const html = marked.parse(content);
  posts.push({
    slug,
    title: data.title ?? slug,
    excerpt: data.excerpt ?? '',
    contentHtml: html,
    cover: data.cover ?? null,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? null,
    tags: data.tags ?? []
  });
}

posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
await fs.writeFile(outJson, JSON.stringify(posts, null, 2), 'utf-8');

const items = posts.slice(0, 50).map(p => `
  <item>
    <title><![CDATA[${p.title}]]></title>
    <link>${SITE.url}/post/${p.slug}</link>
    <guid isPermaLink="true">${SITE.url}/post/${p.slug}</guid>
    <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
    <description><![CDATA[${p.excerpt || p.contentHtml.slice(0, 300)}]]></description>
  </item>
  `).join('');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title><![CDATA[${SITE.title}]]></title>
      <link>${SITE.url}</link>
      <description><![CDATA[${SITE.description}]]></description>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <language>en</language>
      <atom:link xmlns:atom="https://www.w3.org/2005/Atom" href="${SITE.feedUrl}" rel="self" type="application/rss+xml"/>
      ${items}
    </channel>
  </rss>`;

await fs.writeFile(outRss, rss.trim(), 'utf-8');
console.log(`OK: ${posts.length} posts -> posts.json y rss.xml`);