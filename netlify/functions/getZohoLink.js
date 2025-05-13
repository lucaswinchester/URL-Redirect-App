const fetch = require("node-fetch");
const { getZohoAccessToken } = require("./zohoAuth");

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = "https://www.zohoapis.com/billing/v1";

async function createZohoPaymentLink(planID, agentInfo) {
  const accessToken = await getZohoAccessToken();
  
  // If we have a customer_id, we don't need to send customer details
  if (agentInfo.customer_id) {
    const requestBody = {
      customer_id: agentInfo.customer_id,
      plan: {
        plan_code: planID
      },
      addons: [],
      custom_fields: [
        {
          label: "Agent ID#",
          value: agentInfo["Agent ID"] || ''
        },
        {
          label: "Dealer ID#",
          value: agentInfo["Dealer ID"] || ''
        }
      ],
      redirect_url: process.env.SUCCESS_REDIRECT_URL,
    };
    
    console.log('Using existing customer with ID:', agentInfo.customer_id);
    return makeZohoApiCall(requestBody, accessToken);
  }
  
  // For new customers, prepare all the customer details
  const billingAddress = agentInfo.billing_address ? {
    attention: agentInfo.billing_address.attention || '',
    street: agentInfo.billing_address.street || '',
    city: agentInfo.billing_address.city || '',
    state: agentInfo.billing_address.state || '',
    zip: agentInfo.billing_address.zip || '',
    country: agentInfo.billing_address.country || 'US',
    fax: agentInfo.billing_address.fax || ''
  } : null;

  const shippingAddress = agentInfo.shipping_address ? {
    attention: agentInfo.shipping_address.attention || '',
    street: agentInfo.shipping_address.street || '',
    city: agentInfo.shipping_address.city || '',
    state: agentInfo.shipping_address.state || '',
    zip: agentInfo.shipping_address.zip || '',
    country: agentInfo.shipping_address.country || 'US',
    fax: agentInfo.shipping_address.fax || ''
  } : billingAddress;
  
  const requestBody = {
    customer: {
      first_name: agentInfo["First Name"] || "",
      last_name: agentInfo["Last Name"] || "",
      display_name: `${agentInfo["First Name"] || ''} ${agentInfo["Last Name"] || ''}`.trim(),
      email: agentInfo["Email"],
      company_name: agentInfo["Company Name"] || '',
      billing_address: billingAddress,
      shipping_address: shippingAddress
    },
    plan: {
      plan_code: planID
    },
    addons: [ 
      { addon_code: 'RGN-MEMFEE' },
      { addon_code: 'RGN-RAFEE' }
     ],
    custom_fields: [
      {
        label: "Agent ID#",
        value: agentInfo["Agent ID"] || ''
      },
      {
        label: "Dealer ID#",
        value: agentInfo["Dealer ID"] || ''
      }
    ],
    redirect_url: process.env.SUCCESS_REDIRECT_URL,
  };
  
  return makeZohoApiCall(requestBody, accessToken);
}

async function makeZohoApiCall(requestBody, accessToken) {
  console.log('Sending to Zoho:', JSON.stringify(requestBody, null, 2));
  
  const options = {
    method: 'POST',
    headers: {
      'x-com-zoho-subscriptions-organizationid': ZOHO_ORGANIZATION_ID,
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
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
