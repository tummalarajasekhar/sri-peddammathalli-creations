// Netlify Function for POST /api/contact (see redirect in netlify.toml)
const { handleContact } = require('../../lib/contact');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, message: 'Method not allowed' }) };
  }
  if ((event.body || '').length > 20000) {
    return { statusCode: 413, headers, body: JSON.stringify({ ok: false, message: 'Request too large' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, message: 'Invalid request' }) };
  }

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  const { status, json } = await handleContact(body, ip);
  return { statusCode: status, headers, body: JSON.stringify(json) };
};
