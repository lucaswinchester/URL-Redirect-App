const fetch = require('node-fetch');
const supabase = require('./supabaseClient');
const { getZohoAccessToken } = require('./zohoAuth');

// Accept productIds as an argument or hardcode them here
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
        'X-com-zoho-subscriptions-organizationid':
          process.env.ZOHO_ORGANIZATION_ID,
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    };

    // Fetch plans for all product IDs in parallel
    const planResponses = await Promise.all(
      PRODUCT_IDS.map(async (productId) => {
        const url = `https://www.zohoapis.com/billing/v1/plans?product_id=${productId}`;
        const response = await fetch(url, options);
        const data = await response.json();
        if (!data.plans) {
          console.error(`No plans found for product_id: ${productId}`);
          return [];
        }
        return data.plans;
      })
    );

    // Flatten the array of arrays into a single array of plans
    const allPlans = planResponses.flat();

    if (allPlans.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No plans found for provided product IDs' }),
      };
    }

    const insertData = allPlans.map((plan) => ({
      zoho_id: plan.plan_code,
      name: plan.name,
      price: plan.recurring_price,
      interval_frequency: plan.interval,
      interval_unit: plan.interval_unit,
      description: plan.description || '',
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    }));

    const { error } = await supabase
    .from('plans')
    .upsert(insertData, { onConflict: 'zoho_id' });
  
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
