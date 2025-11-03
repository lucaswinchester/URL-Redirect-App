// netlify/functions/syncAddons.js
const fetch = require('node-fetch');
const supabase = require('./supabaseClient');
const { getZohoAccessToken } = require('./zohoAuth');

// List your product IDs here
const PRODUCT_IDS = [
  '1826627000294447965',
  '1826627000294480986',
  '1826627000294480994',
  '1826627000294530002',
  '1826627000284031960'
];

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

    // Fetch addons for all product IDs in parallel
    const addonResponses = await Promise.all(
      PRODUCT_IDS.map(async (productId) => {
        const url = `https://www.zohoapis.com/billing/v1/addons?product_id=${productId}`;
        const response = await fetch(url, options);
        const data = await response.json();
        if (!data.addons) {
          console.error(`No addons found for product_id: ${productId}`);
          return [];
        }
        return data.addons;
      })
    );

    // Flatten the array of arrays into a single array of addons
    const allAddons = addonResponses.flat();

    if (allAddons.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No addons found for provided product IDs' }),
      };
    }

    // Map addon fields to match the 'addons' table schema in Supabase
    const insertData = allAddons.map((addon) => ({
      zoho_id: addon.addon_code,
      name: addon.name,
      interval_frequency: addon.interval,
      interval_unit: addon.interval_unit,
      description: addon.description || '',
      created_at: addon.created_at,
      updated_at: addon.updated_at,
      price: addon.price_brackets[0].price,
    }));

    console.log(insertData);

    const { error } = await supabase
    .from('addons')
    .upsert(insertData, { onConflict: 'zoho_id' });
  
    if (error) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to sync addons' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, count: insertData.length }),
    };
  } catch (err) {
    console.error('Sync failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
