/* ==========================================================================
   products.js — Product CRUD API.

   GET  /.netlify/functions/products                 → published products (public)
   GET  /.netlify/functions/products?all=1            → all products incl. hidden (admin only)
   GET  /.netlify/functions/products?id=xxx            → single product by id or slug
   POST /.netlify/functions/products                  → create/update a product (admin only)
   DELETE /.netlify/functions/products?id=xxx          → delete a product (admin only)
   ========================================================================== */

const { requireAuth, jsonResponse } = require('../lib/auth');
const store = require('../lib/store');

exports.handler = async (event) => {
  const isAuthed = requireAuth(event);
  const params = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      if (params.id) {
        const product = await store.getProduct(params.id);
        if (!product) return jsonResponse(404, { error: 'Product not found' });
        if (product.published === false && !isAuthed) {
          return jsonResponse(404, { error: 'Product not found' });
        }
        return jsonResponse(200, { product });
      }

      const wantsAll = params.all === '1';
      if (wantsAll && !isAuthed) return jsonResponse(401, { error: 'Unauthorized' });

      const products = await store.listProducts({ publishedOnly: !wantsAll });
      return jsonResponse(200, { products });
    }

    if (event.httpMethod === 'POST') {
      if (!isAuthed) return jsonResponse(401, { error: 'Unauthorized' });
      const input = JSON.parse(event.body || '{}');
      if (!input.title) return jsonResponse(400, { error: 'Product title is required' });
      const product = await store.saveProduct(input);
      return jsonResponse(200, { product });
    }

    if (event.httpMethod === 'DELETE') {
      if (!isAuthed) return jsonResponse(401, { error: 'Unauthorized' });
      if (!params.id) return jsonResponse(400, { error: 'Missing id' });
      await store.deleteProduct(params.id);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('products function error:', err);
    return jsonResponse(500, { error: err.message || 'Internal error' });
  }
};
