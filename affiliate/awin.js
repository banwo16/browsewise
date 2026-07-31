/* ==========================================================================
   awin.js — Awin integration.

   Awin deep links follow a predictable format:
     https://www.awin1.com/cread.php?awinmid=<merchantId>&awinaffid=<affiliateId>&clickref=&p=<url-encoded destination>
   That means, unlike CJ/Impact, we CAN usually recover the real destination
   product URL from the "p" parameter and run the generic extractor against
   it — this module does exactly that.
   ========================================================================== */

const { genericExtract } = require('./_generic-extractor');

const NETWORK = 'awin';

function detect(url) {
  return /awin1\.com\/cread\.php/i.test(url) || /awin\.com\//i.test(url);
}

function parseUrl(url) {
  let destination = null;
  try {
    const u = new URL(url);
    const p = u.searchParams.get('p');
    destination = p ? decodeURIComponent(p) : null;
  } catch (e) {
    /* ignore */
  }
  return { network: NETWORK, destinationUrl: destination };
}

async function extract(url) {
  const { destinationUrl } = parseUrl(url);
  if (!destinationUrl) {
    return {
      source: 'awin-manual-required',
      note: 'Could not find a destination URL in the Awin link\'s "p" parameter. Fill in details manually.',
      manualEntryRequired: true,
    };
  }
  try {
    const data = await genericExtract(destinationUrl);
    return { ...data, source: 'awin-generic', manualEntryRequired: !data.title };
  } catch (err) {
    return {
      source: 'awin-failed',
      note: `Found destination ${destinationUrl} but couldn't fetch its product data (${err.message}). Fill in details manually.`,
      manualEntryRequired: true,
    };
  }
}

/** Builds an Awin deep link using AWIN_MERCHANT_ID and AWIN_AFFILIATE_ID env vars. */
function buildAffiliateUrl(originalUrl, { merchantId, affiliateId } = {}) {
  const mid = merchantId || process.env.AWIN_MERCHANT_ID;
  const affid = affiliateId || process.env.AWIN_AFFILIATE_ID;
  if (!mid || !affid) return originalUrl;
  const p = encodeURIComponent(originalUrl);
  return `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${affid}&clickref=&p=${p}`;
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
