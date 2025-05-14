const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");
const { v4: uuidv4 } = require('uuid');

const ADDONS = [
];

exports.handler = async (event) => {
  // Handle GET /checkout/:id requests
  if (event.httpMethod === 'GET' && event.path.includes('/checkout/')) {
    console.log('Incoming request:', { path: event.path, query: event.queryStringParameters });
    
    try {
      // Extract ID from path
      const id = event.path.split('/').pop();
      if (!id) {
        console.error('No ID provided in path');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing checkout ID' })
        };
      }
      
      console.log('Looking up checkout data for ID:', id);
      
      // Look up the checkout data in Supabase using the UUID column
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Supabase lookup result:', { 
        hasData: !!data, 
        error: error?.message,
        data: data ? Object.keys(data) : [] 
      });

      if (error) {
        console.error('Supabase error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Database error', details: error })
        };
      }

      if (!data) {
        console.log('No checkout data found for ID:', id);
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Checkout session not found' })
        };
      }

      // Prepare agent info with all stored parameters
      const agentInfo = {
        "Agent ID": data.cf_agent_id,
        "Dealer ID": data.cf_dealer_id,
        "Company Name": data.cf_dealer_name,
        "Distributor Name": data.cf_distributor_name,
        "Distributor ID": data.cf_distributor_id,
        "Email": data.cf_dealer_email,
        customer_id: data.customer_id,
        ...(data.customer_info ? JSON.parse(data.customer_info) : {})
      };
      
      // Process addon_id to ensure it's a clean array of addon codes
      let addons = [];
      if (data.addon_id) {
        if (Array.isArray(data.addon_id)) {
          // If it's already an array, clean each item
          addons = data.addon_id
            .filter(id => id && typeof id === 'string') // Filter out null/undefined and non-strings
            .map(id => id.trim()) // Trim whitespace
            .filter(id => id.length > 0) // Remove empty strings
            .map(id => ({ addon_code: id })); // Format for Zoho
        } else if (typeof data.addon_id === 'string') {
          // If it's a string, try to parse it as JSON array
          try {
            const parsed = JSON.parse(data.addon_id);
            if (Array.isArray(parsed)) {
              addons = parsed
                .filter(id => id && typeof id === 'string')
                .map(id => id.trim())
                .filter(id => id.length > 0)
                .map(id => ({ addon_code: id }));
            } else if (typeof parsed === 'string') {
              // Single addon ID as string
              const id = parsed.trim();
              if (id) addons = [{ addon_code: id }];
            }
          } catch (e) {
            // If parsing fails, treat as single addon ID
            const id = data.addon_id.trim();
            if (id) addons = [{ addon_code: id }];
          }
        }
      }
      
      console.log('Generating payment URL with:', {
        plan_id: data.plan_id,
        addons: addons,
        has_addons: addons.length > 0
      });
      
      const checkoutUrl = await createZohoPaymentLink(data.plan_id, agentInfo, addons);
      
      if (!checkoutUrl) {
        console.error('Failed to generate payment URL - no URL returned');
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to generate payment URL' })
        };
      }
      console.log('Generated payment URL:', checkoutUrl);
      
      // Add all necessary parameters to the checkout URL
      const url = new URL(checkoutUrl);
      url.searchParams.set("cf_dealer_id", data.cf_dealer_id);
      if (data.cf_agent_id) url.searchParams.set("cf_agent_id", data.cf_agent_id);
      if (data.cf_dealer_name) url.searchParams.set("cf_dealer_name", data.cf_dealer_name);
      if (data.cf_distributor_name) url.searchParams.set("cf_distributor_name", data.cf_distributor_name);
      if (data.cf_distributor_id) url.searchParams.set("cf_distributor_id", data.cf_distributor_id);
      if (data.cf_dealer_email) url.searchParams.set("cf_dealer_email", data.cf_dealer_email);
      if (data.source) url.searchParams.set("source", data.source);
      if (data.customer_id) url.searchParams.set("customer_id", data.customer_id);
      
      const finalUrl = url.toString();

      if (!checkoutUrl) {
        throw new Error('Failed to generate payment URL');
      }

      // Redirect to the payment URL with all parameters
      return {
        statusCode: 302,
        headers: {
          Location: finalUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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

  // Handle POST /checkout (original functionality)
  if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/getUrls') {
    try {
      console.log('Handling POST /checkout with body:', event.body);
      const body = JSON.parse(event.body);
      const { planID, addonID, cf_dealer_id, cf_agent_id, source, customer_id, customerData } = body;
      
      console.log(addonID);
      
      // Validate required fields
      if (!planID || !cf_dealer_id || !cf_agent_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required parameters' })
        };
      }

      // Parse customer info if provided
      let customerInfo = customerData;
      if (customerInfo && typeof customerInfo === 'string') {
        try {
          customerInfo = JSON.parse(customerInfo);
        } catch (e) {
          console.error('Error parsing customerInfo:', e);
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid customer info format' })
          };
        }
      }

      // Get agent details from Airtable
      const agentDetails = await getAgentDetails(cf_agent_id);
      if (!agentDetails) {
        console.error('Agent not found:', cf_agent_id);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Agent not found' })
        };
      }

      // Prepare the data to send to Zoho
      const zohoData = { ...agentDetails };

      // Generate a UUID for the checkout session
      const id = uuidv4();
      
      // Prepare checkout data
      const checkoutData = {
        id,
        plan_id: planID,
        addon_id: addonID,
        cf_dealer_id,
        cf_agent_id,
        cf_dealer_name: agentDetails.dealer_name,
        cf_distributor_name: agentDetails.distributor_name,
        cf_distributor_id: agentDetails.distributor_id,
        cf_dealer_email: agentDetails.dealer_email,
        source: source || 'direct',
        customer_id: customer_id || null,
        customer_info: customerInfo ? JSON.stringify(customerInfo) : null,
        created_at: new Date().toISOString()
      };

      // Store the checkout data in Supabase
      const { data: insertedData, error: insertError } = await supabase
        .from('bundles')
        .insert([checkoutData])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting checkout data:', insertError);
        throw new Error('Failed to create checkout session');
      }

      try {
        // Prepare agent info for Zoho
        const agentInfo = {
          ...zohoData,
          ...(customerInfo || {}),
          customer_id: customer_id || null
        };

        // Generate the payment URL with all parameters
        const checkoutUrl = await createZohoPaymentLink(planID, agentInfo, addonID);
        
        if (!checkoutUrl) {
          throw new Error('Failed to generate payment URL');
        }
        
        // Add all necessary parameters to the checkout URL
        const url = new URL(checkoutUrl);
        url.searchParams.set("cf_dealer_id", cf_dealer_id);
        if (cf_agent_id) url.searchParams.set("cf_agent_id", cf_agent_id);
        if (agentDetails.dealer_name) url.searchParams.set("cf_dealer_name", agentDetails.dealer_name);
        if (agentDetails.distributor_name) url.searchParams.set("cf_distributor_name", agentDetails.distributor_name);
        if (agentDetails.distributor_id) url.searchParams.set("cf_distributor_id", agentDetails.distributor_id);
        if (agentDetails.dealer_email) url.searchParams.set("cf_dealer_email", agentDetails.dealer_email);
        if (source) url.searchParams.set("source", source);
        if (customer_id) url.searchParams.set("customer_id", customer_id);
        
        const finalUrl = url.toString();

        // Create a short URL for the checkout session
        const shortUrl = `${process.env.URL}/checkout/${id}`;

        // Update the checkout data with the generated URLs
        await supabase
          .from('bundles')
          .update({ 
            payment_url: finalUrl,
            short_url: shortUrl
          })
          .eq('id', id);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkout_url: finalUrl,
            short_url: shortUrl,
            checkout_id: id
          })
        };
      } catch (error) {
        console.error('Error generating payment URL:', error);
        throw new Error('Failed to generate payment URL: ' + error.message);
      }
    } catch (error) {
      console.error('Error in getUrls function:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error', details: error.message })
      };
    }
  }
};
