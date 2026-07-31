/* ==========================================================================
   search.js — Handles the site-wide hero/nav search bar.
   On the Products page itself, live filtering is handled in products.js
   (see initProductsPage). This file covers search bars that should
   navigate the user TO the Products page with a query string.
   ========================================================================== */

(function () {
  'use strict';

  function initHeroSearch() {
    const form = document.getElementById('hero-search-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="search"]');
      const query = input?.value.trim() || '';
      const basePath = form.dataset.basePath || '';
      const url = query
        ? `${basePath}products.html?q=${encodeURIComponent(query)}`
        : `${basePath}products.html`;
      window.location.href = url;
    });
  }

  document.addEventListener('DOMContentLoaded', initHeroSearch);
})();
