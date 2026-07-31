/* ==========================================================================
   admin-dashboard.js — Product list + CRUD + category manager.
   ========================================================================== */

(function () {
  'use strict';

  let products = [];
  let categories = [];

  const els = {};

  function q(id) { return document.getElementById(id); }

  function escapeHtml(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function notice(slot, type, message) {
    slot.innerHTML = `<div class="notice notice--${type}">${message}</div>`;
  }

  /* ---------- Load & render ---------- */

  async function loadEverything() {
    try {
      [products, categories] = await Promise.all([
        AdminAPI.listAllProducts(),
        AdminAPI.listCategories(),
      ]);
      renderStats();
      renderTable();
      renderCategorySelect();
    } catch (err) {
      notice(els.notice, 'error', `Failed to load products: ${escapeHtml(err.message)}`);
    }
  }

  function renderStats() {
    q('stat-total').textContent = products.length;
    q('stat-published').textContent = products.filter((p) => p.published !== false).length;
    q('stat-hidden').textContent = products.filter((p) => p.published === false).length;
    q('stat-featured').textContent = products.filter((p) => p.featured).length;
  }

  function renderTable() {
    const tbody = q('product-rows');
    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color: var(--color-text-muted);">
        No products yet. Click <strong>Add Product</strong> or use <strong>Import Product</strong> to get started.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = products
      .map((p) => `
        <tr>
          <td><img src="${escapeHtml(resolveImage(p.image))}" alt="" onerror="this.src='../assets/images/placeholder.svg'"></td>
          <td><strong>${escapeHtml(p.title)}</strong></td>
          <td>${escapeHtml(p.category)}</td>
          <td>${escapeHtml(p.price)}</td>
          <td>
            <span class="status-pill ${p.published === false ? 'status-pill--hidden' : 'status-pill--published'}">
              ${p.published === false ? 'Hidden' : 'Published'}
            </span>
            ${p.featured ? '<span class="status-pill status-pill--featured" style="margin-left:6px;">Featured</span>' : ''}
          </td>
          <td>${new Date(p.updatedAt).toLocaleDateString()}</td>
          <td class="cell-actions">
            <button class="icon-btn" title="Preview" data-action="preview" data-id="${p.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="icon-btn" title="Edit" data-action="edit" data-id="${p.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button class="icon-btn" title="${p.featured ? 'Unfeature' : 'Feature'}" data-action="toggle-featured" data-id="${p.id}">
              <svg viewBox="0 0 24 24" fill="${p.featured ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>
            </button>
            <button class="icon-btn" title="${p.published === false ? 'Publish' : 'Hide'}" data-action="toggle-published" data-id="${p.id}">
              ${p.published === false
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'}
            </button>
            <button class="icon-btn danger" title="Delete" data-action="delete" data-id="${p.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>
      `)
      .join('');
  }

  function resolveImage(path) {
    if (!path) return '../assets/images/placeholder.svg';
    if (/^https?:\/\//i.test(path)) return path;
    return `../${path}`;
  }

  function renderCategorySelect() {
    const select = q('p-category');
    select.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function renderCategoryChips() {
    q('category-chip-list').innerHTML = categories
      .map((c) => `<span class="category-chip">${escapeHtml(c)}<button type="button" data-remove-category="${escapeHtml(c)}" aria-label="Remove ${escapeHtml(c)}">&times;</button></span>`)
      .join('');
  }

  /* ---------- Product modal ---------- */

  function openProductModal(product = null) {
    q('modal-title').textContent = product ? 'Edit Product' : 'Add Product';
    q('p-id').value = product?.id || '';
    q('p-title').value = product?.title || '';
    q('p-description').value = product?.description || '';
    q('p-category').value = product?.category || categories[0] || '';
    q('p-brand').value = product?.brand || '';
    q('p-price').value = product?.price || '';
    q('p-oldPrice').value = product?.oldPrice || '';
    q('p-image').value = product?.image || '';
    q('p-affiliateUrl').value = product?.affiliateUrl || product?.originalUrl || '';
    q('p-retailer').value = product?.retailer || '';
    q('p-featured').checked = Boolean(product?.featured);
    q('p-published').checked = product ? product.published !== false : true;
    q('product-form-notice').innerHTML = '';
    els.productModal.classList.add('is-open');
  }

  function closeProductModal() {
    els.productModal.classList.remove('is-open');
  }

  async function handleProductFormSubmit(e) {
    e.preventDefault();
    const btn = q('save-product-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
      id: q('p-id').value || undefined,
      title: q('p-title').value.trim(),
      description: q('p-description').value.trim(),
      category: q('p-category').value,
      brand: q('p-brand').value.trim(),
      price: q('p-price').value.trim(),
      oldPrice: q('p-oldPrice').value.trim(),
      image: q('p-image').value.trim(),
      affiliateUrl: q('p-affiliateUrl').value.trim(),
      retailer: q('p-retailer').value.trim(),
      featured: q('p-featured').checked,
      published: q('p-published').checked,
    };

    try {
      await AdminAPI.saveProduct(payload);
      closeProductModal();
      await loadEverything();
    } catch (err) {
      notice(q('product-form-notice'), 'error', escapeHtml(err.message));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  }

  /* ---------- Row actions ---------- */

  async function handleTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const product = products.find((p) => p.id === id);
    if (!product) return;

    if (action === 'edit') return openProductModal(product);

    if (action === 'preview') return window.open(`../product.html?slug=${encodeURIComponent(product.slug)}`, '_blank');

    if (action === 'toggle-featured') {
      await AdminAPI.saveProduct({ ...product, featured: !product.featured });
      return loadEverything();
    }

    if (action === 'toggle-published') {
      await AdminAPI.saveProduct({ ...product, published: product.published === false });
      return loadEverything();
    }

    if (action === 'delete') {
      if (!confirm(`Delete "${product.title}"? This can't be undone.`)) return;
      await AdminAPI.deleteProduct(id);
      return loadEverything();
    }
  }

  /* ---------- Category modal ---------- */

  async function handleAddCategory(e) {
    e.preventDefault();
    const input = q('new-category-input');
    const value = input.value.trim();
    if (!value) return;
    categories = await AdminAPI.saveCategories([...categories, value]);
    input.value = '';
    renderCategoryChips();
    renderCategorySelect();
  }

  async function handleRemoveCategory(name) {
    categories = await AdminAPI.saveCategories(categories.filter((c) => c !== name));
    renderCategoryChips();
    renderCategorySelect();
  }

  /* ---------- Init ---------- */

  document.addEventListener('DOMContentLoaded', async () => {
    const authed = await AdminAuth.requireAuthOrRedirect('index.html');
    if (!authed) return;

    els.notice = q('notice-slot');
    els.productModal = q('product-modal');
    els.categoryModal = q('category-modal');

    q('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await AdminAuth.logout();
      window.location.href = 'index.html';
    });

    q('add-product-btn').addEventListener('click', () => openProductModal());
    q('close-product-modal').addEventListener('click', closeProductModal);
    q('cancel-product-form').addEventListener('click', closeProductModal);
    q('product-form').addEventListener('submit', handleProductFormSubmit);
    q('product-rows').addEventListener('click', handleTableClick);

    q('manage-categories-btn').addEventListener('click', () => {
      renderCategoryChips();
      els.categoryModal.classList.add('is-open');
    });
    q('close-category-modal').addEventListener('click', () => els.categoryModal.classList.remove('is-open'));
    q('add-category-form').addEventListener('submit', handleAddCategory);
    q('category-chip-list').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-remove-category]');
      if (btn) handleRemoveCategory(btn.dataset.removeCategory);
    });

    await loadEverything();
  });
})();
