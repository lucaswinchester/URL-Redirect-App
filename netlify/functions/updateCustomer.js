const { getZohoAccessToken } = require('./zohoAuth');

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = 'https://www.zohoapis.com/billing/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { customerId, address } = JSON.parse(event.body);

    if (!customerId || !address) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Customer ID and address are required' })
      };
    }

    const accessToken = await getZohoAccessToken();

    // Get current customer data
    const getResponse = await fetch(
      `${ZOHO_BILLING_API_URL}/customers/${encodeURIComponent(customerId)}`,
      {
        headers: {
          'X-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error('Failed to fetch customer data');
    }

    const customerData = await getResponse.json();
    const updatePayload = {};

    // Set the correct address field
    if (address.type === 'billing') {
      updatePayload.billing_address = {
        attention: address.attention || '',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: address.country || ''
      };
      // Keep the current shipping address if it exists
      if (customerData.customer.shipping_address) {
        updatePayload.shipping_address = customerData.customer.shipping_address;
      }
    } else if (address.type === 'shipping') {
      updatePayload.shipping_address = {
        attention: address.attention || '',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: address.country || ''
      };
      // Keep the current billing address if it exists
      if (customerData.customer.billing_address) {
        updatePayload.billing_address = customerData.customer.billing_address;
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Address type must be billing or shipping' })
      };
    }

    // You may want to include other required fields (like display_name, email, etc.)
    // Zoho requires at least display_name and email for updates
    updatePayload.display_name = customerData.customer.display_name;
    updatePayload.email = customerData.customer.email;

    // Update the customer with the new address
    const updateResponse = await fetch(
      `${ZOHO_BILLING_API_URL}/customers/${encodeURIComponent(customerId)}`,
      {
        method: 'PUT',
        headers: {
          'X-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      }
    );

    const result = await updateResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
