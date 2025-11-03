const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");

exports.handler = async (event) => {
  console.log('Incoming request:', {
    httpMethod: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  if ((event.httpMethod === 'GET' || event.httpMethod === 'POST') && event.path.includes('/checkout/')) {
    try {
      // Extract short_code from path
      const short_code = event.path.split('/').pop();
      if (!short_code) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing short_code' }) };
      }

      // Lookup partner_plan by short_code
      const { data: partnerPlan, error: planError } = await supabase
        .from('partner_plans')
        .select('*')
        .eq('short_code', short_code)
        .single();

      if (planError || !partnerPlan) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Plan not found' }) };
      }

      // Get the partner (agent) details
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('agent_id_auto', partnerPlan.agent_id_auto)
        .single();

      if (partnerError || !partner) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Partner not found' }) };
      }

      // Get the bundle (plan) details
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', partnerPlan.bundle_id)
        .single();

      if (bundleError || !bundle) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Bundle not found' }) };
      }

      // Parse request body if POST
      let requestBody = {};
      if (event.httpMethod === 'POST' && event.body) {
        try {
          requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (e) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
        }
      }

      // Parse URL query parameters
      const queryParams = event.queryStringParameters || {};

      // Prepare agent info for Zoho (from partners table)
      let agentInfo = {
        cf_agent_id: partner.agent_id,
        cf_dealer_id: partner.rgid,
        cf_dealer_name: partner.company_name,
        cf_distributor_name: partner.distributor_name,
        cf_distributor_id: partner.distributor_id,
        cf_dealer_email: partner.email,
        'Agent ID': partner.agent_id,
        'Company Name': partner.company_name,
        'Distributor Name': partner.distributor_name,
        'Distributor ID': partner.distributor_id,
      };

      // --- CRITICAL LOGIC: Handle customer data and serial number ---
      console.log('Request body received:', JSON.stringify(requestBody, null, 2));
      
      // Handle serial number from request body (top level)
      if (requestBody.serial_number) {
        agentInfo.serial_number = requestBody.serial_number;
        console.log('Serial number from request body:', requestBody.serial_number);
      }
      
      if (requestBody.customer_id) {
        // For existing customers
        agentInfo.customer_id = requestBody.customer_id;
        
        // Include any customer data
        if (requestBody.customerData) {
          Object.assign(agentInfo, requestBody.customerData);
        }
      } else if (requestBody.customerData) {
        // For new customers, merge all customer data
        Object.assign(agentInfo, requestBody.customerData);
      }
      
      // Final check for serial number in customerData
      if (!agentInfo.serial_number && requestBody.customerData?.serial_number) {
        agentInfo.serial_number = requestBody.customerData.serial_number;
      }

      // Prepare plan data for Zoho
      let addons = [];
      if (bundle.addon_id) {
        if (Array.isArray(bundle.addon_id)) {
          addons = bundle.addon_id
            .filter(id => id && typeof id === 'string')
            .map(id => id.trim())
            .filter(id => id.length > 0)
            .map(id => ({ addon_code: id }));
        } else if (typeof bundle.addon_id === 'string') {
          try {
            const parsed = JSON.parse(bundle.addon_id);
            if (Array.isArray(parsed)) {
              addons = parsed
                .filter(id => id && typeof id === 'string')
                .map(id => id.trim())
                .filter(id => id.length > 0)
                .map(id => ({ addon_code: id }));
            } else if (typeof parsed === 'string') {
              const id = parsed.trim();
              if (id) addons = [{ addon_code: id }];
            }
          } catch (e) {
            const id = bundle.addon_id.trim();
            if (id) addons = [{ addon_code: id }];
          }
        }
      }

      const planData = {
        plan_id: bundle.plan_id,
        addons: addons,
        has_addons: addons.length > 0,
        ...(bundle.plan_name && { plan_name: bundle.plan_name }),
        ...(bundle.plan_price && { plan_price: bundle.plan_price }),
        ...(bundle.url && { url: bundle.url })
      };

      // Log the agent info with serial number for debugging
      console.log('Agent Info with Serial Number:', {
        ...agentInfo,
        serial_number: agentInfo.serial_number || 'Not provided',
        has_serial_number: !!agentInfo.serial_number
      });

      // --- Call Zoho ---
      const zohoResponse = await createZohoPaymentLink(planData, agentInfo);

      if (!zohoResponse?.success || !zohoResponse?.hostedPageUrl) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate payment URL' }) };
      }

      // Add query parameters to the checkout URL
      const url = new URL(zohoResponse.hostedPageUrl);
      const params = {
        cf_dealer_id: partner.rgid,
        cf_agent_id: partner.agent_id,
        cf_dealer_name: partner.company_name,
        cf_distributor_name: partner.distributor_name,
        cf_distributor_id: partner.distributor_id,
        cf_dealer_email: partner.email,
        cf_serial_number: agentInfo.serial_number,
        cf_source_url: 'Amazon',  // Set source to Amazon as default
        source: 'Amazon',         // Also set the main source parameter
        customer_id: bundle.customer_id,
        redirect_url: encodeURIComponent('https://rvgn.link/thank-you')
      };
      
      // Add serial number to URL params if it exists in the agent info
      if (agentInfo.serial_number) {
        params.cf_serial_number = agentInfo.serial_number;
      }
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      const finalUrl = url.toString();

      // Store the final URL in Supabase for reference (optional)
      try {
        await supabase
          .from('bundles')
          .update({
            payment_url: finalUrl,
            status: 'redirected',
            redirected_at: new Date().toISOString()
          })
          .eq('id', bundle.id);
      } catch (updateError) {
        console.error('Error updating bundle with redirect info:', updateError);
      }

      // Return the hosted page URL
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          hostedPageUrl: finalUrl,
          plan_id: bundle.plan_id,
          addons: addons
        })
      };
    } catch (error) {
      console.error('Checkout error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }

  // Default response for unhandled methods/paths
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'Not found',
      method: event.httpMethod,
      path: event.path,
      query: event.queryStringParameters
    })
  };
};
