/* ==========================================================================
   amazon.js — Amazon Associates integration.

   IMPORTANT: Amazon actively blocks server-side scraping and its terms of
   service require using the official Product Advertising API (PA-API) for
   programmatic product data — not HTML scraping. This module parses the
   ASIN from the URL and builds a correct Associates tracking link, but
   `extract()` intentionally does NOT scrape amazon.com. It returns the
   parsed ASIN and a note so the review screen prompts for manual entry
   (or, if you add PA-API credentials later, that call slots in right here).
   ========================================================================== */

const NETWORK = 'amazon';

function detect(url) {
  return /amazon\.[a-z.]+\//i.test(url) || /amzn\.to\//i.test(url);
}

function parseUrl(url) {
  const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
  return {
    network: NETWORK,
    asin: asinMatch ? asinMatch[1] : null,
    marketplace: (url.match(/amazon\.([a-z.]+)\//i) || [])[1] || 'com',
  };
}

async function extract(url) {
  const { asin, marketplace } = parseUrl(url);
  return {
    source: 'amazon-manual-required',
    sku: asin,
    title: '',
    description: '',
    image: '',
    price: '',
    note: asin
      ? `Detected ASIN ${asin} (amazon.${marketplace}). Amazon blocks scraping — connect the Product Advertising API (PA-API) for automatic data, or fill in the fields manually below.`
      : 'Could not detect an ASIN in this URL. Double-check it is a direct Amazon product link.',
    manualEntryRequired: true,
  };
}

/** Builds an Amazon Associates tracking link using AMAZON_ASSOCIATE_TAG env var. */
function buildAffiliateUrl(originalUrl, { associateTag } = {}) {
  const tag = associateTag || process.env.AMAZON_ASSOCIATE_TAG;
  if (!tag) return originalUrl;
  try {
    const u = new URL(originalUrl);
    u.searchParams.set('tag', tag);
    return u.toString();
  } catch (e) {
    return originalUrl;
  }
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
