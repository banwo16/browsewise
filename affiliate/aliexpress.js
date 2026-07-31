/* ==========================================================================
   aliexpress.js — AliExpress Affiliate integration.

   Product pages are heavily client-rendered, so the generic OG/JSON-LD
   extractor will often get partial data at best (usually title + image).
   For reliable data and correctly tracked links, use the AliExpress
   Affiliate API ("Portals") with an App Key/Secret — this module is
   structured so that call can replace `extract()`/`buildAffiliateUrl()`
   without touching anything else in the CMS.
   ========================================================================== */

const { genericExtract } = require('./_generic-extractor');

const NETWORK = 'aliexpress';

function detect(url) {
  return /aliexpress\.[a-z.]+\//i.test(url) || /a\.aliexpress\.com\//i.test(url);
}

function parseUrl(url) {
  const idMatch = url.match(/\/item\/(?:.*?)?(\d+)\.html/i);
  return { network: NETWORK, productId: idMatch ? idMatch[1] : null };
}

async function extract(url) {
  try {
    const data = await genericExtract(url);
    return { ...data, source: 'aliexpress-generic', manualEntryRequired: !data.title };
  } catch (err) {
    return {
      source: 'aliexpress-failed',
      note: `Could not fetch product data automatically (${err.message}). AliExpress pages are often JavaScript-rendered — enter details manually, or integrate the AliExpress Affiliate API for reliable extraction.`,
      manualEntryRequired: true,
    };
  }
}

/** Builds an AliExpress affiliate link. Requires ALIEXPRESS_TRACKING_ID for real tracking. */
function buildAffiliateUrl(originalUrl, { trackingId } = {}) {
  const id = trackingId || process.env.ALIEXPRESS_TRACKING_ID;
  if (!id) return originalUrl;
  try {
    const u = new URL(originalUrl);
    u.searchParams.set('aff_trace_key', id);
    return u.toString();
  } catch (e) {
    return originalUrl;
  }
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
