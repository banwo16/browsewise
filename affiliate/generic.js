/* ==========================================================================
   generic.js — Fallback for any retailer URL that doesn't match a known
   network. Uses the OG/JSON-LD extractor and passes the URL through
   unchanged for affiliate linking (add your own tracking params manually,
   or extend the registry in index.js with a dedicated module).
   ========================================================================== */

const { genericExtract } = require('./_generic-extractor');

const NETWORK = 'other';

function detect() {
  return true; // catch-all — always matches last in the registry
}

function parseUrl(url) {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    /* ignore */
  }
  return { network: NETWORK, hostname };
}

async function extract(url) {
  try {
    const data = await genericExtract(url);
    return { ...data, source: 'generic', manualEntryRequired: !data.title };
  } catch (err) {
    return {
      source: 'generic-failed',
      note: `Could not fetch product data automatically (${err.message}). Fill in details manually.`,
      manualEntryRequired: true,
    };
  }
}

function buildAffiliateUrl(originalUrl) {
  return originalUrl;
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
