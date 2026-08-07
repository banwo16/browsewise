/* ==========================================================================
   collection-page.js — Drives collection.html: loads a shared collection
   by its ID from the URL and renders the products in it.
   ========================================================================== */

(function () {
  'use strict';

  function q(id) { return document.getElementById(id); }

  function notice(type, message) {
    q('collection-notice').innerHTML = `<div class="notice notice--${type}">${message}</div>`;
  }

 function getCollectionId() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id')) return params.get('id');
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

async function init() {
    const id = getCollectionId();
    const grid = q('collection-grid');

    if (!id) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>No collection specified</h3>
          <p>This link is missing its collection ID.</p>
          <a class="btn btn--primary mt-6" href="products.html">Browse All Products</a>
        </div>`;
      return;
    }

    let collection;
    try {
      const res = await fetch(`/.netlify/functions/collections?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'not-found' : 'error');
      collection = await res.json();
    } catch (err) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>This collection couldn't be found</h3>
          <p>It may have been removed, or the link might be incorrect.</p>
          <a class="btn btn--primary mt-6" href="products.html">Browse All Products</a>
        </div>`;
      return;
    }

    const allProducts = await ProductStore.getAll();
    const products = collection.slugs
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter(Boolean);

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>These items are no longer available</h3>
          <p>The products in this collection may have since been removed.</p>
          <a class="btn btn--primary mt-6" href="products.html">Browse All Products</a>
        </div>`;
      return;
    }

    if (products.length < collection.slugs.length) {
      notice('warn', 'Some items in this collection are no longer available and have been left out.');
    }

    renderGrid(grid, products);
    q('collection-cta').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
