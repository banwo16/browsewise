/* ==========================================================================
   app.js — Global site behavior: nav toggle, dark mode, footer year,
   newsletter form (UI only). Loaded on every page.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a link is clicked (mobile)
    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Dark mode ---------- */
  const THEME_KEY = 'browsewise-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    // Theme is applied early (inline script in <head>) to avoid flash;
    // here we just wire up the toggle button.
    const toggleBtn = document.querySelector('.theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* localStorage unavailable — theme just won't persist */
      }
    });
  }

  /* ---------- Footer year ---------- */
  function initFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------- Newsletter (UI only, no backend) ---------- */
  function initNewsletter() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const button = form.querySelector('button');
      if (!input || !input.value) return;

      const originalLabel = button.textContent;
      button.textContent = 'Subscribed!';
      button.disabled = true;
      input.value = '';

      setTimeout(() => {
        button.textContent = originalLabel;
        button.disabled = false;
      }, 2500);
    });
  }

  /* ---------- Contact form (UI only, no backend) ---------- */
  function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('contact-status');
      form.reset();
      if (status) {
        status.textContent = "Thanks for reaching out! We'll get back to you soon.";
        status.hidden = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNavToggle();
    initTheme();
    initFooterYear();
    initNewsletter();
    initContactForm();
  });
})();
