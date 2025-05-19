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
    const { email, customerId } = JSON.parse(event.body);

    const accessToken = await getZohoAccessToken();

    // --- 1. Search by customerId if provided ---
    if (customerId) {
      console.log('Searching for customer by ID:', customerId);

      const response = await fetch(
        `${ZOHO_BILLING_API_URL}/customers/${customerId}`,
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
      console.log('Zoho API response (by ID):', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('Zoho API error:', data);
        return {
          statusCode: response.status,
          body: JSON.stringify({
            error: data.message || 'Failed to fetch customer by ID',
            details: data
          })
        };
      }

      const customerInfo = data.customer;

      // Extract custom fields
      const customFields = {};
      if (customerInfo.custom_fields && Array.isArray(customerInfo.custom_fields)) {
        customerInfo.custom_fields.forEach(field => {
          if (field.label && field.value) {
            const key = field.label
              .replace(/#/g, '')
              .toLowerCase()
              .replace(/\s+/g, '_');
            customFields[key] = field.value;
          }
        });
      }

      // Transform addresses
      const addresses = [];
      if (customerInfo.billing_address) {
        addresses.push({
          street: customerInfo.billing_address.street || '',
          city: customerInfo.billing_address.city || '',
          state: customerInfo.billing_address.state || '',
          zip: customerInfo.billing_address.zip || '',
          country: customerInfo.billing_address.country || '',
          type: 'billing'
        });
      }
      if (customerInfo.shipping_address) {
        addresses.push({
          street: customerInfo.shipping_address.street || '',
          city: customerInfo.shipping_address.city || '',
          state: customerInfo.shipping_address.state || '',
          zip: customerInfo.shipping_address.zip || '',
          country: customerInfo.shipping_address.country || '',
          type: 'shipping'
        });
      }

      // Return the detailed customer as an array for compatibility
      return {
        statusCode: 200,
        body: JSON.stringify({
          customers: [
            {
              first_name: customerInfo.first_name || '',
              last_name: customerInfo.last_name || '',
              display_name: customerInfo.display_name || '',
              email: customerInfo.email,
              company_name: customerInfo.company_name || '',
              customer_id: customerInfo.customer_id,
              id: customerInfo.customer_id,
              addresses: addresses,
              'Agent ID': customFields.agent_id || '',
              'Dealer ID': customFields.dealer_id || '',
              'Company Name': customerInfo.company_name || '',
              'Distributor Name': customFields.distributor_name || '',
              'Distributor ID': customFields.distributor_id || ''
            }
          ]
        })
      };
    }

    // --- 2. Fallback: Search by email (existing logic) ---
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email or customerId is required' })
      };
    }

    console.log('Searching for customer with email:', email);

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
      // Get detailed customer info for each matching customer
      const detailedCustomers = await Promise.all(
        data.customers
          .filter(c => c.email && c.email.toLowerCase().includes(email.toLowerCase()))
          .map(async customer => {
            try {
              // Get customer details including addresses
              const customerDetails = await fetch(
                `${ZOHO_BILLING_API_URL}/customers/${customer.customer_id}`,
                {
                  method: 'GET',
                  headers: {
                    'X-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
                    'Authorization': `Zoho-oauthtoken ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const customerData = await customerDetails.json();
              const customerInfo = customerData.customer;

              // Extract custom fields
              const customFields = {};
              if (customerInfo.custom_fields && Array.isArray(customerInfo.custom_fields)) {
                customerInfo.custom_fields.forEach(field => {
                  if (field.label && field.value) {
                    const key = field.label
                      .replace(/#/g, '')
                      .toLowerCase()
                      .replace(/\s+/g, '_');
                    customFields[key] = field.value;
                  }
                });
              }

              // Transform addresses
              const addresses = [];
              if (customerInfo.billing_address) {
                addresses.push({
                  attention: customerInfo.billing_address.attention || '',
                  street: customerInfo.billing_address.street || '',
                  city: customerInfo.billing_address.city || '',
                  state: customerInfo.billing_address.state || '',
                  zip: customerInfo.billing_address.zip || '',
                  country: customerInfo.billing_address.country || '',
                  type: 'billing'
                });
              }
              if (customerInfo.shipping_address) {
                addresses.push({
                  attention: customerInfo.shipping_address.attention || '',
                  street: customerInfo.shipping_address.street || '',
                  city: customerInfo.shipping_address.city || '',
                  state: customerInfo.shipping_address.state || '',
                  zip: customerInfo.shipping_address.zip || '',
                  country: customerInfo.shipping_address.country || '',
                  type: 'shipping'
                });
              }

              return {
                first_name: customerInfo.first_name || '',
                last_name: customerInfo.last_name || '',
                display_name: customerInfo.display_name || '',
                email: customerInfo.email,
                company_name: customerInfo.company_name || '',
                customer_id: customerInfo.customer_id,
                id: customerInfo.customer_id, // Add id alias for compatibility
                addresses: addresses,
                'Agent ID': customFields.agent_id || '',
                'Dealer ID': customFields.dealer_id || '',
                'Company Name': customerInfo.company_name || '',
                'Distributor Name': customFields.distributor_name || '',
                'Distributor ID': customFields.distributor_id || ''
              };
            } catch (error) {
              console.error('Error fetching customer details:', error);
              return null;
            }
          })
      );

      // Filter out any null results from failed fetches
      const validCustomers = detailedCustomers.filter(Boolean);

      // Return the detailed customers
      return {
        statusCode: 200,
        body: JSON.stringify({ customers: validCustomers })
      };
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
