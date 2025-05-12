const fetch = require("node-fetch");
const { getZohoAccessToken } = require("./zohoAuth");

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = "https://www.zohoapis.com/billing/v1";

async function createZohoPaymentLink(planID, agentInfo) {
  const accessToken = await getZohoAccessToken();
  
  const payload = {
    "customer": {
      "first_name": agentInfo["First Name"] || "",
      "last_name": agentInfo["Last Name"] || "",
      "display_name": `${agentInfo["First Name"] || ''} ${agentInfo["Last Name"] || ''}`.trim(),
      "email": agentInfo["Email"],
      "company_name": agentInfo["Company Name"]
    },
    "plan": {
      "plan_code": planID
    }
  };

  console.log('Creating payment link with payload:', JSON.stringify(payload, null, 2));
  
  const response = await fetch(`${ZOHO_BILLING_API_URL}/hostedpages/newsubscription`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'JSONString': JSON.stringify({
        'organization_id': ZOHO_ORGANIZATION_ID,
        ...payload
      })
    }).toString()
  });

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

  if (!data.payment_link?.payment_link_url) {
    console.error('No payment link URL in response:', data);
    return null;
  }

  return data.payment_link.payment_link_url;
}

module.exports = { createZohoPaymentLink };
