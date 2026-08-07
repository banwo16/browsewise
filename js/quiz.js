/* ==========================================================================
   quiz.js — Product recommendation quiz.

   Two modes:
   - Multiple choice: category → budget → priority, filters/sorts the real
     product catalog (same data every other page uses).
   - Free text: simple keyword scoring against title/description/category/
     brand/keywords — no AI, no API cost, no new setup required. Can be
     swapped for an AI-powered version later using the same Anthropic API
     integration already built for the admin CMS, if ever wanted.

   Relies on ProductStore, renderGrid, and escapeHtml from products.js,
   which must load before this file.
   ========================================================================== */

(function () {
  'use strict';

  const MC_QUESTIONS = [
    {
      key: 'category',
      question: 'What are you shopping for?',
      options: [
        { label: 'Electronics', value: 'Electronics' },
        { label: 'Kitchen', value: 'Kitchen' },
        { label: 'Home', value: 'Home' },
        { label: 'Fitness', value: 'Fitness' },
        { label: 'Gaming', value: 'Gaming' },
        { label: 'Fashion', value: 'Fashion' },
        { label: 'Beauty', value: 'Beauty' },
        { label: 'Pets', value: 'Pets' },
        { label: 'Travel', value: 'Travel' },
        { label: 'Gifts', value: 'Gifts' },
        { label: 'Show me everything', value: '' },
      ],
    },
    {
      key: 'budget',
      question: "What's your budget?",
      options: [
        { label: 'Under $20', value: '0-20' },
        { label: '$20 – $40', value: '20-40' },
        { label: '$40 – $75', value: '40-75' },
        { label: '$75+', value: '75-999999' },
        { label: 'No budget limit', value: '' },
      ],
    },
    {
      key: 'priority',
      question: 'What matters most to you?',
      options: [
        { label: 'Best value', value: 'price-asc' },
        { label: 'Most popular', value: 'featured' },
        { label: 'Newest arrivals', value: 'newest' },
      ],
    },
  ];

  const STOPWORDS = new Set([
    'a', 'an', 'the', 'for', 'my', 'to', 'of', 'in', 'with', 'and', 'is',
    'that', 'who', 'i', 'im', "i'm", 'need', 'want', 'looking', 'something',
  ]);

  let mcStep = 0;
  let mcAnswers = {};
  let allProducts = [];

  function q(id) { return document.getElementById(id); }

  function escapeHtmlLocal(str = '') {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showSection(id) {
    ['quiz-intro', 'quiz-mc', 'quiz-text', 'quiz-results'].forEach((sid) => {
      q(sid).hidden = sid !== id;
    });
  }

  function parsePrice(price) {
    const n = parseFloat(String(price).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /* ---------- Multiple choice flow ---------- */

  function renderMcQuestion() {
    const step = MC_QUESTIONS[mcStep];
    q('quiz-progress').textContent = `Question ${mcStep + 1} of ${MC_QUESTIONS.length}`;
    q('quiz-mc-question').innerHTML = `
      <h2>${escapeHtmlLocal(step.question)}</h2>
      <div class="quiz-options">
        ${step.options
          .map(
            (opt) =>
              `<button type="button" class="quiz-option-btn" data-key="${step.key}" data-value="${escapeHtmlLocal(opt.value)}">${escapeHtmlLocal(opt.label)}</button>`
          )
          .join('')}
      </div>
      ${mcStep > 0 ? '<button type="button" class="btn btn--outline mt-6" id="quiz-mc-back">&larr; Back</button>' : ''}
    `;

    const backBtn = q('quiz-mc-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        mcStep -= 1;
        renderMcQuestion();
      });
    }

    q('quiz-mc-question')
      .querySelectorAll('.quiz-option-btn')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          mcAnswers[btn.dataset.key] = btn.dataset.value;
          mcStep += 1;
          if (mcStep < MC_QUESTIONS.length) {
            renderMcQuestion();
          } else {
            showResultsFromMc();
          }
        });
      });
  }

  function showResultsFromMc() {
    let results = [...allProducts];

    if (mcAnswers.category) {
      results = results.filter((p) => p.category === mcAnswers.category);
    }
    if (mcAnswers.budget) {
      const [min, max] = mcAnswers.budget.split('-').map(Number);
      results = results.filter((p) => {
        const price = parsePrice(p.price);
        return price >= min && price <= max;
      });
    }

    if (mcAnswers.priority === 'price-asc') {
      results.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (mcAnswers.priority === 'featured') {
      results.sort((a, b) => (b.featured === true ? 1 : 0) - (a.featured === true ? 1 : 0));
    } else {
      results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    // If the combined filters were too narrow, fall back to category-only
    // so the person still gets useful results instead of an empty page.
    if (!results.length && mcAnswers.category) {
      const categoryOnly = allProducts.filter((p) => p.category === mcAnswers.category);
      renderResults(categoryOnly.slice(0, 3), categoryOnly.slice(3, 7), { broadened: true });
      return;
    }

    renderResults(results.slice(0, 3), results.slice(3, 7), {});
  }

  /* ---------- Free-text flow ---------- */

  function scoreProduct(product, terms) {
    const haystack = [
      product.title, product.description, product.shortDescription,
      product.category, product.brand, ...(product.keywords || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const titleLower = (product.title || '').toLowerCase();
    const categoryLower = (product.category || '').toLowerCase();

    let score = 0;
    terms.forEach((term) => {
      if (haystack.includes(term)) score += 1;
      if (titleLower.includes(term)) score += 2;
      if (categoryLower.includes(term)) score += 2;
    });
    return score;
  }

  function handleTextSubmit() {
    const input = q('quiz-text-input').value.trim().toLowerCase();
    if (!input) return;

    const terms = input.split(/\W+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));

    const scored = allProducts
      .map((p) => ({ product: p, score: scoreProduct(p, terms) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      const fallback = allProducts.filter((p) => p.featured).slice(0, 4);
      renderResults([], fallback, { noMatch: true });
      return;
    }

    renderResults(
      scored.slice(0, 3).map((s) => s.product),
      scored.slice(3, 7).map((s) => s.product),
      {}
    );
  }

  /* ---------- Results rendering ---------- */

  function renderResults(best, alternatives, { broadened, noMatch } = {}) {
    showSection('quiz-results');

    q('quiz-results-heading').textContent = noMatch
      ? "We couldn't find an exact match — here's what's popular right now"
      : broadened
        ? "We widened the search a bit — here's what's close"
        : "Here's what we found";

    renderGrid(q('quiz-best-matches'), best);

    const altWrap = q('quiz-alternatives-wrap');
    if (alternatives.length) {
      altWrap.hidden = false;
      renderGrid(q('quiz-alternatives'), alternatives);
    } else {
      altWrap.hidden = true;
    }
  }

  /* ---------- Init ---------- */

  document.addEventListener('DOMContentLoaded', async () => {
    allProducts = await ProductStore.getAll();

    document.querySelectorAll('.quiz-mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        if (mode === 'mc') {
          mcStep = 0;
          mcAnswers = {};
          showSection('quiz-mc');
          renderMcQuestion();
        } else {
          showSection('quiz-text');
        }
      });
    });

    q('quiz-text-submit').addEventListener('click', handleTextSubmit);
    q('quiz-text-back').addEventListener('click', () => showSection('quiz-intro'));
    q('quiz-text-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleTextSubmit();
      }
    });

    q('quiz-retake').addEventListener('click', () => {
      mcStep = 0;
      mcAnswers = {};
      q('quiz-text-input').value = '';
      showSection('quiz-intro');
    });
  });
})();
