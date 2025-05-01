const fetch = require('node-fetch');
const { zohoAuth } = require('./zohoAuth'); 

exports.handler = async (event) => {
  const { invoice_id } = event.queryStringParameters;

  console.log(invoice_id);

  if (!invoice_id) {
    return { statusCode: 400, body: 'Missing invoice_id' };
  }

  try {
    const accessToken = await getZohoAccessToken();

    const zohoUrl = `https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`;

    const options = {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'X-com-zoho-subscriptions-organizationid': process.env.ZOHO_ORG_ID,
      },
    };

    const response = await fetch(zohoUrl, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('API Error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.message || 'Failed to fetch invoice' })
      };
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
