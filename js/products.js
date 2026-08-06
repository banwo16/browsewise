/* ==========================================================================
   products.js — Loads product data and renders product UI.

   Products are now managed through the admin CMS (see /admin) and served by
   a Netlify Function backed by Netlify Blobs. This file tries that API
   first, and falls back to the static data/products.json file if the
   function isn't available (e.g. running the site without `netlify dev`,
   or before the backend is deployed) — so the storefront never breaks.
   ========================================================================== */

const ProductStore = (function () {
  'use strict';

  const API_URL = '/.netlify/functions/products';
  const FALLBACK_URL = 'data/products.json';
  let cache = null;

  /** Fetches and caches the product catalog (published items only). */
  async function getAll() {
    if (cache) return cache;
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const data = await res.json();
      cache = data.products || [];
      return cache;
    } catch (err) {
      // Backend not deployed / not running locally — fall back to the static file.
      try {
        const res = await fetch(FALLBACK_URL);
        if (!res.ok) throw new Error('Failed to load products.json');
        cache = await res.json();
      } catch (fallbackErr) {
        console.error('ProductStore:', fallbackErr);
        cache = [];
      }
      return cache;
    }
  }

  async function getFeatured() {
    const all = await getAll();
    return all.filter((p) => p.featured === true);
  }

  async function getLatest(limit = 8) {
    const all = await getAll();
    return [...all].reverse().slice(0, limit);
  }

  async function getBySlug(slug) {
    const all = await getAll();
    return all.find((p) => p.slug === slug || String(p.id) === String(slug));
  }

  async function getByCategory(category, excludeId = null) {
    const all = await getAll();
    return all.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase() && p.id !== excludeId
    );
  }

  async function getCategories() {
    const all = await getAll();
    return [...new Set(all.map((p) => p.category))];
  }

  return { getAll, getFeatured, getLatest, getBySlug, getByCategory, getCategories };
})();

/* ---------- Rendering helpers ---------- */

const CATEGORY_ICONS = {
  Electronics:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  Kitchen:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 2v7a4 4 0 0 0 4 4v9"/><path d="M7 2v6"/><path d="M11 2v6"/><path d="M17 2c-2 2-2 5-2 7a2 2 0 0 0 2 2v11"/></svg>',
  Home:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  Fitness:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 7v10M18 7v10M2 12h2M20 12h2M6 12h12"/></svg>',
  Gaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="7" width="20" height="10" rx="4"/><line x1="7" y1="10" x2="7" y2="14"/><line x1="5" y1="12" x2="9" y2="12"/><circle cx="16" cy="10.5" r="0.8" fill="currentColor"/><circle cx="18" cy="13.5" r="0.8" fill="currentColor"/></svg>',
  Fashion:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 3 4 6l2 3-2 2 3 9h10l3-9-2-2 2-3-4-3-4 3z"/></svg>',
  Beauty:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v6"/><path d="M8 8h8l1 12H7z"/></svg>',
  Pets:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="9" r="2"/><circle cx="10" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="19" cy="9" r="2"/><path d="M8 16c0-3 2-5 4-5s4 2 4 5-2 4-4 4-4-1-4-4z"/></svg>',
  Travel:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m2 12 20-8-8 20-2-8-8-2z"/></svg>',
  Gifts:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18"/><path d="M12 8v13"/><path d="M12 8c-1.5-4-6-4-6-1.5S9 8 12 8z"/><path d="M12 8c1.5-4 6-4 6-1.5S15 8 12 8z"/></svg>',
};

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Builds a product card. `basePath` lets nested pages point to product.html correctly. */
function productCardHTML(product, basePath = '') {
  const { title, category, price, image, description, slug, id } = product;
  const affiliateHref = product.affiliateUrl || product.affiliate || '#';
  const imgSrc = /^https?:\/\//i.test(image || '') ? image : `${basePath}${image}`;
  const href = `${basePath}product.html?slug=${encodeURIComponent(slug || id)}`;
  return `
    <article class="product-card">
      <a href="${href}" class="product-card__media" aria-label="View ${escapeHtml(title)} details">
        <span class="badge">${escapeHtml(category)}</span>
        <img src="${imgSrc}" alt="${escapeHtml(title)}" loading="lazy" width="400" height="400"
             onerror="this.src='${basePath}assets/images/placeholder.svg'">
      </a>
      <div class="product-card__body">
        <h3 class="product-card__title"><a href="${href}">${escapeHtml(title)}</a></h3>
        <p class="product-card__desc">${escapeHtml(description)}</p>
        <button type="button" class="product-card__see-more" hidden>See More</button>
        <div class="product-card__footer">
          <span class="product-card__price">${escapeHtml(price)}</span>
          <a class="btn btn--primary btn--sm view-deal-btn" href="${escapeHtml(affiliateHref)}"
             target="_blank" rel="noopener sponsored nofollow"
             data-product-id="${id}" data-product-title="${escapeHtml(title)}">
            View Deal
          </a>
        </div>
      </div>
    </article>`;
}

