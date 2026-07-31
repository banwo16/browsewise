/* ==========================================================================
   impact.js — Impact.com integration.

   Like CJ, Impact tracking links (e.g. {yourprogram}.pxf.io, {yourprogram}.sjv.io)
   wrap a destination URL and don't expose scrapeable product pages directly.
   Real product data comes from the Impact "Catalog"/Product Feed API
   (Account SID + Auth Token, scoped per campaign).
   ========================================================================== */

const NETWORK = 'impact';

function detect(url) {
  return /\.(pxf|sjv|prf|7eer)\.io\//i.test(url) || /impact\.com\//i.test(url);
}

function parseUrl(url) {
  let destination = null;
  try {
    const u = new URL(url);
    destination = u.searchParams.get('u') || u.searchParams.get('url') || null;
  } catch (e) {
    /* ignore */
  }
  return { network: NETWORK, destinationUrl: destination };
}

async function extract(url) {
  const { destinationUrl } = parseUrl(url);
  return {
    source: 'impact-manual-required',
    title: '',
    description: '',
    image: '',
    price: '',
    note: destinationUrl
      ? `This is an Impact tracking link pointing to ${destinationUrl}. Connect the Impact Catalog/Product Feed API for that campaign for automatic data, or fill in details manually.`
      : 'This looks like an Impact affiliate tracking link. Product data requires the Impact API — fill in details manually for now.',
    manualEntryRequired: true,
  };
}

/** Impact links are already affiliate links generated in the Impact dashboard — pass through as-is. */
function buildAffiliateUrl(originalUrl) {
  return originalUrl;
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
