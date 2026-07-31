/* ==========================================================================
   import-extract.js — POST { url } → { network, parsed, extracted }
   Admin only. Step 1 of the import workflow (see admin/import.html):
   paste a URL, detect the platform, pull whatever data is safely available.
   ========================================================================== */

const { requireAuth, jsonResponse } = require('../lib/auth');
const { detectNetwork } = require('../../affiliate');

exports.handler = async (event) => {
  if (!requireAuth(event)) return jsonResponse(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  const { url } = body;
  if (!url) return jsonResponse(400, { error: 'Missing url' });

  let validUrl;
  try {
    validUrl = new URL(url).toString();
  } catch (e) {
    return jsonResponse(400, { error: 'That does not look like a valid URL' });
  }

  const module = detectNetwork(validUrl);

  try {
    const parsed = module.parseUrl(validUrl);
    const extracted = await module.extract(validUrl);
    const affiliateUrl = module.buildAffiliateUrl(validUrl);

    return jsonResponse(200, {
      network: module.NETWORK,
      originalUrl: validUrl,
      affiliateUrl,
      parsed,
      extracted,
    });
  } catch (err) {
    console.error('import-extract error:', err);
    return jsonResponse(200, {
      network: module.NETWORK,
      originalUrl: validUrl,
      affiliateUrl: validUrl,
      parsed: {},
      extracted: {
        source: 'error',
        note: `Extraction failed: ${err.message}. Enter product details manually.`,
        manualEntryRequired: true,
      },
    });
  }
};
