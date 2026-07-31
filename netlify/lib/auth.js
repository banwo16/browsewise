/* ==========================================================================
   auth.js — Minimal owner-only session auth.

   No user accounts, no third-party auth provider. A single password (set as
   the ADMIN_PASSWORD environment variable in Netlify) unlocks a signed,
   httpOnly session cookie. All admin functions call requireAuth(event)
   before doing anything.
   ========================================================================== */

const crypto = require('crypto');

const COOKIE_NAME = 'bw_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      'Missing ADMIN_SESSION_SECRET / ADMIN_PASSWORD environment variable. Set it in Netlify: Site settings → Environment variables.'
    );
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

/** Creates a signed session token: "<expiryTimestamp>.<signature>" */
function createSessionToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  let expected;
  try {
    expected = sign(payload);
  } catch (e) {
    return false;
  }

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  const expiresAt = Number(payload);
  if (!expiresAt || Date.now() > expiresAt) return false;

  return true;
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

/** Call at the top of every protected function. Returns true/false. */
function requireAuth(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || '');
  return verifySessionToken(cookies[COOKIE_NAME]);
}

function buildSetCookieHeader(token, { clear = false } = {}) {
  const parts = [
    `${COOKIE_NAME}=${clear ? '' : token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ];
  parts.push(clear ? 'Max-Age=0' : `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
  return parts.join('; ');
}

function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  };
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  requireAuth,
  buildSetCookieHeader,
  jsonResponse,
};
