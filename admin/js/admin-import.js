/* ==========================================================================
   admin-import.js — Drives the 3-step import wizard (Paste → Review → Publish).
   ========================================================================== */

(function () {
  'use strict';

  function q(id) { return document.getElementById(id); }
  function escapeHtml(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function notice(slot, type, message) {
    slot.innerHTML = `<div class="notice notice--${type}">${message}</div>`;
  }
  function clearNotice(slot) { slot.innerHTML = ''; }

  // Hardcoded fallback so the category dropdown is NEVER empty, even if the
  // categories endpoint is slow, unreachable, or returns nothing.
  const FALLBACK_CATEGORIES = [
    'Electronics', 'Kitchen', 'Home', 'Fitness', 'Gaming',
    'Fashion', 'Beauty', 'Pets', 'Travel', 'Gifts',
  ];

  let categories = FALLBACK_CATEGORIES;
  let draft = {}; // accumulates data across the wizard

  function setStep(n) {
    document.querySelectorAll('.wizard-step').forEach((el) => {
      const step = Number(el.dataset.step);
      el.classList.toggle('is-active', step === n);
      el.classList.toggle('is-done', step < n);
    });
    ['step-1', 'step-2', 'step-3'].forEach((id, i) => {
      q(id).style.display = i + 1 === n ? 'block' : 'none';
    });
  }

  function populateCategorySelect(selectEl, selected) {
    const list = categories && categories.length ? categories : FALLBACK_CATEGORIES;
    selectEl.innerHTML = list.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (selected && list.includes(selected)) selectEl.value = selected;
  }

  /* ---------- Step 1: extract ---------- */

  async function handleExtractSubmit(e) {
    e.preventDefault();
    const url = q('product-url').value.trim();
    const btn = q('extract-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Fetching…';
    clearNotice(q('notice-slot'));

    try {
      const result = await AdminAPI.importExtract(url);
      draft = {
        originalUrl: result.originalUrl,
        affiliateUrl: result.affiliateUrl,
        affiliateNetwork: result.network,
        retailer: prettyNetworkName(result.network),
        title: result.extracted?.title || '',
        description: result.extracted?.description || '',
        image: result.extracted?.image || '',
        price: result.extracted?.price || '',
        brand: result.extracted?.brand || '',
        category: categories[0] || '',
        sku: result.extracted?.sku || '',
        rating: result.extracted?.rating ?? null,
        reviews: result.extracted?.reviews ?? null,
        availability: result.extracted?.availability || '',
      };

      populateStep2(result.extracted?.note);
      setStep(2);
    } catch (err) {
      notice(q('notice-slot'), 'error', escapeHtml(err.message));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Fetch Product Data';
    }
  }

  function prettyNetworkName(network) {
    const names = {
      amazon: 'Amazon', aliexpress: 'AliExpress', ebay: 'eBay',
      cj: 'CJ Affiliate', impact: 'Impact', awin: 'Awin', other: 'Other',
    };
    return names[network] || network;
  }

  /* ---------- Step 2: review / edit ---------- */

  function populateStep2(extractionNote) {
    const noticeSlot = q('extract-notice');
    if (extractionNote) {
      notice(noticeSlot, 'warn', escapeHtml(extractionNote));
    } else {
      clearNotice(noticeSlot);
    }

    q('review-image').src = draft.image || '../assets/images/placeholder.svg';
    q('f-image').value = draft.image || '';
    q('f-title').value = draft.title || '';
    q('f-description').value = draft.description || '';
    populateCategorySelect(q('f-category'), draft.category);
    q('f-brand').value = draft.brand || '';
    q('f-price').value = draft.price || '';
    q('f-oldPrice').value = draft.oldPrice || '';
    q('f-retailer').value = draft.retailer || '';
    q('f-network').value = prettyNetworkName(draft.affiliateNetwork);
  }

  function collectStep2IntoDraft() {
    draft.image = q('f-image').value.trim();
    draft.title = q('f-title').value.trim();
    draft.description = q('f-description').value.trim();
    draft.category = q('f-category').value;
    draft.brand = q('f-brand').value.trim();
    draft.price = q('f-price').value.trim();
    draft.oldPrice = q('f-oldPrice').value.trim();
    draft.retailer = q('f-retailer').value.trim();
  }

  /* ---------- Step 3: final review & save ---------- */

  function populateStep3() {
    q('final-image').src = draft.image || '../assets/images/placeholder.svg';
    q('final-title').textContent = draft.title;
    q('final-price').textContent = draft.price;
    q('final-description').textContent = draft.description;
  }

  async function handleSaveProduct() {
    const btn = q('save-import-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      title: draft.title,
      description: draft.description,
      category: draft.category,
      brand: draft.brand,
      price: draft.price,
      oldPrice: draft.oldPrice,
      image: draft.image,
      gallery: draft.gallery || [],
      retailer: draft.retailer,
      affiliateNetwork: draft.affiliateNetwork,
      originalUrl: draft.originalUrl,
      affiliateUrl: draft.affiliateUrl,
      rating: draft.rating,
      reviews: draft.reviews,
      availability: draft.availability || 'In Stock',
      featured: q('final-featured').checked,
      published: q('final-published').checked,
    };

    try {
      await AdminAPI.saveProduct(payload);
      window.location.href = 'dashboard.html';
    } catch (err) {
      notice(q('notice-slot'), 'error', escapeHtml(err.message));
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  }

  function resetWizard() {
    draft = {};
    q('url-form').reset();
    setStep(1);
  }

  /* ---------- Init ---------- */

  document.addEventListener('DOMContentLoaded', async () => {
    const authed = await AdminAuth.requireAuthOrRedirect('index.html');
    if (!authed) return;

    q('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await AdminAuth.logout();
      window.location.href = 'index.html';
    });

    // Populate the category dropdown immediately with the fallback list so
    // it's never empty, then try to replace it with the live list.
    populateCategorySelect(q('f-category'));
    try {
      const fetched = await AdminAPI.listCategories();
      if (fetched && fetched.length) {
        categories = fetched;
        populateCategorySelect(q('f-category'));
      }
    } catch (e) {
      // Keep using FALLBACK_CATEGORIES — dropdown already populated above.
    }

    q('url-form').addEventListener('submit', handleExtractSubmit);
    q('back-to-step-1').addEventListener('click', () => setStep(1));

    q('go-to-publish-btn').addEventListener('click', () => {
      collectStep2IntoDraft();
      if (!draft.title || !draft.price) {
        notice(q('notice-slot'), 'error', 'Title and price are required before continuing.');
        return;
      }
      populateStep3();
      setStep(3);
    });

    q('edit-import-btn').addEventListener('click', () => setStep(2));
    q('cancel-import-btn').addEventListener('click', resetWizard);
    q('save-import-btn').addEventListener('click', handleSaveProduct);
  });
})();
