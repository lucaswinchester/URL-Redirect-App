const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  console.log('Incoming request:', {
    httpMethod: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  // Handle GET /checkout/:id and POST /checkout/:id requests
  if ((event.httpMethod === 'GET' || event.httpMethod === 'POST') && event.path.includes('/checkout/')) {
    try {
      // Extract ID from path
      const id = event.path.split('/').pop();
      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing ID' }) };
      }

      // Lookup bundle/plan in Supabase
      let { data, error } = await supabase
        .from('bundles')
        .select('*')
        .or(`plan_id.eq.${id},id.eq.${id}`)
        .single();

      if (error || !data) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Plan or checkout session not found' }) };
      }

      // Parse the request body if this is a POST request
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

      // Get agent details from Airtable
      let airtableResponse = await getAgentDetails(requestBody.dealer_id, requestBody.agent_id);
      if (!airtableResponse) {
        airtableResponse = await getAgentDetails(requestBody.cf_dealer_id, requestBody.cf_agent_id);
      }

      // Prepare agent info for Zoho
      let agentInfo = {
        cf_agent_id: data.cf_agent_id || queryParams.cf_agent_id,
        cf_dealer_id: data.cf_dealer_id || queryParams.cf_dealer_id,
        cf_dealer_name: airtableResponse?.['Company Name'] || data.cf_dealer_name || queryParams.cf_dealer_name,
        cf_distributor_name: airtableResponse?.['Distributor Name']?.[0] || data.cf_distributor_name || queryParams.cf_distributor_name,
        cf_distributor_id: airtableResponse?.['Distributor ID']?.[0] || data.cf_distributor_id || queryParams.cf_distributor_id,
        cf_dealer_email: airtableResponse?.['Email'] || data.cf_dealer_email || queryParams.cf_dealer_email,
        'Agent ID': airtableResponse?.['Agent ID'] || data['Agent ID'] || data.agent_id,
        'Company Name': airtableResponse?.['Company Name'] || data.cf_dealer_name || queryParams.cf_dealer_name,
        'Distributor Name': airtableResponse?.['Distributor Name']?.[0] || data.cf_distributor_name || queryParams.cf_distributor_name,
        'Distributor ID': airtableResponse?.['Distributor ID']?.[0] || data.cf_distributor_id || queryParams.cf_distributor_id,
      };

      // --- CRITICAL LOGIC: Only pass customer_id for existing, or customerData for new ---
      if (requestBody.customer_id) {
        // Existing customer: only include customer_id
        agentInfo.customer_id = requestBody.customer_id;
      } else if (requestBody.customerData) {
        // New customer: include all customer fields at root
        Object.assign(agentInfo, requestBody.customerData);
      }

      // Prepare plan data for Zoho
      let addons = [];
      if (data.addon_id) {
        if (Array.isArray(data.addon_id)) {
          addons = data.addon_id
            .filter(id => id && typeof id === 'string')
            .map(id => id.trim())
            .filter(id => id.length > 0)
            .map(id => ({ addon_code: id }));
        } else if (typeof data.addon_id === 'string') {
          try {
            const parsed = JSON.parse(data.addon_id);
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
            const id = data.addon_id.trim();
            if (id) addons = [{ addon_code: id }];
          }
        }
      }

      const planData = {
        plan_id: data.plan_id,
        addons: addons,
        has_addons: addons.length > 0,
        ...(data.plan_name && { plan_name: data.plan_name }),
        ...(data.plan_price && { plan_price: data.plan_price })
      };

      // --- Call Zoho ---
      const zohoResponse = await createZohoPaymentLink(planData, agentInfo);

      if (!zohoResponse?.success || !zohoResponse?.hostedPageUrl) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to generate payment URL' }) };
      }

      // Add query parameters to the checkout URL
      const url = new URL(zohoResponse.hostedPageUrl);
      const params = {
        cf_dealer_id: data.cf_dealer_id,
        cf_agent_id: data.cf_agent_id,
        cf_dealer_name: data.cf_dealer_name,
        cf_distributor_name: data.cf_distributor_name,
        cf_distributor_id: data.cf_distributor_id,
        cf_dealer_email: data.cf_dealer_email,
        cf_source_url: data.source,
        customer_id: data.customer_id
      };
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      const finalUrl = url.toString();

      // Store the final URL in Supabase for reference
      try {
        await supabase
          .from('bundles')
          .update({
            payment_url: finalUrl,
            status: 'redirected',
            redirected_at: new Date().toISOString()
          })
          .eq('id', data.id);
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
          plan_id: data.plan_id,
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
