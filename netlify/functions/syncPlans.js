// netlify/functions/syncPlans.js
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

    let planResponse;
    
    const response = await fetch('https://www.zohoapis.com/billing/v1/plans?product_id=1826627000213811140', options)
      .then(response => response.json())
      .then(response => planResponse = response)
      .catch(err => console.error(err));

    console.log('Response: ', planResponse);

    const plans = planResponse.plans;
    console.log('Plans: ', plans);

    const insertData = plans.map((plan) => ({
      zoho_id: plan.plan_code,
      name: plan.name,
      price: plan.recurring_price,
      interval_frequency: plan.interval,
      interval_unit: plan.interval_unit,
      description: plan.description || '',
      is_active: plan.status,
      created_at: plan.created_at,
      updated_at: plan.updated_at
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
