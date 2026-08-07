/* ==========================================================================
   wishlist.js — Personal wishlist (localStorage, no account needed) plus
   the ability to save a shareable snapshot to the backend.

   Local list = works instantly, private to this browser, survives return
   visits. Shared link = a copy of that list saved server-side under a short
   ID, so anyone (any device) opening the link sees the same products.
   ========================================================================== */

const Wishlist = (function () {
  'use strict';

  const STORAGE_KEY = 'browsewise-wishlist';

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function save(slugs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch (e) {
      /* localStorage unavailable (private browsing, storage full, etc.) —
         wishlist just won't persist, but nothing breaks. */
    }
  }

  function has(slug) {
    return getAll().includes(slug);
  }

  function add(slug) {
    const list = getAll();
    if (!list.includes(slug)) {
      list.push(slug);
      save(list);
    }
    return list;
  }

  function remove(slug) {
    const list = getAll().filter((s) => s !== slug);
    save(list);
    return list;
  }

  function toggle(slug) {
    return has(slug) ? (remove(slug), false) : (add(slug), true);
  }

  function clear() {
    save([]);
  }

  function count() {
    return getAll().length;
  }

  /** Saves the current list (or a provided one) to the backend and returns
   *  a shareable URL. Throws on failure — caller should handle/display it. */
  async function shareCurrentList(slugs) {
    const list = slugs || getAll();
    if (!list.length) throw new Error('Your wishlist is empty — add something first.');

    const res = await fetch('/.netlify/functions/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: list }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not create a shareable link right now.');

    return `${window.location.origin}/collection.html?id=${encodeURIComponent(data.id)}`;
  }

  return { getAll, has, add, remove, toggle, clear, count, shareCurrentList };
})();
