/* ==========================================================================
   collections.js — Shareable wishlist snapshots. Public endpoint (no login):

   POST { slugs: [...] }  → saves a snapshot, returns { id }
   GET  ?id=xxxxxxxx        → returns { slugs: [...] } for that snapshot
   ========================================================================== */

const { jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return jsonResponse(400, { error: 'Invalid request body' });
      }

      if (!Array.isArray(body.slugs) || !body.slugs.length) {
        return jsonResponse(400, { error: 'A non-empty list of product slugs is required' });
      }

      const id = await store.saveCollection(body.slugs);
      return jsonResponse(200, { id });
    }

    if (event.httpMethod === 'GET') {
      const { id } = event.queryStringParameters || {};
      if (!id) return jsonResponse(400, { error: 'Missing id' });

      const collection = await store.getCollection(id);
      if (!collection) return jsonResponse(404, { error: 'Collection not found' });

      return jsonResponse(200, collection);
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('collections function error:', err);
    return jsonResponse(500, { error: err.message || 'Internal error' });
  }
};
