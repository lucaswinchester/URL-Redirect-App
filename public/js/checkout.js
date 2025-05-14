// Global state
const state = {
    selectedCustomer: null,
    bundleId: null
};

console.log('Checkout script loaded');

// DOM Elements
const elements = {
    form: document.getElementById('checkout-form'),
    searchBtn: document.getElementById('searchCustomerBtn'),
    emailInput: document.getElementById('existingEmail'),
    submitBtn: document.getElementById('submitBtn'),
    errorContainer: document.getElementById('errorContainer'),
    errorMessage: document.getElementById('errorMessage'),
    customerList: document.getElementById('customerList'),
    customerResults: document.getElementById('customerResults'),
    selectedCustomerSection: document.getElementById('selectedCustomer'),
    customerDetails: document.getElementById('customerDetails'),
    statusElement: document.getElementById('customerSearchStatus'),
    sameAsBilling: document.getElementById('sameAsBilling'),
    shippingAddressSection: document.getElementById('shippingAddressSection'),
    customerTypeRadios: document.querySelectorAll('input[name="customerType"]')
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    initialize();
});

// Initialize the checkout page
function initialize() {
    // Get bundle ID from URL
    const pathParts = window.location.pathname.split('/');
    state.bundleId = pathParts[pathParts.length - 1] || null;
    
    // Load bundle data if available
    if (state.bundleId) {
        loadBundleData(state.bundleId);
    }
    
    // Add event listeners
    setupEventListeners();
}

// Load bundle data from the server
async function loadBundleData(bundleId) {
    try {
        const response = await fetch(`/api/bundles/checkout/${bundleId}`);
        const data = await response.json();
        
        if (data.success && data.bundle) {
            updateBundleInfo(data.bundle);
        } else {
            showError('Failed to load bundle information');
        }
    } catch (error) {
        console.error('Error loading bundle data:', error);
        showError('Error loading bundle information');
    }
}

// Update the UI with bundle information
function updateBundleInfo(bundle) {
    const bundleInfo = document.getElementById('bundleInfo');
    if (bundleInfo && bundle) {
        bundleInfo.innerHTML = `
            <p><strong>Plan ID:</strong> ${bundle.plan_id || 'N/A'}</p>
            <p><strong>Addon ID:</strong> ${bundle.addon_id || 'N/A'}</p>
            <p><strong>Created:</strong> ${new Date(bundle.created_at).toLocaleDateString()}</p>
        `;
    }
}

