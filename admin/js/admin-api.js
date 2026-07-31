/* ==========================================================================
   admin-api.js — Thin client for all admin CMS endpoints.
   ========================================================================== */

const AdminAPI = (function () {
  'use strict';

  async function request(url, options = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* no body */
    }
    if (res.status === 401) {
      window.location.href = 'index.html';
      throw new Error('Session expired');
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  /* ---------- Products ---------- */
  function listAllProducts() {
    return request('/.netlify/functions/products?all=1').then((d) => d.products);
  }
  function saveProduct(product) {
    return request('/.netlify/functions/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    }).then((d) => d.product);
  }
  function deleteProduct(id) {
    return request(`/.netlify/functions/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  /* ---------- Categories ---------- */
  function listCategories() {
    return request('/.netlify/functions/categories').then((d) => d.categories);
  }
  function saveCategories(categories) {
    return request('/.netlify/functions/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    }).then((d) => d.categories);
  }

  /* ---------- Import & AI ---------- */
  function importExtract(url) {
    return request('/.netlify/functions/import-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  }
  function aiEnhance(product) {
    return request('/.netlify/functions/ai-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    }).then((d) => d.enhancement);
  }

  /* ---------- Analytics ---------- */
  function getAnalytics(productId) {
    return request(`/.netlify/functions/analytics?productId=${encodeURIComponent(productId)}`);
  }

  return {
    listAllProducts, saveProduct, deleteProduct,
    listCategories, saveCategories,
    importExtract, aiEnhance,
    getAnalytics,
  };
})();
