/* ==========================================================================
   cj.js — CJ Affiliate (Commission Junction) integration.

   CJ links are redirect/tracking URLs (e.g. www.anrdoezrs.net, www.dpbolvw.net,
   www.tkqlhce.com, www.jdoqocy.com) that wrap a destination retailer URL in a
   query parameter, rather than a normal product page. There is no public
   product-detail scraping target here — real product data comes from CJ's
   Product Search API (Personal Access Token required, scoped per advertiser).
   `extract()` decodes the wrapped destination URL so a human can review it,
   but does not fabricate product data.
   ========================================================================== */

const NETWORK = 'cj';

const CJ_HOSTS = ['anrdoezrs.net', 'dpbolvw.net', 'tkqlhce.com', 'jdoqocy.com', 'kqzyfj.com'];

function detect(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return CJ_HOSTS.includes(host) || /cj\.com|commission-junction/i.test(url);
  } catch (e) {
    return false;
  }
}

function parseUrl(url) {
  let destination = null;
  try {
    const u = new URL(url);
    destination = u.searchParams.get('url') || u.searchParams.get('durl') || null;
  } catch (e) {
    /* ignore */
  }
  return { network: NETWORK, destinationUrl: destination };
}

async function extract(url) {
  const { destinationUrl } = parseUrl(url);
  return {
    source: 'cj-manual-required',
    title: '',
    description: '',
    image: '',
    price: '',
    note: destinationUrl
      ? `This is a CJ tracking link pointing to ${destinationUrl}. Product data isn't scraped automatically — connect the CJ Product Search API (Personal Access Token) for that advertiser, or fill in details manually.`
      : 'This looks like a CJ Affiliate tracking link. Product data requires the CJ Product Search API — fill in details manually for now.',
    manualEntryRequired: true,
  };
}

/** CJ links are already affiliate links generated in the CJ dashboard — pass through as-is. */
function buildAffiliateUrl(originalUrl) {
  return originalUrl;
}

module.exports = { NETWORK, detect, parseUrl, extract, buildAffiliateUrl };
