const fetch = require("node-fetch");
const { getZohoAccessToken } = require("./zohoAuth");

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = "https://www.zohoapis.com/billing/v1";

async function createZohoPaymentLink(planID, agentInfo) {
  const accessToken = await getZohoAccessToken();
  
  const payload = {
    "plan_id": planID,
    "customer": {
      "first_name": agentInfo["First Name"] || "",
      "last_name": agentInfo["Last Name"] || "",
      "display_name": `${agentInfo["First Name"] || ''} ${agentInfo["Last Name"] || ''}`.trim(),
      "email": agentInfo["Email"],
      "company_name": agentInfo["Company Name"]
    },
    "redirect_url": process.env.SUCCESS_REDIRECT_URL,
    "cancel_url": process.env.CANCEL_REDIRECT_URL,
    "payment_options": {
      "payment_gateways": [
        {
          "gateway_id": process.env.ZOHO_PAYMENT_GATEWAY_ID
        }
      ]
    }
  };

  const response = await fetch(`${ZOHO_BILLING_API_URL}/hostedpages/newsubscription?organization_id=${ZOHO_ORGANIZATION_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return data.payment_link?.payment_link_url;
}

module.exports = { createZohoPaymentLink };
