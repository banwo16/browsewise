/* ==========================================================================
   sitemap.js — Generates sitemap.xml dynamically on every request.

   Unlike a static sitemap.xml file, this pulls the live, published product
   list from the CMS on every request, so it automatically includes new
   products the moment they're published — no manual updates, no stale data.
   Served at /sitemap.xml via the redirect in netlify.toml.
   ========================================================================== */

const store = require('../lib/store');

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/products.html', changefreq: 'daily', priority: '0.9' },
  { path: '/quiz.html', changefreq: 'monthly', priority: '0.6' },
  { path: '/about.html', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact.html', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy.html', changefreq: 'yearly', priority: '0.2' },
  { path: '/affiliate-disclosure.html', changefreq: 'yearly', priority: '0.2' },
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, changefreq, priority, lastmod }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

exports.handler = async () => {
  const siteUrl = (process.env.SITE_URL || 'https://browsewise.ca').replace(/\/$/, '');

  let products = [];
  try {
    products = await store.listProducts({ publishedOnly: true });
  } catch (err) {
    console.error('sitemap: failed to load products, continuing with static pages only', err);
  }

  const entries = [
    ...STATIC_PAGES.map((p) =>
      urlEntry({ loc: `${siteUrl}${p.path}`, changefreq: p.changefreq, priority: p.priority })
    ),
    ...products.map((p) =>
      urlEntry({
        loc: `${siteUrl}/product.html?slug=${encodeURIComponent(p.slug)}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: p.updatedAt ? p.updatedAt.split('T')[0] : undefined,
      })
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
    body: xml,
  };
};
