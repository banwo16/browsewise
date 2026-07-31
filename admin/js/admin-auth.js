/* ==========================================================================
   admin-auth.js — Thin client for the admin-login/-logout/-session functions.
   Session state lives in an httpOnly cookie set by the server, so this file
   never touches the token directly — it just calls the endpoints and lets
   the browser handle the cookie.
   ========================================================================== */

const AdminAuth = (function () {
  'use strict';

  async function login(password) {
    const res = await fetch('/.netlify/functions/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sign in failed');
    return data;
  }

  async function logout() {
    await fetch('/.netlify/functions/admin-logout', { method: 'POST', credentials: 'same-origin' });
  }

  async function checkSession() {
    try {
      const res = await fetch('/.netlify/functions/admin-session', { credentials: 'same-origin' });
      const data = await res.json();
      return Boolean(data.authenticated);
    } catch (e) {
      return false;
    }
  }

  /** Call on the login page: bounce straight to the dashboard if already signed in. */
  async function redirectIfAuthenticated(target) {
    if (await checkSession()) window.location.href = target;
  }

  /** Call on protected admin pages: bounce to login if not signed in. */
  async function requireAuthOrRedirect(loginPage = 'index.html') {
    const ok = await checkSession();
    if (!ok) window.location.href = loginPage;
    return ok;
  }

  return { login, logout, checkSession, redirectIfAuthenticated, requireAuthOrRedirect };
})();
