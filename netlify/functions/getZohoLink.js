const fetch = require("node-fetch");
const { getZohoAccessToken } = require("./zohoAuth");

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = "https://www.zohoapis.com/billing/v1";

async function createZohoPaymentLink(planID, agentInfo) {
  const accessToken = await getZohoAccessToken();
  
  const options = {
    method: 'POST',
    headers: {
      'x-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "customer": {
        "first_name": agentInfo["First Name"] || "",
        "last_name": agentInfo["Last Name"] || "",
        "display_name": `${agentInfo["First Name"] || ''} ${agentInfo["Last Name"] || ''}`.trim(),
        "email": agentInfo["Email"],
        "company_name": agentInfo["Company Name"]
      },
      "plan": {
        "plan_code": planID
      },
      "addons": [],
      "custom_fields": [{
        "label": "cf_agent_id",
        "value": agentInfo["Agent ID"]
      }, {
        "label": "cf_dealer_id",
        "value": agentInfo["Dealer ID"]
      }],
      "redirect_url": process.env.SUCCESS_REDIRECT_URL,
    })
    };

    const response = await fetch(`${ZOHO_BILLING_API_URL}/hostedpages/newsubscription`, options);
    const data = await response.json();
    console.log('Zoho API response:', JSON.stringify(data, null, 2));
  
  if (!response.ok) {
    console.error('Zoho API error:', {
      status: response.status,
      statusText: response.statusText,
      data
    });
    throw new Error(`Zoho API error: ${response.status} - ${response.statusText}`);
  }

  if (!data.hostedpage?.url) {
    console.error('No payment link URL in response:', data);
    return null;
  }

  return data.hostedpage.url;
}

module.exports = { createZohoPaymentLink };