/** Shows the "See More" toggle only on cards where the description is
 *  actually clamped/truncated — never on ones short enough to fit already. */
function initDescriptionToggles(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.querySelectorAll('.product-card__desc').forEach((desc) => {
      const btn = desc.nextElementSibling;
      if (!btn || !btn.classList.contains('product-card__see-more')) return;
      if (desc.scrollHeight > desc.clientHeight + 1) {
        btn.hidden = false;
      }
    });
  });
}

function renderGrid(container, products, basePath = '') {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try a different search term or browse another category.</p>
      </div>`;
    return;
  }
  container.innerHTML = products.map((p) => productCardHTML(p, basePath)).join('');
  initDescriptionToggles(container);
}

function renderCategoryGrid(container, categories) {
  if (!container) return;
  container.innerHTML = categories
    .map(
      (cat) => `
      <a class="category-card" href="products.html?category=${encodeURIComponent(cat)}">
        <span class="category-card__icon">${CATEGORY_ICONS[cat] || CATEGORY_ICONS.Gifts}</span>
        <span>${escapeHtml(cat)}</span>
      </a>`
    )
    .join('');
}

/* ---------- Page initializers ---------- */

async function initHomePage() {
  const featuredGrid = document.getElementById('featured-grid');
  const latestGrid = document.getElementById('latest-grid');
  const categoryGrid = document.getElementById('category-grid');

  const [featured, latest] = await Promise.all([
    ProductStore.getFeatured(),
    ProductStore.getLatest(8),
  ]);

  if (featuredGrid) renderGrid(featuredGrid, featured.length ? featured : latest.slice(0, 4));
  if (latestGrid) renderGrid(latestGrid, latest);

  if (categoryGrid) {
    const ALL_CATEGORIES = [
      'Electronics', 'Kitchen', 'Home', 'Fitness', 'Gaming',
      'Fashion', 'Beauty', 'Pets', 'Travel', 'Gifts',
    ];
    renderCategoryGrid(categoryGrid, ALL_CATEGORIES);
  }
}

async function initProductsPage() {
  const grid = document.getElementById('products-grid');
  const countEl = document.getElementById('results-count');
  const categorySelect = document.getElementById('category-filter');
  const sortSelect = document.getElementById('sort-filter');
  const searchInput = document.getElementById('products-search-input');

  const all = await ProductStore.getAll();
  const params = new URLSearchParams(window.location.search);
  let state = {
    query: params.get('q') || '',
    category: params.get('category') || '',
    sort: 'newest',
  };

  if (searchInput) searchInput.value = state.query;
  if (categorySelect && state.category) categorySelect.value = state.category;

  function apply() {
    let results = [...all];

    if (state.query) {
      const q = state.query.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (state.category) {
      results = results.filter((p) => p.category === state.category);
    }

    if (state.sort === 'price-asc') {
      results.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (state.sort === 'price-desc') {
      results.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else {
      results.reverse(); // newest first
    }

    renderGrid(grid, results);
    if (countEl) {
      countEl.textContent = `${results.length} product${results.length === 1 ? '' : 's'} found`;
    }
  }

  function parsePrice(price) {
    const n = parseFloat(String(price).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  searchInput?.addEventListener('input', (e) => {
    state.query = e.target.value;
    apply();
  });

  categorySelect?.addEventListener('change', (e) => {
    state.category = e.target.value;
    apply();
  });

  sortSelect?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    apply();
  });

  apply();
}

function buildProductShareUrl(product) {
  return `${window.location.origin}/product.html?slug=${encodeURIComponent(product.slug)}`;
}

function shareWidgetHTML(product, variant = 'inline') {
  const url = buildProductShareUrl(product);
  return `
    <div class="share-widget" data-share-title="${escapeHtml(product.title)}" data-share-url="${escapeHtml(url)}">
      <button type="button" class="btn ${variant === 'bottom' ? 'btn--primary' : 'btn--outline'} share-toggle-btn" aria-haspopup="true" aria-expanded="false">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>
        Share
      </button>
      <div class="share-menu" hidden role="menu">
        <button type="button" class="share-option" data-action="copy" role="menuitem">Copy Link</button>
        <button type="button" class="share-option" data-action="twitter" role="menuitem">Share on X</button>
        <button type="button" class="share-option" data-action="facebook" role="menuitem">Share on Facebook</button>
        <button type="button" class="share-option" data-action="whatsapp" role="menuitem">Share on WhatsApp</button>
        <button type="button" class="share-option" data-action="email" role="menuitem">Share via Email</button>
      </div>
    </div>`;
}

async function initProductDetailPage() {
  const container = document.getElementById('product-detail-container');
  const relatedGrid = document.getElementById('related-grid');
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    renderNotFound(container);
    return;
  }

  const product = await ProductStore.getBySlug(slug);

  if (!product) {
    renderNotFound(container);
    return;
  }

  document.title = `${product.title} — BrowseWise`;
  setMeta('description', product.description);

  container.innerHTML = `
    <div class="product-detail__media">
      <img src="${product.image}" alt="${escapeHtml(product.title)}"
           onerror="this.src='assets/images/placeholder.svg'">
    </div>
    <div class="product-detail__info">
      <div class="product-detail__meta">
        <span class="badge" style="position:static;">${escapeHtml(product.category)}</span>
      </div>
      <h1>${escapeHtml(product.title)}</h1>
      <p class="product-detail__price">${escapeHtml(product.price)}</p>
      <p class="product-detail__desc">${escapeHtml(product.description)}</p>
      <div class="product-detail__actions">
        <a class="btn btn--primary view-deal-btn" href="${escapeHtml(product.affiliateUrl || product.affiliate)}" target="_blank"
           rel="noopener sponsored nofollow" data-product-id="${product.id}">
          View Deal &rarr;
        </a>
        <a class="btn btn--outline" href="products.html">Back to Products</a>
        ${shareWidgetHTML(product, 'inline')}
      </div>
      <p class="disclosure-note">
        This is an affiliate link. BrowseWise may earn a commission at no extra cost to you.
        Read our <a href="affiliate-disclosure.html">Affiliate Disclosure</a>.
      </p>
    </div>`;

  injectStructuredData(product);

  const related = (await ProductStore.getByCategory(product.category, product.id)).slice(0, 4);
  if (relatedGrid) {
    if (related.length) {
      renderGrid(relatedGrid, related, '');
    } else {
      relatedGrid.closest('.related-products')?.setAttribute('hidden', '');
    }
  }

  // Prominent share prompt at the end of the page
  const relatedSection = document.querySelector('.related-products');
  if (relatedSection && !document.getElementById('bottom-share-cta')) {
    const cta = document.createElement('section');
    cta.className = 'share-cta';
    cta.id = 'bottom-share-cta';
    cta.innerHTML = `
      <h2>Found something you love?</h2>
      <p>Share it with someone who'd love it too.</p>
      ${shareWidgetHTML(product, 'bottom')}
    `;
    relatedSection.insertAdjacentElement('afterend', cta);
  }
}

function renderNotFound(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <h3>Product not found</h3>
      <p>This item may have been removed. Browse our full catalog instead.</p>
      <a class="btn btn--primary mt-6" href="products.html">View All Products</a>
    </div>`;
}

