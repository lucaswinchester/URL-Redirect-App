const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");

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

    // Always include agent info, but use customer_id for the account if provided
    const combinedInfo = {
      ...agentInfo, // Always include agent info
      ...(customer_id ? { customer_id } : customerInfoObj) // Use customer_id if provided, otherwise use customerInfoObj
    };
    
    // Remove any customer fields that might have come from agentInfo when we have a customer_id
    if (customer_id) {
      delete combinedInfo.email;
      delete combinedInfo.first_name;
      delete combinedInfo.last_name;
    }
    console.log('Combined customer info:', JSON.stringify(combinedInfo, null, 2));
    
    const checkoutUrl = await createZohoPaymentLink(planID, combinedInfo);

    if (!checkoutUrl) {
      console.error('Failed to create payment link. Response:', response);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to create payment link", details: response }),
      };
    }

    // Helper function to sanitize text fields
    const sanitizeText = (value) => {
      if (Array.isArray(value)) value = value[0];
      if (typeof value === "string") return value.trim();
      return value;
    };

    // Prepare data for Supabase
    const supabaseData = {
      plan_id: planID,
      checkout_url: checkoutUrl,
      cf_dealer_id,
      cf_agent_id,
      cf_dealer_name: sanitizeText(agentInfo["Company Name"]) || null,
      cf_distributor_name: sanitizeText(agentInfo["Distributor Name"]) || null,
      cf_distributor_id: sanitizeText(agentInfo["Distributor ID"]) || null,
      cf_dealer_email: sanitizeText(agentInfo["Email"]) || null,
      source: cf_source_url || null,
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

    // Build the full checkout URL with all params
    const fullUrl = new URL(checkoutUrl);
    fullUrl.searchParams.set("cf_dealer_id", cf_dealer_id);
    if (agentInfo["Agent ID"]) fullUrl.searchParams.set("cf_agent_id", agentInfo["Agent ID"]);
    if (agentInfo["Company Name"]) fullUrl.searchParams.set("cf_dealer_name", agentInfo["Company Name"]);
    if (agentInfo["Distributor Name"]) fullUrl.searchParams.set("cf_distributor_name", agentInfo["Distributor Name"]);
    if (agentInfo["Distributor ID"]) fullUrl.searchParams.set("cf_distributor_id", agentInfo["Distributor ID"]);
    if (agentInfo["Email"]) fullUrl.searchParams.set("cf_dealer_email", agentInfo["Email"]);
    if (source) fullUrl.searchParams.set("source", source);
    if (cf_source_url) fullUrl.searchParams.set("cf_source_url", cf_source_url);
    // Add the checkout_data_id for tracking
    fullUrl.searchParams.set("checkout_data_id", checkoutDataId);

    return {
      statusCode: 302,
      headers: {
        Location: fullUrl.toString()
      }
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
