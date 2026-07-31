/* ==========================================================================
   ebay.js — eBay Partner Network (EPN) integration.

   eBay listing pages generally expose usable JSON-LD, so the generic
   extractor tends to work reasonably well here. For guaranteed accuracy
   (and to earn commission correctly) swap `extract()` for the official
   eBay Browse API / Finding API using EPN credentials when you have them.
   ========================================================================== */

const { genericExtract } = require('./_generic-extractor');

const NETWORK = 'ebay';

function detect(url) {
  return /ebay\.[a-z.]+\//i.test(url);
}

function parseUrl(url) {
  const idMatch = url.match(/\/itm\/(?:.*?\/)?(\d+)/i);
  return { network: NETWORK, itemId: idMatch ? idMatch[1] : null };
}

async function extract(url) {
  try {
    const data = await genericExtract(url);
    return { ...data, source: 'ebay-generic', manualEntryRequired: !data.title };
  } catch (err) {
    return {
      source: 'ebay-failed',
      note: `Could not fetch product data automatically (${err.message}). Enter details manually, or integrate the eBay Browse API with EPN credentials.`,
      manualEntryRequired: true,
    };
  }
}

/** Builds an eBay Partner Network tracking link using EBAY_CAMPAIGN_ID env var. */
function buildAffiliateUrl(originalUrl, { campaignId } = {}) {
  const campid = campaignId || process.env.EBAY_CAMPAIGN_ID;
  if (!campid) return originalUrl;
  try {
    const u = new URL(originalUrl);
    u.searchParams.set('mkevt', '1');
    u.searchParams.set('mkcid', '1');
    u.searchParams.set('campid', campid);
    return u.toString();
  } catch (e) {
    return originalUrl;
  }
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
