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

    // Zoho Billing API endpoint for invoice details
    const zohoUrl = `https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`;

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'X-com-zoho-subscriptions-organizationid': process.env.ZOHO_ORG_ID,
      },
    };

    const response = await fetch(zohoUrl, options)
    .then(response => response.json())
    .then(response => invoiceResponse = response)
    .catch(err => console.error(err));

    console.log('Invoice: ', invoiceResponse.invoice)

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
