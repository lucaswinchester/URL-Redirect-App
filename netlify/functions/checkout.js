const { createZohoPaymentLink } = require('./getZohoLink');
const supabase = require('./supabaseClient');

exports.handler = async (event) => {
  try {
    // Extract the ID from the URL
    const id = event.path.split('/').pop();

    console.log('ID: ', id);
    
    // Look up the bundle in Supabase
    const { data, error } = await supabase
      .from('bundles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.log(error)
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Checkout session not found' })
      };
    }

    // Prepare customer info
    const customerInfo = data.customer_info ? JSON.parse(data.customer_info) : {};
    
    // Add agent info to customer info
    const agentInfo = {
      'Agent ID': data.cf_agent_id,
      'Dealer ID': data.cf_dealer_id,
      'Email': customerInfo.Email || data.cf_dealer_email,
      'First Name': customerInfo['First Name'],
      'Last Name': customerInfo['Last Name'],
      'Company Name': customerInfo['Company Name'] || data.cf_dealer_name,
      'Distributor Name': data.cf_distributor_name,
      'Distributor ID': data.cf_distributor_id,
      billing_address: customerInfo.billing_address,
      shipping_address: customerInfo.shipping_address,
      customer_id: data.customer_id
    };

    // Generate the payment URL
    const checkoutUrl = await createZohoPaymentLink(data.plan_id, agentInfo);

    if (!checkoutUrl) {
      throw new Error('Failed to generate payment URL');
    }

    // Redirect to the payment URL
    return {
      statusCode: 302,
      headers: {
        'Cache-Control': 'no-cache',
        'Location': checkoutUrl
      }
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