// Show error or success message to the user
function showError(message, isSuccess = false) {
    if (!elements.errorContainer || !elements.errorMessage) return;
    
    if (!message) {
        elements.errorContainer.classList.add('hidden');
        return;
    }
    
    elements.errorMessage.textContent = message;
    elements.errorContainer.className = isSuccess ? 'success-message' : 'error-message';
    elements.errorContainer.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (isSuccess) {
        setTimeout(() => {
            if (elements.errorContainer && !elements.errorContainer.classList.contains('error-message')) {
                elements.errorContainer.classList.add('hidden');
            }
        }, 5000);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Form submission
    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmit);
    }
    
    // Customer type toggle
    if (elements.customerTypeRadios) {
        elements.customerTypeRadios.forEach(radio => {
            radio.addEventListener('change', toggleCustomerType);
        });
    }
    
    // Same as billing checkbox
    if (elements.sameAsBilling && elements.shippingAddressSection) {
        elements.sameAsBilling.addEventListener('change', toggleShippingAddress);
    }
    
    // Customer search
    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', searchCustomer);
    }
    
    // Allow Enter key in email field to trigger search
    if (elements.emailInput) {
        elements.emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchCustomer();
            }
        });
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Disable submit button to prevent double submission
    if (elements.submitBtn) {
        elements.submitBtn.disabled = true;
        elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    // Hide any previous error messages
    showError('');
    
    try {
        // Get form data
        const formData = new FormData(elements.form);
        const data = Object.fromEntries(formData.entries());
        
        // Add bundle ID if available
        if (state.bundleId) {
            data.bundle_id = state.bundleId;
        }
        
        // Convert sameAsBilling to boolean
        if (data.sameAsBilling) {
            data.sameAsBilling = data.sameAsBilling === 'on';
        }
        
        console.log('Submitting form data:', data);
        
        // Submit the form
        const response = await fetch('/.netlify/functions/getUrls/api/bundles/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to process your request');
        }
        
        if (result.success) {
            // Show success message
            showError(result.message || 'Order processed successfully!', true);
            
            // Reset form
            elements.form.reset();
            
            // Redirect to success page or payment URL if available
            if (result.paymentUrl) {
                // Wait a moment to show the success message before redirecting
                setTimeout(() => {
                    window.location.href = result.paymentUrl;
                }, 1500);
            } else if (result.order) {
                // Store order details in session storage for the success page
                sessionStorage.setItem('lastOrder', JSON.stringify(result.order));
                // Wait a moment to show the success message before redirecting
                setTimeout(() => {
                    window.location.href = '/success.html';
                }, 1500);
            }
        } else {
            throw new Error(result.error || 'An error occurred. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        
        // Show error message
        if (error.message.includes('Missing required fields') && error.missingFields) {
            showError(`Please fill in all required fields: ${error.missingFields.join(', ')}`);
        } else {
            showError(error.message || 'An error occurred. Please try again.');
        }
        
        // Scroll to error message
        if (elements.errorContainer) {
            elements.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } finally {
        // Re-enable submit button
        if (elements.submitBtn) {
            elements.submitBtn.disabled = false;
            elements.submitBtn.innerHTML = 'Continue to Checkout';
        }
    }
}

// Toggle between new and existing customer forms
function toggleCustomerType(e) {
    const customerType = e.target.value;
    const newCustomerForm = document.getElementById('newCustomerForm');
    const existingCustomerForm = document.getElementById('existingCustomerForm');
    
    if (customerType === 'new' && newCustomerForm && existingCustomerForm) {
        newCustomerForm.classList.remove('hidden');
        existingCustomerForm.classList.add('hidden');
    } else if (existingCustomerForm && newCustomerForm) {
        newCustomerForm.classList.add('hidden');
        existingCustomerForm.classList.remove('hidden');
    }
}

// Toggle shipping address fields
function toggleShippingAddress(e) {
    if (elements.shippingAddressSection) {
        elements.shippingAddressSection.style.display = e.target.checked ? 'none' : 'block';
    }
}

// Search for existing customer by email
async function searchCustomer() {
    const email = elements.emailInput?.value.trim();
    if (!email) {
        showError('Please enter an email address');
        return;
    }
    
    try {
        // Show loading state
        if (elements.statusElement) {
            elements.statusElement.textContent = 'Searching...';
            elements.statusElement.className = 'text-blue-600';
        }
        
        const response = await fetch(`/api/customers/search?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.customer) {
            state.selectedCustomer = data.customer;
            populateCustomerForm(data.customer);
        } else {
            showError('Customer not found. Please check the email or create a new account.');
        }
    } catch (error) {
        console.error('Error searching for customer:', error);
        showError('An error occurred while searching for the customer.');
    } finally {
        // Reset status
        if (elements.statusElement) {
            elements.statusElement.textContent = '';
        }
    }
}

// Populate form with customer data
function populateCustomerForm(customer) {
    if (!customer) return;
    
    // Update customer details section
    if (elements.customerDetails) {
        elements.customerDetails.innerHTML = `
            <p><strong>Name:</strong> ${customer.first_name || ''} ${customer.last_name || ''}</p>
            <p><strong>Email:</strong> ${customer.email || ''}</p>
            <p><strong>Phone:</strong> ${customer.phone || ''}</p>
        `;
    }
    
    // Show selected customer section
    if (elements.selectedCustomerSection) {
        elements.selectedCustomerSection.classList.remove('hidden');
    }
    
    // Hide customer search results
    if (elements.customerResults) {
        elements.customerResults.classList.add('hidden');
    }
}
