const { getZohoAccessToken } = require('./zohoAuth');

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = 'https://www.zohoapis.com/billing/v1';

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);
    
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const accessToken = await getZohoAccessToken();
    
    // Search for customer by email
    const response = await fetch(
      `${ZOHO_BILLING_API_URL}/customums/receivingcustomers?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'X-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Zoho API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: data.message || 'Failed to search for customer',
          details: data
        })
      };
    }

    // Check if we found any customers
    if (data.customers && data.customers.length > 0) {
      // Return the first matching customer
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          customer: data.customers[0]
        })
      };
    }

    // No customers found
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        customer: null,
        message: 'No customer found with this email'
      })
    };

  } catch (error) {
    console.error('Error searching for customer:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
