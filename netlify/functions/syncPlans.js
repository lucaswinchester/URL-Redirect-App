// netlify/functions/syncPlans.js
const fetch = require('node-fetch');
const supabase = require('../../supabaseClient');
const { getZohoAccessToken } = require('./zohoAuth');

exports.handler = async () => {
  try {
    const accessToken = await getZohoAccessToken();

    const response = await fetch('https://subscriptions.zoho.com/api/v1/plans', {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();
    const plans = json.plans || [];

    const insertData = plans.map((plan) => ({
      zoho_plan_id: plan.plan_code,
      name: plan.name,
      price: plan.recurring.price,
      interval: plan.recurring.interval,
      description: plan.description || '',
    }));

    const { error } = await supabase.from('plans').upsert(insertData, {
      onConflict: ['zoho_plan_id'],
    });

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
