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

    let invoiceResponse;
    
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

    const response = await fetch(`https://www.zohoapis.com/billing/v1/invoices/${invoice_id}`, options)
      .then(response => response.json())
      .then(response => invoiceResponse = response)
      .catch(err => console.error(err));

    console.log('Response: ', invoiceResponse);

    const invoice = invoiceResponse.invoice;
    console.log('Invoice: ', invoice);

    if (!invoiceResponse.ok) {
      console.error('API Error Response:', {
        status: invoiceResponse.status,
        data: invoiceResponse
      });
      return {
        statusCode: invoiceResponse.status,
        body: JSON.stringify(data)
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

