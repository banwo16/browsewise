/* ==========================================================================
   app.js — Global site behavior: nav toggle, dark mode, footer year,
   newsletter + contact forms (submitted live via Netlify Forms).
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
    const toggleBtn = document.querySelector('button.theme-toggle');
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

  /* ---------- Shared: submit a Netlify Form via AJAX (no page reload) ---------- */
  function submitNetlifyForm(form) {
    const body = new URLSearchParams(new FormData(form)).toString();
    return fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  /* ---------- Newsletter — real submission via Netlify Forms ---------- */
  function initNewsletter() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    const note = document.getElementById('newsletter-note');
    const originalNote = note ? note.textContent : '';
    const originalLabel = button ? button.textContent : 'Subscribe';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value) return;

      button.disabled = true;
      button.textContent = 'Subscribing…';

      submitNetlifyForm(form)
        .then((res) => {
          if (!res.ok) throw new Error('Submission failed');
          button.textContent = 'Subscribed!';
          input.value = '';
          if (note) note.textContent = "You're on the list — thanks for subscribing!";
        })
        .catch(() => {
          button.textContent = originalLabel;
          button.disabled = false;
          if (note) note.textContent = 'Something went wrong — please try again.';
        })
        .finally(() => {
          setTimeout(() => {
            button.disabled = false;
            button.textContent = originalLabel;
            if (note) note.textContent = originalNote;
          }, 4000);
        });
    });
  }

  /* ---------- Contact form — real submission via Netlify Forms ---------- */
  function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const status = document.getElementById('contact-status');
    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button ? button.textContent : 'Send Message';

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      button.disabled = true;
      button.textContent = 'Sending…';

      submitNetlifyForm(form)
        .then((res) => {
          if (!res.ok) throw new Error('Submission failed');
          form.reset();
          if (status) {
            status.textContent = "Thanks for reaching out — we'll get back to you as soon as we can.";
            status.hidden = false;
          }
        })
        .catch(() => {
          if (status) {
            status.textContent = 'Something went wrong sending your message — please try again in a moment.';
            status.hidden = false;
          }
        })
        .finally(() => {
          button.disabled = false;
          button.textContent = originalLabel;
        });
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
