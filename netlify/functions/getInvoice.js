// netlify/functions/get-invoice.js
const fetch = require('node-fetch');
const { zohoAuth } = require('./zohoAuth'); // Adjust the path as needed

exports.handler = async (event) => {
  const { invoice_id } = event.queryStringParameters;

  if (!invoice_id) {
    return { statusCode: 400, body: 'Missing invoice_id' };
  }

  try {
    // Get a valid Zoho access token using your zohoAuth function
    const accessToken = await zohoAuth();

    // Your Zoho organization ID (from env or config)
    const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;

    const zohoUrl = `https://subscriptions.zoho.com/api/v1/invoices/${invoice_id}?organization_id=${ZOHO_ORG_ID}`;

    const response = await fetch(zohoUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify(data) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
