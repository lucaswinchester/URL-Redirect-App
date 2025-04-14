const { getCheckoutUrlByPlanID, getAgentDetails } = require("./airtableHelpers");

exports.handler = async (event) => {
  try {
    const { planID, cf_dealer_id, cf_agent_id, source } = event.queryStringParameters;

    if (!planID || !cf_dealer_id || !cf_agent_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required parameters: Plan ID, Dealer ID, or Agent ID" }),
      };
    }

    const checkoutUrl = await getCheckoutUrlByPlanID(planID);
    const agentInfo = await getAgentDetails(cf_dealer_id, cf_agent_id);

    console.log(planID);
    console.log(checkoutUrl);
    console.log(cf_dealer_id);
    console.log(agentInfo);

    if (!checkoutUrl || !agentInfo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No matching checkout page or agent info found" }),
      };
    }

    const fullUrl = new URL(checkoutUrl);

    fullUrl.searchParams.set("cf_dealer_id", cf_dealer_id);
    if (agentInfo["Agent ID"]) fullUrl.searchParams.set("cf_agent_id", agentInfo["Agent ID"]);
    if (agentInfo["Company Name"]) fullUrl.searchParams.set("cf_dealer_name", agentInfo["Company Name"]);
    if (agentInfo["Distributor Name"]) fullUrl.searchParams.set("cf_distributor_name", agentInfo["Distributor Name"]);
    if (agentInfo["Distributor ID"]) fullUrl.searchParams.set("cf_distributor_id", agentInfo["Distributor ID"]);
    if (agentInfo["Email"]) fullUrl.searchParams.set("cf_dealer_email", agentInfo["Email"]);
    if (source) fullUrl.searchParams.set("source", source);

    console.log(fullUrl.toString());

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