function setMeta(name, content) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (el) el.setAttribute('content', content);
}

function injectStructuredData(product) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    category: product.category,
    image: `${product.image}`,
    offers: {
      '@type': 'Offer',
      price: String(product.price).replace(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
      url: product.affiliateUrl || product.affiliate,
      availability: 'https://schema.org/InStock',
    },
  });
  document.head.appendChild(script);
}

/* ---------- Click tracking ----------
   Fire-and-forget: never delays or blocks the affiliate link from opening.
   Silently does nothing if the CMS backend isn't deployed. */
function initClickTracking() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.view-deal-btn');
    if (!link) return;
    const productId = link.dataset.productId;
    if (!productId) return;
    try {
      fetch('/.netlify/functions/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        keepalive: true,
      }).catch(() => {});
    } catch (err) {
      /* analytics failures should never affect the shopping experience */
    }
  });
}

/* ---------- "See More" description toggle ---------- */
function initDescriptionToggleClicks() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-card__see-more');
    if (!btn) return;
    const desc = btn.previousElementSibling;
    if (!desc || !desc.classList.contains('product-card__desc')) return;
    const expanded = desc.classList.toggle('is-expanded');
    btn.textContent = expanded ? 'See Less' : 'See More';
  });
}

/* ---------- Share widget ----------
   Uses the native share sheet where available (most mobile browsers);
   falls back to a small dropdown with copy-link + social share links. */
