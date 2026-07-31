/* ==========================================================================
   _generic-extractor.js — Best-effort product data extraction from a page's
   Open Graph tags and JSON-LD structured data (schema.org/Product).

   This is NOT a replacement for an official affiliate/retailer API. Many
   marketplaces (Amazon in particular) block or heavily rate-limit
   server-side requests and prohibit scraping in their terms of service —
   use their official Product Advertising / Partner APIs for those. This
   generic extractor exists as a reasonable fallback for retailers that
   expose clean OG/JSON-LD metadata, and to pre-fill the review screen so a
   human always double-checks before anything publishes.
   ========================================================================== */

const cheerio = require('cheerio');

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`Fetch failed with status ${res.status}`);
  }
  return res.text();
}

function parseJsonLdProduct($) {
  let product = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    try {
      const parsed = JSON.parse($(el).contents().text());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const found = items.find((item) => {
        const type = item['@type'];
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      });
      if (found) product = found;
    } catch (e) {
      /* ignore malformed JSON-LD blocks */
    }
  });
  return product;
}

function meta($, name) {
  return (
    $(`meta[property="${name}"]`).attr('content') ||
    $(`meta[name="${name}"]`).attr('content') ||
    ''
  ).trim();
}

/** Extracts whatever it reasonably can. Missing fields are left empty for manual entry. */
async function genericExtract(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const ld = parseJsonLdProduct($) || {};

  const offers = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;

  const title = ld.name || meta($, 'og:title') || $('title').first().text().trim();
  const description =
    ld.description || meta($, 'og:description') || meta($, 'description');
  const image =
    (Array.isArray(ld.image) ? ld.image[0] : ld.image) || meta($, 'og:image');
  const gallery = Array.isArray(ld.image) ? ld.image.slice(0, 6) : [];
  const price = offers?.price ? String(offers.price) : '';
  const currency = offers?.priceCurrency || '';
  const brand = typeof ld.brand === 'object' ? ld.brand?.name : ld.brand;
  const rating = ld.aggregateRating?.ratingValue ? Number(ld.aggregateRating.ratingValue) : null;
  const reviews = ld.aggregateRating?.reviewCount ? Number(ld.aggregateRating.reviewCount) : null;
  const availability = offers?.availability
    ? String(offers.availability).replace('https://schema.org/', '')
    : '';
  const sku = ld.sku || ld.mpn || '';

  return {
    title,
    description,
    image,
    gallery,
    price: price ? `${currency ? currency + ' ' : '$'}${price}` : '',
    brand: brand || '',
    rating,
    reviews,
    availability: availability || '',
    sku,
    source: 'generic-og-jsonld',
    extractedFields: {
      title: Boolean(title),
      description: Boolean(description),
      image: Boolean(image),
      price: Boolean(price),
      brand: Boolean(brand),
      rating: Boolean(rating),
    },
  };
}

module.exports = { genericExtract, fetchHtml };
