const fetch = require('node-fetch');
const { getZohoAccessToken } = require('./zohoAuth');

exports.handler = async (event) => {
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
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: 'INVALID_REQUEST',
          message: 'Invoice ID is required'
        })
      };
    }

    try {
      const response = await fetch(`https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`, options);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        return {
          statusCode: response.status,
          body: JSON.stringify({
            code: 'API_ERROR',
            message: error.message || 'Failed to fetch invoice from Zoho',
            details: error
          })
        };
      }

      const data = await response.json();
      console.log('Invoice Response:', data);

      if (data.code !== 0) {
        console.error('API Error Response:', data);
        return {
          statusCode: 500,
          body: JSON.stringify(data)
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(data)
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          code: 'INTERNAL_ERROR',
          message: 'Failed to process invoice request',
          details: error.message
        })
      };
    }

    console.log('Successfully retrieved invoice data');
    return {
      statusCode: 200,
      body: JSON.stringify(invoiceResponse),
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

