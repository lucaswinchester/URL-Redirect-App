const { getCheckoutUrlByPlanID, getAgentDetails } = require("./airtableHelpers");
const supabase = require("./supabaseClient");

exports.handler = async (event) => {
  try {
    const { planID, cf_dealer_id, cf_agent_id, source, cf_source_url } = event.queryStringParameters;

    console.log('Source URL: ', cf_source_url);

    if (!planID || !cf_dealer_id || !cf_agent_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters: Plan ID, Dealer ID, or Agent ID" }),
      };
    }

    const checkoutUrl = await getCheckoutUrlByPlanID(planID);
    const agentInfo = await getAgentDetails(cf_dealer_id, cf_agent_id);

    if (!checkoutUrl || !agentInfo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No matching checkout page or agent info found" }),
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
      statusCode: 200,
      body: JSON.stringify({ url: fullUrl.toString() }),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
