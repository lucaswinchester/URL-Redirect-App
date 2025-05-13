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

    console.log('Searching for customer with email:', email);
    const accessToken = await getZohoAccessToken();
    
    // Search for customer by email
    const response = await fetch(
      `${ZOHO_BILLING_API_URL}/customers?email=${encodeURIComponent(email)}`,
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
    console.log('Zoho API response:', JSON.stringify(data, null, 2));

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
      // Find exact email match (case insensitive)
      const customer = data.customers.find(c => 
        c.email && c.email.toLowerCase() === email.toLowerCase()
      );

      if (customer) {
        console.log('Found customer:', customer);
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            customer: {
              first_name: customer.first_name || '',
              last_name: customer.last_name || '',
              display_name: customer.display_name || '',
              email: customer.email,
              customer_id: customer.customer_id
            }
          })
        };
      }
    }

    // No customers found
    console.log('No customer found with email:', email);
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
