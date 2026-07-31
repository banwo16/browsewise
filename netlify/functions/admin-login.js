/* ==========================================================================
   admin-login.js — POST { password } → sets a signed session cookie.
   The password itself is never stored anywhere but the Netlify env var.
   ========================================================================== */

const { createSessionToken, buildSetCookieHeader, jsonResponse } = require('../lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return jsonResponse(500, {
      error: 'Admin login is not configured. Set ADMIN_PASSWORD in Netlify environment variables.',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid request body' });
  }

  if (!body.password || body.password !== adminPassword) {
    // Deliberately vague + delayed-free response to avoid leaking which part failed.
    return jsonResponse(401, { error: 'Incorrect password' });
  }

  const token = createSessionToken();
  return jsonResponse(
    200,
    { ok: true },
    { 'Set-Cookie': buildSetCookieHeader(token) }
  );
};