function handleShareAction(action, { url, title }, triggerBtn) {
  switch (action) {
    case 'copy':
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          if (triggerBtn) {
            const original = triggerBtn.textContent;
            triggerBtn.textContent = 'Copied!';
            setTimeout(() => { triggerBtn.textContent = original; }, 1800);
          }
        }).catch(() => {});
      }
      break;
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'noopener');
      break;
    case 'facebook':
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
      break;
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank', 'noopener');
      break;
    case 'email':
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
      break;
  }
}

function initShareWidgets() {
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.share-toggle-btn');
    if (toggleBtn) {
      const widget = toggleBtn.closest('.share-widget');
      const url = widget.dataset.shareUrl;
      const title = widget.dataset.shareTitle;

      if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
        return;
      }

      const menu = widget.querySelector('.share-menu');
      const wasOpen = !menu.hidden;
      document.querySelectorAll('.share-menu').forEach((m) => { m.hidden = true; });
      document.querySelectorAll('.share-toggle-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      menu.hidden = wasOpen;
      toggleBtn.setAttribute('aria-expanded', String(!wasOpen));
      return;
    }

    const optionBtn = e.target.closest('.share-option');
    if (optionBtn) {
      const widget = optionBtn.closest('.share-widget');
      const url = widget.dataset.shareUrl;
      const title = widget.dataset.shareTitle;
      handleShareAction(optionBtn.dataset.action, { url, title }, optionBtn);
      if (optionBtn.dataset.action !== 'copy') {
        widget.querySelector('.share-menu').hidden = true;
      }
      return;
    }

    if (!e.target.closest('.share-widget')) {
      document.querySelectorAll('.share-menu').forEach((m) => { m.hidden = true; });
      document.querySelectorAll('.share-toggle-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initClickTracking();
  initDescriptionToggleClicks();
  initShareWidgets();
  if (document.body.dataset.page === 'home') initHomePage();
  if (document.body.dataset.page === 'products') initProductsPage();
  if (document.body.dataset.page === 'product') initProductDetailPage();
});
