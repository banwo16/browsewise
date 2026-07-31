/* ==========================================================================
   categories.js — Category management.
   GET  → list categories (public)
   POST → replace category list (admin only), body: { categories: [...] }
   ========================================================================== */

const { requireAuth, jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const categories = await store.listCategories();
      return jsonResponse(200, { categories });
    }

    if (event.httpMethod === 'POST') {
      if (!requireAuth(event)) return jsonResponse(401, { error: 'Unauthorized' });
      const input = JSON.parse(event.body || '{}');
      if (!Array.isArray(input.categories)) {
        return jsonResponse(400, { error: '"categories" must be an array' });
      }
      const categories = await store.saveCategories(input.categories);
      return jsonResponse(200, { categories });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('categories function error:', err);
    return jsonResponse(500, { error: err.message || 'Internal error' });
  }
};
