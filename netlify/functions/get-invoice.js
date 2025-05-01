// netlify/functions/get-invoice.js
const fetch = require('node-fetch');
const { zohoAuth } = require('./zohoAuth'); // Adjust path as needed

exports.handler = async (event) => {
  const { invoice_id } = event.queryStringParameters;

  console.log(invoice_id);

  if (!invoice_id) {
    return { statusCode: 400, body: 'Missing invoice_id' };
  }

  try {
    const accessToken = await zohoAuth();
    const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;

    // Zoho Billing API endpoint for invoice details
    const zohoUrl = `https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`;

    const response = await fetch(zohoUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'X-com-zoho-subscriptions-organizationid': ZOHO_ORG_ID,
      },
    });

    const data = await response.json();
    console.log(data);

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
