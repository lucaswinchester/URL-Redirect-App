// netlify/functions/syncPlans.js
const fetch = require('node-fetch');
const supabase = require('./supabaseClient');
const { getZohoAccessToken } = require('./zohoAuth');

exports.handler = async () => {
  try {
    const accessToken = await getZohoAccessToken();

    const response = await fetch('https://www.zohoapis.com/billing/v1/plans?product_id=1826627000213811140', {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'X-com-zoho-subscriptions-organizationid': process.env.ZOHO_ORGANIZATION_ID,
        'Content-Type': 'application/json',
      },
    });

    console.log(response);

    const json = await response.json();
    const plans = json.plans || [];

    const insertData = plans.map((plan) => ({
      zoho_id: plan.plan_code,
      name: plan.name,
      price: plan.recurring.price,
      interval: plan.recurring.interval,
      description: plan.description || '',
    }));

    console.log(insertData);

    const { error } = await supabase.from('plans').upsert(insertData);

    if (error) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to sync plans' }),
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
