const { buildSetCookieHeader, jsonResponse } = require('../lib/auth');

exports.handler = async () => {
  return jsonResponse(
    200,
    { ok: true },
    { 'Set-Cookie': buildSetCookieHeader(null, { clear: true }) }
  );
};
