// netlify/functions/get-invoice.js
const fetch = require('node-fetch');
const { zohoAuth } = require('./zohoAuth');

exports.handler = async (event) => {
  const { invoice_id } = event.queryStringParameters;

  if (!invoice_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        code: 'INVALID_REQUEST',
        message: 'Invoice ID is required'
      })
    };
  }

  try {
    const accessToken = await zohoAuth();
    const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;

    const response = await fetch(
      `https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`, 
      {
        method: 'GET',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'X-com-zoho-subscriptions-organizationid': ZOHO_ORG_ID,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    };

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch invoice details'
      })
    };
  }
};
