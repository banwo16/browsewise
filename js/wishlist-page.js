/* ==========================================================================
   wishlist-page.js — Drives wishlist.html: renders saved products,
   handles Clear and Share My Wishlist.
   ========================================================================== */

(function () {
  'use strict';

  function q(id) { return document.getElementById(id); }

  function notice(type, message) {
    q('wishlist-notice').innerHTML = `<div class="notice notice--${type}">${message}</div>`;
  }

  function clearNotice() {
    q('wishlist-notice').innerHTML = '';
  }

  async function render() {
    const slugs = Wishlist.getAll();
    const actions = q('wishlist-actions');
    const grid = q('wishlist-grid');

    if (!slugs.length) {
      actions.hidden = true;
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Your wishlist is empty</h3>
          <p>Tap the heart icon on any product to save it here for later.</p>
          <a class="btn btn--primary mt-6" href="products.html">Browse Products</a>
        </div>`;
      return;
    }

    actions.hidden = false;
    const allProducts = await ProductStore.getAll();
    const saved = slugs
      .map((slug) => allProducts.find((p) => p.slug === slug))
      .filter(Boolean);

    if (!saved.length) {
      // Every saved slug pointed to a product that's since been removed/unpublished.
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>These items are no longer available</h3>
          <p>The products you saved may have been removed. Let's find something new.</p>
          <a class="btn btn--primary mt-6" href="products.html">Browse Products</a>
        </div>`;
      return;
    }

    renderGrid(grid, saved);
  }

  async function handleShare() {
    const btn = q('wishlist-share-btn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating link…';
    clearNotice();

    try {
      const url = await Wishlist.shareCurrentList();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notice('info', `Link copied! <strong>${url}</strong>`);
      } else {
        notice('info', `Here's your shareable link: <strong>${url}</strong>`);
      }
    } catch (err) {
      notice('error', err.message || 'Something went wrong creating the link.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  function handleClear() {
    if (!confirm("Clear your entire wishlist? This can't be undone.")) return;
    Wishlist.clear();
    clearNotice();
    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    q('wishlist-share-btn').addEventListener('click', handleShare);
    q('wishlist-clear-btn').addEventListener('click', handleClear);
  });
})();
