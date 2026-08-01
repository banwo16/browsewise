/* ==========================================================================
   store.js — Data access layer for BrowseWise CMS.

   Backed by Netlify Blobs (free, zero-config, built into every Netlify site).
   Every function here is intentionally small and self-contained so this file
   is the ONLY place that needs to change if you later migrate to Supabase,
   Firebase, or Postgres — nothing in the functions or frontend talks to
   Blobs directly.
   ========================================================================== */

const { getStore } = require('@netlify/blobs');

const PRODUCTS_STORE = 'browsewise-products';
const META_STORE = 'browsewise-meta';
const ANALYTICS_STORE = 'browsewise-analytics';

const INDEX_KEY = 'product-index';
const CATEGORIES_KEY = 'categories';

const DEFAULT_CATEGORIES = [
  'Electronics', 'Kitchen', 'Home', 'Fitness', 'Gaming',
  'Fashion', 'Beauty', 'Pets', 'Travel', 'Gifts',
];

/** Builds getStore() args. Uses explicit siteID/token if provided (needed on
 *  some sites where Netlify's automatic Blobs context isn't injected —
 *  e.g. sites originally created via drag-and-drop deploy). Falls back to
 *  zero-config auto-detection otherwise. */
function storeArgs(name) {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) {
    return { name, siteID, token };
  }
  return name;
}

function productsStore() {
  return getStore(storeArgs(PRODUCTS_STORE));
}
function metaStore() {
  return getStore(storeArgs(META_STORE));
}
function analyticsStore() {
  return getStore(storeArgs(ANALYTICS_STORE));
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ---------------- Product index (list of ids, kept small for fast listing) ---------------- */

async function getIndex() {
  const store = productsStore();
  const idx = await store.get(INDEX_KEY, { type: 'json' });
  return idx || [];
}

async function saveIndex(ids) {
  const store = productsStore();
  await store.setJSON(INDEX_KEY, ids);
}

/* ---------------- Products ---------------- */

/** Returns all products. If publishedOnly is true, hidden/unpublished items are excluded. */
async function listProducts({ publishedOnly = false } = {}) {
  const store = productsStore();
  const ids = await getIndex();
  const products = await Promise.all(
    ids.map((id) => store.get(`product:${id}`, { type: 'json' }))
  );
  const clean = products.filter(Boolean);
  clean.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return publishedOnly ? clean.filter((p) => p.published !== false) : clean;
}

async function getProduct(idOrSlug) {
  const all = await listProducts();
  return all.find((p) => String(p.id) === String(idOrSlug) || p.slug === idOrSlug) || null;
}

/** Creates or updates a product. Returns the saved record. */
async function saveProduct(input) {
  const store = productsStore();
  const now = new Date().toISOString();
  const isNew = !input.id;
  const id = input.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const slug = input.slug ? slugify(input.slug) : slugify(input.title || id);

  const existing = isNew ? null : await store.get(`product:${id}`, { type: 'json' });

  const record = {
    id,
    slug,
    title: input.title || '',
    description: input.description || '',
    shortDescription: input.shortDescription || '',
    category: input.category || 'Gifts',
    brand: input.brand || '',
    price: input.price || '',
    oldPrice: input.oldPrice || '',
    image: input.image || '',
    gallery: Array.isArray(input.gallery) ? input.gallery : [],
    retailer: input.retailer || '',
    affiliateNetwork: input.affiliateNetwork || '',
    originalUrl: input.originalUrl || '',
    affiliateUrl: input.affiliateUrl || '',
    rating: input.rating ?? null,
    reviews: input.reviews ?? null,
    availability: input.availability || 'In Stock',
    featured: Boolean(input.featured),
    published: input.published !== false,
    seoTitle: input.seoTitle || '',
    seoDescription: input.seoDescription || '',
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    features: Array.isArray(input.features) ? input.features : [],
    pros: Array.isArray(input.pros) ? input.pros : [],
    cons: Array.isArray(input.cons) ? input.cons : [],
    faq: Array.isArray(input.faq) ? input.faq : [],
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await store.setJSON(`product:${id}`, record);

  if (isNew) {
    const ids = await getIndex();
    ids.push(id);
    await saveIndex(ids);
  }

  return record;
}

async function deleteProduct(id) {
  const store = productsStore();
  await store.delete(`product:${id}`);
  const ids = await getIndex();
  await saveIndex(ids.filter((existingId) => existingId !== id));
  return true;
}

/* ---------------- Categories ---------------- */

async function listCategories() {
  const store = metaStore();
  const cats = await store.get(CATEGORIES_KEY, { type: 'json' });
  return cats && cats.length ? cats : DEFAULT_CATEGORIES;
}

async function saveCategories(categories) {
  const store = metaStore();
  const clean = [...new Set(categories.map((c) => c.trim()).filter(Boolean))];
  await store.setJSON(CATEGORIES_KEY, clean);
  return clean;
}

/* ---------------- Analytics: clicks & conversions (structure only, ready for automation) ---------------- */

async function trackClick(productId) {
  const store = analyticsStore();
  const key = `clicks:${productId}`;
  const current = (await store.get(key, { type: 'json' })) || { productId, count: 0, lastClickedAt: null };
  current.count += 1;
  current.lastClickedAt = new Date().toISOString();
  await store.setJSON(key, current);
  return current;
}

async function trackConversion(productId, meta = {}) {
  const store = analyticsStore();
  const key = `conversions:${productId}`;
  const current = (await store.get(key, { type: 'json' })) || { productId, count: 0, events: [] };
  current.count += 1;
  current.events.push({ at: new Date().toISOString(), ...meta });
  await store.setJSON(key, current);
  return current;
}

async function getAnalytics(productId) {
  const store = analyticsStore();
  const [clicks, conversions] = await Promise.all([
    store.get(`clicks:${productId}`, { type: 'json' }),
    store.get(`conversions:${productId}`, { type: 'json' }),
  ]);
  return {
    clicks: clicks || { productId, count: 0, lastClickedAt: null },
    conversions: conversions || { productId, count: 0, events: [] },
  };
}

module.exports = {
  slugify,
  listProducts,
  getProduct,
  saveProduct,
  deleteProduct,
  listCategories,
  saveCategories,
  trackClick,
  trackConversion,
  getAnalytics,
  DEFAULT_CATEGORIES,
};
