const { getAgentDetails } = require("./airtableHelpers");
const { createZohoPaymentLink } = require("./getZohoLink");
const supabase = require("./supabaseClient");
const { v4: uuidv4 } = require('uuid');

const ADDONS = [];

async function handleCheckoutRequest(event, bundleId) {
    console.log('Handling checkout request for bundle:', bundleId);
    
    // If no bundle ID is provided, return success with null bundle
    if (!bundleId || bundleId === 'checkout') {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                bundle: null
            })
        };
    }
    
    try {
        // Verify the bundle exists
        const { data: bundle, error } = await supabase
            .from('bundles')
            .select('*')
            .eq('id', bundleId)
            .single();

        if (error || !bundle) {
            console.error('Bundle not found:', { bundleId, error });
            return {
                statusCode: 404,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Bundle not found' })
            };
        }
        
        // Return bundle data if exists
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: true,
                bundle: {
                    id: bundle.id,
                    plan_id: bundle.plan_id,
                    addon_id: bundle.addon_id,
                    created_at: bundle.created_at
                }
            })
        };
        
    } catch (error) {
        console.error('Error in handleCheckoutRequest:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

exports.handler = async (event, context) => {
    try {
        // Parse the URL to get the path
        const path = event.path.replace(/\.netlify\/functions\/[^/]+/, '');
        
        // Handle API endpoints
        if (path.startsWith('/api/bundles/checkout/')) {
            const bundleId = path.split('/').pop();
            return handleCheckoutRequest(event, bundleId);
        }
        
        // Handle legacy GET /checkout/:id requests
        if (event.httpMethod === 'GET' && path.includes('/checkout/')) {
            const id = path.split('/').pop();
            if (!id) {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Missing checkout ID' })
                };
            }
            return handleCheckoutRequest(event, id);
        }
        
        // Handle form submission
        if (event.httpMethod === 'POST') {
            try {
                console.log('Handling POST request with body:', event.body);
                const body = JSON.parse(event.body);
                
                // Validate required fields
                const requiredFields = [
                    'customerType',
                    'billingStreet',
                    'billingCity',
                    'billingState',
                    'billingZip',
                    'billingCountry'
                ];

                // Additional validation for new customers
                if (body.customerType === 'new') {
                    requiredFields.push('firstName', 'lastName', 'email');
                } else if (body.customerType === 'existing') {
                    requiredFields.push('existingEmail');
                }

                // Check shipping address if different from billing
                if (body.sameAsBilling === 'false' || body.sameAsBilling === false) {
                    requiredFields.push(
                        'shippingStreet',
                        'shippingCity',
                        'shippingState',
                        'shippingZip',
                        'shippingCountry'
                    );
                }

                const missingFields = requiredFields.filter(field => !body[field]);
                if (missingFields.length > 0) {
                    return {
                        statusCode: 400,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            success: false,
                            error: 'Missing required fields',
                            missingFields
                        })
                    };
                }

                // Prepare customer data
                const customerData = {
                    customerType: body.customerType,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    email: body.email || body.existingEmail,
                    phone: body.phone || '',
                    billingAddress: {
                        street: body.billingStreet,
                        city: body.billingCity,
                        state: body.billingState,
                        zip: body.billingZip,
                        country: body.billingCountry
                    },
                    shippingAddress: (body.sameAsBilling === 'true' || body.sameAsBilling === true) ? null : {
                        street: body.shippingStreet,
                        city: body.shippingCity,
                        state: body.shippingState,
                        zip: body.shippingZip,
                        country: body.shippingCountry
                    },
                    bundleId: body.bundle_id
                };

                // Here you would typically:
                // 1. Create/update customer in your database
                // 2. Create an order record
                // 3. Process payment
                // 4. Return success with order details or redirect URL

                console.log('Processed order:', customerData);
                
                // For now, just return success with the processed data
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: true,
                        message: 'Order processed successfully',
                        order: {
                            id: 'ORD-' + Date.now(),
                            customer: {
                                name: `${customerData.firstName} ${customerData.lastName}`,
                                email: customerData.email
                            },
                            status: 'pending_payment',
                            createdAt: new Date().toISOString()
                        },
                        // In a real implementation, you would return a payment URL or redirect
                        // paymentUrl: 'https://payment-gateway.com/checkout/...'
                    })
                };
            } catch (error) {
                console.error('Error processing order:', error);
                return {
                    statusCode: 500,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: 'Failed to process order',
                        message: error.message
                    })
                };
            }
        }
        
        // Return 404 for unknown routes
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Not found' })
        };
        
    } catch (error) {
        console.error('Error in handler:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                success: false,
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
