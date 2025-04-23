// netlify/functions/syncAddons.js
const fetch = require('node-fetch');
const supabase = require('./supabaseClient');
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

    let addonResponse;
    
    // Update the endpoint to fetch addons instead of plans
    const response = await fetch('https://www.zohoapis.com/billing/v1/addons?product_id=1826627000213811140', options)
      .then(response => response.json())
      .then(response => addonResponse = response)
      .catch(err => console.error(err));

    console.log('Response: ', addonResponse);

    const addons = addonResponse.addons;
    console.log('Addons: ', addons);

    // Map addon fields to match the 'addons' table schema in Supabase
    const insertData = addons.map((addon) => ({
      zoho_id: addon.addon_code,
      name: addon.name,
      price: addon.price,
      interval_frequency: addon.interval,
      interval_unit: addon.interval_unit,
      description: addon.description || '',
      created_at: addon.created_at,
      updated_at: addon.updated_at
    }));

    console.log(insertData);

    const { error } = await supabase.from('addons').upsert(insertData);

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
