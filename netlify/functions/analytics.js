/* ==========================================================================
   analytics.js — Admin-only read of click/conversion counts for a product.
   Conversion tracking has a data structure and endpoint ready now (see
   store.trackConversion) but nothing calls it automatically yet — most
   affiliate networks require a server-to-server postback integration that's
   specific to your CJ/Impact/Awin account, which is a follow-up step.
   ========================================================================== */

const { requireAuth, jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

exports.handler = async (event) => {
  if (!requireAuth(event)) return jsonResponse(401, { error: 'Unauthorized' });
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' });

  const { productId } = event.queryStringParameters || {};
  if (!productId) return jsonResponse(400, { error: 'Missing productId' });

  const data = await store.getAnalytics(productId);
  return jsonResponse(200, data);
};
