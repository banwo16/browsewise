const { requireAuth, jsonResponse } = require('../lib/auth');

exports.handler = async (event) => {
  return jsonResponse(200, { authenticated: requireAuth(event) });
};
