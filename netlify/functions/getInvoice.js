// netlify/functions/get-invoice.js
const fetch = require('node-fetch');
const { zohoAuth } = require('.netlify/functions/zohoAuth');

exports.handler = async (event) => {
  console.log('Received invoice request:', {
    event: event,
    invoice_id: event.queryStringParameters?.invoice_id
  });

  const { invoice_id } = event.queryStringParameters;

  if (!invoice_id) {
    console.log('Missing invoice_id parameter');
    return {
      statusCode: 400,
      body: JSON.stringify({
        code: 'INVALID_REQUEST',
        message: 'Invoice ID is required'
      })
    };
  }

  try {
    console.log('Fetching Zoho access token...');
    const accessToken = await zohoAuth();
    console.log('Successfully obtained access token');

    const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID;
    console.log('Using organization ID:', ZOHO_ORG_ID);

    const apiUrl = `https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`;
    console.log('Making API request to:', apiUrl);

    const response = await fetch(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'X-com-zoho-subscriptions-organizationid': ZOHO_ORG_ID,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('API Response Status:', response.status);
    
    const data = await response.json();
    console.log('API Response Data:', data);

    if (!response.ok) {
      console.error('API Error Response:', {
        status: response.status,
        data: data
      });
      return {
        statusCode: response.status,
        body: JSON.stringify(data)
      };
    }

    console.log('Successfully retrieved invoice data');
    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    };

  } catch (error) {
    console.error('Error fetching invoice:', {
      error: error,
      message: error.message,
      stack: error.stack
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch invoice details',
        error: error.message
      })
    };
  }
};
