const supabase = require('./supabaseClient'); // Adjust path as needed

exports.handler = async (event) => {
  // 1. Get parameters from query string
  const params = event.queryStringParameters;
  const agent_id = params.agent_id || params.cf_agent_id;
  const dealer_id = params.dealer_id || params.cf_dealer_id;

  console.log('Agent ID:', agent_id);
  console.log('Dealer ID:', dealer_id);

  // 2. Get redirect: query param > Referer header > fallback
  let redirect = params.redirect;
  if (!redirect) {
    redirect = event.headers.referer || 'https://partners.revgennetworks.com/';
  }

  // 3. (Optional) Store the redirect URL for analytics/logging
  // await supabase.from('downloads').insert([{ agent_id, dealer_id, redirect, downloaded_at: new Date().toISOString() }]);

  // 4. Validate required params
  if (!agent_id || !dealer_id) {
    return {
      statusCode: 302,
      headers: { Location: redirect },
      body: 'No agent or dealer ID provided.',
    };
  }

  try {
    // 5. Get the partner (agent) record
    const { data: partner } = await supabase
      .from('partners')
      .select('agent_id_auto, agent_id, rgid, name, company_name, email')
      .eq('agent_id', agent_id)
      .eq('rgid', dealer_id)
      .single();

    if (!partner) throw new Error('No partner found.');

    // 6. Get all partner_plans for this agent
    const { data: plans } = await supabase
      .from('partner_plans')
      .select('short_code, bundle_id')
      .eq('agent_id_auto', partner.agent_id_auto);

    if (!plans || plans.length === 0) throw new Error('No plans found.');

    // 7. Get all bundles for these plans
    const bundleIds = plans.map((p) => p.bundle_id);
    const { data: bundles } = await supabase
      .from('bundles')
      .select('id, plan_id, Plan, addon_id, router_id')
      .in('id', bundleIds);

    console.log('Bundles:', bundles);

    // 8. Merge plans and bundles, build CSV rows
    const rows = plans.map((plan) => {
      const bundle = bundles.find((b) => b.id === plan.bundle_id) || {};
      return {
        'Plan Name': bundle.Plan || '',
        'Device Model': bundle.router_id || '',
        'Add-on(s)': bundle.addon_id || '',
        'Affiliate Link': `https://rvgn.link/checkout/${plan.short_code}`,
      };
    });

    console.log('Rows:', rows);

    // 9. Convert to CSV
    const csvHeader = Object.keys(rows[0]).join(',') + '\n';
    const csvBody = rows
      .map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const csv = csvHeader + csvBody;

    // 10. Return CSV as file download
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=links_${agent_id}_${dealer_id}.csv`,
        'Cache-Control': 'no-cache',
        // Optionally, expose the redirect for client-side use
        'X-Redirect-After-Download': redirect,
      },
      body: csv,
    };
  } catch (err) {
    // On error, just redirect
    return {
      statusCode: 302,
      headers: { Location: redirect },
      body: 'Error downloading links!',
    };
  }
};
