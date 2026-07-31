/* ==========================================================================
   track-click.js — Records an affiliate click. Public endpoint (called from
   the storefront when someone hits "View Deal"). Fire-and-forget: the
   frontend does not wait on this before opening the affiliate link.
   ========================================================================== */

const { jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  try {
    const { productId } = JSON.parse(event.body || '{}');
    if (!productId) return jsonResponse(400, { error: 'Missing productId' });
    const result = await store.trackClick(productId);
    return jsonResponse(200, { ok: true, clicks: result.count });
  } catch (err) {
    console.error('track-click error:', err);
    // Never block the shopping experience over an analytics failure.
    return jsonResponse(200, { ok: false });
  }
};
