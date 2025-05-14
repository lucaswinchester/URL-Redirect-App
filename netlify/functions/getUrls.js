const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");
const { v4: uuidv4 } = require('uuid');

// Handle CORS preflight requests
const handleCors = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: ''
    };
  }
  return null;
};

exports.handler = async (event) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Log the incoming request
  console.log('Incoming request:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    queryStringParameters: event.queryStringParameters,
    body: event.body ? JSON.parse(event.body) : null
  });

  try {
    // Handle CORS preflight
    const corsResponse = handleCors(event);
    if (corsResponse) return corsResponse;

    // Handle GET /checkout/{planID} requests
    if (event.httpMethod === 'GET' && event.path.includes('/checkout/')) {
      console.log('Incoming GET request:', { path: event.path });
      
      // Extract planID from path (format: /checkout/planID)
      const planID = event.path.split('/').pop();
      if (!planID) {
        console.error('No plan ID provided in path');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing plan ID in URL' })
        };
      }
      
      console.log('Processing checkout for plan ID:', planID);
      
      // Return the planID to be used in the frontend
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ planID })
      };
    }

    // Handle POST requests for creating a new checkout session
    if (event.httpMethod === 'POST') {
      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      console.log('Parsed request body:', requestBody);
      
      const { planID, customerInfo, addons, cf_dealer_id, cf_agent_id, source, customer_id } = requestBody;
      
      console.log('Extracted parameters:', {
        planID,
        hasCustomerInfo: !!customerInfo,
        addons,
        cf_dealer_id,
        cf_agent_id,
        source,
        customer_id
      });
      
      if (!planID) {
        const error = 'Missing plan ID in request';
        console.error(error, { requestBody });
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error,
            receivedData: requestBody 
          })
        };
      }
      
      // Generate a unique ID for this checkout session
      const checkoutID = uuidv4();
      
      // Store the checkout session in Supabase
      const { data, error } = await supabase
        .from('checkout_sessions')
        .insert([
          {
            id: checkoutID,
            plan_id: planID,
            customer_info: customerInfo,
            addons: addons || [],
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]);
      
      if (error) {
        console.error('Error saving checkout session:', {
          error,
          errorDetails: error.details || error.message,
          planID,
          customerInfoKeys: customerInfo ? Object.keys(customerInfo) : null
        });
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          checkoutID,
          planID,
          status: 'created'
        })
      };
    }
    
    // Return 404 for unsupported methods
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};
