const { getCheckoutUrlByPlanID, getAgentDetails } = require("./airtableHelpers");

exports.handler = async (event) => {
  try {
    const { planID, cf_dealer_id, source } = event.queryStringParameters;

    if (!planID || !cf_dealer_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters: planID or cf_dealer_id" }),
      };
    }

    const checkoutUrl = await getCheckoutUrlByPlanID(planID);
    const agentInfo = await getAgentDetails(cf_dealer_id);

    if (!checkoutUrl || !agentInfo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No matching checkout page or agent info found" }),
      };
    }

    const fullUrl = new URL(checkoutUrl);

    fullUrl.searchParams.set("cf_dealer_id", cf_dealer_id);
    if (agentInfo["Agent ID"]) fullUrl.searchParams.set("cf_agent_id", agentInfo["Agent ID"]);
    if (agentInfo["Dealer Name"]) fullUrl.searchParams.set("cf_dealer_name", agentInfo["Dealer Name"]);
    if (agentInfo["Distributor Name"]) fullUrl.searchParams.set("cf_distributor_name", agentInfo["Distributor Name"]);
    if (agentInfo["Distributor ID"]) fullUrl.searchParams.set("cf_distributor_id", agentInfo["Distributor ID"]);
    if (agentInfo["Email"]) fullUrl.searchParams.set("cf_dealer_email", agentInfo["Email"]);
    if (source) fullUrl.searchParams.set("source", source);

    return {
      statusCode: 302,
      headers: {
        Location: fullUrl.toString(),
      },
      body: "",
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
