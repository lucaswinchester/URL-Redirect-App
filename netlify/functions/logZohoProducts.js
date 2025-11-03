const fetch = require('node-fetch');
const { getZohoAccessToken } = require('./zohoAuth');

async function logAllZohoProductIds() {
  try {
    const accessToken = await getZohoAccessToken();

    const options = {
      method: 'GET',
      headers: {
        'X-com-zoho-subscriptions-organizationid': process.env.ZOHO_ORGANIZATION_ID,
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };

    // Fetch all products from Zoho
    const response = await fetch(
      'https://www.zohoapis.com/billing/v1/products',
      options
    );
    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      console.error('No products found in Zoho response:', data);
      return;
    }

    console.log('Product IDs from Zoho:');
    data.products.forEach((product, idx) => {
      console.log(`${idx + 1}: ${product.product_id} (${product.name})`);
    });
  } catch (err) {
    console.error('Failed to fetch product IDs from Zoho:', err);
  }
}

// Call the function
logAllZohoProductIds();
