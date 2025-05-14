const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");

const ADDONS = [
];

exports.handler = async (event) => {
  try {
    const { planID, cf_dealer_id, cf_agent_id, source, cf_source_url, customerInfo, customer_id } = event.queryStringParameters;

    console.log('Source URL: ', cf_source_url);

    if (!planID || !cf_dealer_id || !cf_agent_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters: Plan ID, Dealer ID, or Agent ID" }),
      };
    }

    // Parse customer info from form
    let customerInfoObj = {};
    try {
      customerInfoObj = customerInfo ? JSON.parse(customerInfo) : {};
    } catch (e) {
      console.error('Failed to parse customer info:', e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid customer information" }),
      };
    }

    // Get agent details
    const agentInfo = await getAgentDetails(cf_dealer_id, cf_agent_id);

    if (!agentInfo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No matching agent info found" }),
      };
    }

    // Prepare the data to send to Zoho
    let zohoData = { ...agentInfo };
    
    if (customer_id) {
      // For existing customers, set the customer_id at the top level
      zohoData.customer_id = customer_id;
      // Remove any customer fields that might have come from agentInfo
      delete zohoData.email;
      delete zohoData.first_name;
      delete zohoData.last_name;
    } else if (customerInfoObj) {
      // For new customers, include all customer info
      // Map the customer data to the expected format
      zohoData = {
        ...zohoData,
        'First Name': customerInfoObj['First Name'],
        'Last Name': customerInfoObj['Last Name'],
        'Email': customerInfoObj['Email'],
        'Company Name': customerInfoObj['Company Name'],
        billing_address: customerInfoObj.billing_address,
        shipping_address: customerInfoObj.shipping_address
      };
    }
    // We'll store the plan and customer data in Supabase now
    // The actual payment URL will be generated when the short URL is accessed
    console.log('Storing plan and customer data in Supabase');

    // Helper function to sanitize text fields
    const sanitizeText = (value) => {
      if (Array.isArray(value)) value = value[0];
      if (typeof value === "string") return value.trim();
      return value;
    };

    // Prepare data for Supabase
    const supabaseData = {
      plan_id: planID,
      addon_id: JSON.stringify(ADDONS.map(a => a.addon_code)),
      cf_dealer_id,
      cf_agent_id,
      cf_dealer_name: sanitizeText(agentInfo["Company Name"]) || null,
      cf_distributor_name: sanitizeText(agentInfo["Distributor Name"]) || null,
      cf_distributor_id: sanitizeText(agentInfo["Distributor ID"]) || null,
      cf_dealer_email: sanitizeText(agentInfo["Email"]) || null,
      source: cf_source_url || null,
      customer_info: customerInfo ? JSON.stringify(customerInfoObj) : null,
      customer_id: customer_id || null
    };

    // Insert data into Supabase and get the inserted row
    const { data, error } = await supabase
      .from("checkout_data")
      .insert([supabaseData])
      .select();

    if (error || !data || !data[0]) {
      console.error("Supabase insert error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to insert data into Supabase" }),
      };
    }

    const checkoutDataId = data[0].id;

    // Return the short URL that can be used to generate the checkout link
    const shortUrl = `/checkout/${checkoutDataId}`;
    
    // Make sure we're returning JSON, not redirecting
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        bundle_id: checkoutDataId,
        short_url: shortUrl,
        plan_id: planID,
        addon_id: ADDONS.map(a => a.addon_code),
        cf_dealer_id,
        cf_agent_id: agentInfo["Agent ID"] || cf_agent_id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
