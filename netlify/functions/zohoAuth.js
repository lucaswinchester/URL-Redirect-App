// netlify/functions/zohoAuth.js
const fetch = require('node-fetch');

let cachedToken = null;
let cachedExpiry = null;

exports.getZohoAccessToken = async () => {
  const now = Date.now();

  // Use cached token if valid
  if (cachedToken && cachedExpiry && now < cachedExpiry - 60 * 1000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  });

  const res = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params}`, {
    method: 'POST',
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(`Failed to refresh Zoho token: ${JSON.stringify(data)}`);
  }

  // Cache token for re-use in current session
  cachedToken = data.access_token;
  cachedExpiry = now + data.expires_in * 1000;

  return cachedToken;
};
