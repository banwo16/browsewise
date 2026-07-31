/* ==========================================================================
   admin-import.js — Drives the 4-step import wizard.
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

  let categories = [];
  let draft = {}; // accumulates data across the wizard
  let aiEnhancement = null;

  function setStep(n) {
    document.querySelectorAll('.wizard-step').forEach((el) => {
      const step = Number(el.dataset.step);
      el.classList.toggle('is-active', step === n);
      el.classList.toggle('is-done', step < n);
    });
    ['step-1', 'step-2', 'step-3', 'step-4'].forEach((id, i) => {
      q(id).style.display = i + 1 === n ? 'block' : 'none';
    });
  }

  function populateCategorySelect(selectEl, selected) {
    selectEl.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (selected && categories.includes(selected)) selectEl.value = selected;
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

  /* ---------- Step 3: AI enhance ---------- */

  async function handleAiEnhance() {
    collectStep2IntoDraft();
    if (!draft.title || !draft.price) {
      notice(q('notice-slot'), 'error', 'Title and price are required before enhancing.');
      return;
    }

    const btn = q('ai-enhance-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Asking AI…';
    clearNotice(q('ai-notice'));

    try {
      aiEnhancement = await AdminAPI.aiEnhance(draft);
      renderAiPreview();
      setStep(3);
    } catch (err) {
      notice(q('notice-slot'), 'error', escapeHtml(err.message) + ' — you can still continue with the raw data.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Enhance with AI';
    }
  }

  function renderAiPreview() {
    const e = aiEnhancement;
    if (!e) {
      q('ai-preview').innerHTML = '<p>No AI content yet.</p>';
      return;
    }
    q('ai-preview').innerHTML = `
      <div class="form-group" style="margin-bottom:16px;">
        <label>SEO Title</label>
        <p><strong>${escapeHtml(e.seoTitle || '')}</strong></p>
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label>SEO Description</label>
        <p>${escapeHtml(e.seoDescription || '')}</p>
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label>Description</label>
        <p>${escapeHtml(e.description || '')}</p>
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label>Key Features</label>
        <ul style="margin-left:20px;">${(e.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      </div>
      <div class="form-grid" style="margin-bottom:16px;">
        <div>
          <label>Pros</label>
          <ul style="margin-left:20px;">${(e.pros || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </div>
        <div>
          <label>Cons</label>
          <ul style="margin-left:20px;">${(e.cons || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label>FAQ</label>
        ${(e.faq || []).map((f) => `<p><strong>${escapeHtml(f.q)}</strong><br>${escapeHtml(f.a)}</p>`).join('')}
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label>Keywords</label>
        <div class="tag-list">${(e.keywords || []).map((k) => `<span class="tag">${escapeHtml(k)}</span>`).join('')}</div>
      </div>
      <p style="font-size:0.85rem; color:var(--color-text-muted);">
        Suggested category: <strong>${escapeHtml(e.suggestedCategory || draft.category)}</strong>
      </p>
    `;
  }

  /* ---------- Step 4: final review & save ---------- */

  function populateStep4() {
    const title = aiEnhancement?.seoTitle || draft.title;
    const description = aiEnhancement?.description || draft.description;

    q('final-image').src = draft.image || '../assets/images/placeholder.svg';
    q('final-title').textContent = title;
    q('final-price').textContent = draft.price;
    q('final-description').textContent = description;
  }

  async function handleSaveProduct() {
    const btn = q('save-import-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      title: aiEnhancement?.seoTitle || draft.title,
      description: aiEnhancement?.description || draft.description,
      shortDescription: aiEnhancement?.shortDescription || '',
      category: aiEnhancement?.suggestedCategory || draft.category,
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
      seoTitle: aiEnhancement?.seoTitle || '',
      seoDescription: aiEnhancement?.seoDescription || '',
      keywords: aiEnhancement?.keywords || [],
      features: aiEnhancement?.features || [],
      pros: aiEnhancement?.pros || [],
      cons: aiEnhancement?.cons || [],
      faq: aiEnhancement?.faq || [],
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
    aiEnhancement = null;
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

    try {
      categories = await AdminAPI.listCategories();
    } catch (e) {
      categories = [];
    }

    q('url-form').addEventListener('submit', handleExtractSubmit);
    q('back-to-step-1').addEventListener('click', () => setStep(1));
    q('ai-enhance-btn').addEventListener('click', handleAiEnhance);

    q('back-to-step-2').addEventListener('click', () => setStep(2));
    q('skip-ai-btn').addEventListener('click', () => {
      collectStep2IntoDraft();
      aiEnhancement = null;
      populateStep4();
      setStep(4);
    });
    q('go-to-publish-btn').addEventListener('click', () => {
      populateStep4();
      setStep(4);
    });

    q('edit-import-btn').addEventListener('click', () => setStep(2));
    q('cancel-import-btn').addEventListener('click', resetWizard);
    q('save-import-btn').addEventListener('click', handleSaveProduct);
  });
})();
