const fetch = require('node-fetch');
const { getZohoAccessToken } = require('./zohoAuth');

exports.handler = async () => {
  try {
    const accessToken = await getZohoAccessToken();

    const options = {
      method: 'GET',
      headers: {
        'X-com-zoho-subscriptions-organizationid': process.env.ZOHO_ORGANIZATION_ID,
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      }
    };

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
  let invoiceResponse;
      
      const response = await fetch('https://www.zohoapis.com/billing/v1/invoices/${invoice_id}', options)
        .then(response => response.json())
        .then(response => invoiceResponse = response)
        .catch(err => console.error(err));
  
      console.log('Response: ', invoiceResponse);

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
}

