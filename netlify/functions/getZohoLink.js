const fetch = require("node-fetch");
const { getZohoAccessToken } = require("./zohoAuth");

const ZOHO_ORGANIZATION_ID = process.env.ZOHO_ORGANIZATION_ID;
const ZOHO_BILLING_API_URL = "https://www.zohoapis.com/billing/v1";

async function createZohoPaymentLink(planData, agentInfo) {
  const accessToken = await getZohoAccessToken();

  console.log('Agent Info:', agentInfo);
  
  // Extract serial number from agentInfo
  const serialNumber = agentInfo.serial_number || '';
  console.log('Serial Number received:', serialNumber);

  // Extract plan and addons from planData
  const { plan_id, addons = [] } = planData;

  // Prepare custom fields (for both new and existing customers)
  const customFields = [
    // Serial number field (from the form)
    {
      label: "cf_serial_number",
      field_name: "cf_serial_number",
      value: serialNumber || '',
      is_mandatory: true,
      required: true,
      section: "customer_information",
      section_position: 999
    },
    // Agent and dealer information
    agentInfo['Agent ID'] && {
      label: "cf_agent_id",
      value: agentInfo['Agent ID'].toString()
    },
    agentInfo['Dealer ID'] && {
      label: "cf_dealer_id",
      value: agentInfo['Dealer ID'].toString()
    },
    agentInfo.cf_dealer_id && {
      label: "cf_dealer_id",
      value: agentInfo.cf_dealer_id.toString()
    },
    agentInfo.cf_dealer_name && {
      label: "cf_dealer_name",
      value: agentInfo.cf_dealer_name.toString()
    },
    agentInfo['Company Name'] && {
      label: "cf_dealer_name",
      value: agentInfo['Company Name'].toString()
    },
    agentInfo['Distributor Name'] && {
      label: "cf_distributor_name",
      value: agentInfo['Distributor Name'].toString()
    },
    agentInfo.cf_distributor_name && {
      label: "cf_distributor_name",
      value: agentInfo.cf_distributor_name.toString()
    },
    agentInfo['Distributor ID'] && {
      label: "cf_distributor_id",
      value: agentInfo['Distributor ID'].toString()
    },
    agentInfo.cf_distributor_id && {
      label: "cf_distributor_id",
      value: agentInfo.cf_distributor_id.toString()
    },
    agentInfo.cf_dealer_email && {
      label: "cf_dealer_email",
      value: agentInfo.cf_dealer_email.toString()
    },
    agentInfo.cf_source_url && {
      label: "cf_source_url",
      value: agentInfo.cf_source_url.toString()
    }
  ].filter(Boolean);

  let requestBody;

  console.log('Customer ID:', agentInfo.customer_id);

  if (agentInfo.customer_id) {
    // --- EXISTING CUSTOMER ---
    requestBody = {
      customer_id: agentInfo.customer_id,
      plan: {
        plan_code: plan_id,
        ...(planData.plan_name && { name: planData.plan_name }),
        ...(planData.plan_price && { price: planData.plan_price }),
        item_custom_fields: customFields
      },
      addons: Array.isArray(addons) ? addons : [],
      custom_fields: [
        {
          label: "Agent ID#",
          value: agentInfo["Agent ID"] || agentInfo.agent_id || ''
        },
        {
          label: "Dealer ID#",
          value: agentInfo["Dealer ID"] || agentInfo.dealer_id || ''
        },
        {
          label: "Serial Number",
          field_name: "cf_serial_number",
          value: serialNumber,
          is_mandatory: true,
          required: true,
          section: "customer_information",
          section_position: 999
        }
      ],
      hostedpage_settings_id: "1826627000284042844",
      source: "Amazon",
      redirect_url: process.env.SUCCESS_REDIRECT_URL,
    };

    // Debug logs
    console.log('Using existing customer with ID:', agentInfo.customer_id);
    console.log('Final request body for Zoho (existing customer):', JSON.stringify(requestBody, null, 2));

    return makeZohoApiCall(requestBody, accessToken);
  }

  // --- NEW CUSTOMER ---
  // Prepare addresses
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

  // Get customer data from either the root level or customerData object
  const customerData = agentInfo.customerData || agentInfo;

  // Ensure we have at least a first or last name for display_name
  const firstName = customerData.first_name || customerData['First Name'] || '';
  const lastName = customerData.last_name || customerData['Last Name'] || '';
  const email = customerData.email || customerData['Email'] || '';
  const companyName = customerData.company_name || customerData['Company Name'] || '';

  // Create display name
  let displayName = customerData.display_name || `${firstName} ${lastName}`.trim();
  if (!displayName) {
    displayName = companyName || (email ? email.split('@')[0] : '') || 'Customer';
  }

  requestBody = {
    customer: {
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      email: email,
      company_name: companyName,
      billing_address: customerData.billing_address || billingAddress,
      shipping_address: customerData.shipping_address || shippingAddress
    },
    plan: {
      plan_code: plan_id,
      ...(planData.plan_name && { name: planData.plan_name }),
      ...(planData.plan_price && { price: planData.plan_price }),
      item_custom_fields: customFields
    },
    addons: Array.isArray(addons) ? addons : [],
    redirect_url: process.env.SUCCESS_REDIRECT_URL,
    source: "Amazon",
    hostedpage_settings_id: "1826627000284042844",
    custom_fields: [
      {
        label: "Serial Number",
        field_name: "cf_serial_number",
        value: serialNumber,
        is_mandatory: true,
        required: true,
        section: "customer_information",
        section_position: 999 // This will place it at the bottom of the customer information section
      }
    ]
  };

  // Debug logs
  console.log('Creating new customer with plan:', {
    plan_code: plan_id,
    addons: addons.length,
    has_addons: addons.length > 0
  });
  console.log('Processed customer data:', {
    firstName,
    lastName,
    email,
    companyName,
    displayName
  });
  console.log('Custom fields to be sent to Zoho:', JSON.stringify(customFields, null, 2));
  console.log('Complete request body for Zoho (new customer):', JSON.stringify(requestBody, null, 2));

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

  try {
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
      throw new Error('No hosted page URL in response');
    }

    // Instead of returning the URL directly, we'll proxy it through our server
    const hostedPageUrl = new URL(data.hostedpage.url);
    
    // Add serial number to the URL parameters if it exists
    if (requestBody.customer_id) {
      // For existing customers, get the serial number from custom_fields
      const serialField = requestBody.custom_fields.find(field => field.field_name === 'cf_serial_number');
      if (serialField && serialField.value) {
        hostedPageUrl.searchParams.set('cf_serial_number', serialField.value);
      }
    } else if (requestBody.customer) {
      // For new customers, get the serial number from the request body
      const serialField = requestBody.custom_fields.find(field => field.field_name === 'cf_serial_number');
      if (serialField && serialField.value) {
        hostedPageUrl.searchParams.set('cf_serial_number', serialField.value);
      }
    }
    
    return {
      success: true,
      hostedPageUrl: hostedPageUrl.toString(),
      message: 'Payment link created successfully'
    };
  } catch (error) {
    console.error('Error creating hosted page:', error);
    throw error;
  }
}

module.exports = { createZohoPaymentLink };
