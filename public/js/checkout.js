// --- Address Card UI for Existing Customers ---
function createAddressCard(address, type, editable, customerId) {
const card = document.createElement('div');
card.className = 'address-card';
card.dataset.type = type;
const label = document.createElement('div');
label.className = 'address-label';
label.textContent =
    type === 'billing' ? 'Billing Address' : 'Shipping Address';
card.appendChild(label);

if (editable) {
    const form = document.createElement('form');
    form.className = 'address-form';
    form.innerHTML = `
        <div class="form-group">
            <label>Attention *</label>
            <input type="text" name="attention" required value="${
                address.attention || ''
            }" />
        </div>
        <div class="form-group">
            <label>Street *</label>
            <input type="text" name="street" required value="${address.street || ''}" />
        </div>
        <div class="form-row">
            <div class="form-group form-group-half">
                <label>City *</label>
                <input type="text" name="city" required value="${address.city || ''}" />
            </div>
            <div class="form-group form-group-half">
                <label>State *</label>
                <input type="text" name="state" required value="${address.state || ''}" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group form-group-half">
                <label>ZIP Code *</label>
                <input type="text" name="zip" required value="${address.zip || ''}" />
            </div>
            <div class="form-group form-group-half">
                <label>Country *</label>
                <select name="country" required>
                    <option value="U.S.A" ${
                        address.country === 'U.S.A' ? 'selected' : ''
                    }>United States</option>
                    <option value="CAN" ${
                        address.country === 'CAN' ? 'selected' : ''
                    }>Canada</option>
                    <option value="MEX" ${
                        address.country === 'MEX' ? 'selected' : ''
                    }>Mexico</option>
                    <option value="Other" ${
                        address.country === 'Other' ? 'selected' : ''
                    }>Other</option>
                </select>
            </div>
        </div>
        <div class="address-actions">
            <button type="submit" class="btn">Save</button>
            <button type="button" class="btn secondary cancel-edit-btn">Cancel</button>
        </div>
    `;
    card.appendChild(form);
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const updatedAddress = {
            attention: formData.get('attention'),
            street: formData.get('street'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip: formData.get('zip'),
            country: formData.get('country'),
        };
        try {
            await updateCustomerAddress(customerId, updatedAddress, type);
            const updatedCustomer = await getCustomerById(customerId);
            selectCustomer(updatedCustomer);
        } catch (err) {
            alert('Failed to update address: ' + (err.message || err));
        }
    });
    form
        .querySelector('.cancel-edit-btn')
        .addEventListener('click', function () {
            renderAddressCards(window.selectedCustomer);
        });
} else {
    if (
        address &&
        (address.street || address.city || address.state || address.zip)
    ) {
        card.innerHTML += `
            <div>
                <div>${address.attention || ''}</div>
                <div>${address.street || ''}</div>
                <div>${address.city || ''}, ${address.state || ''} ${address.zip || ''}</div>
                <div>${address.country || ''}</div>
            </div>
        `;
    } else {
        card.innerHTML += `<div class="address-empty">No ${type} address on file.</div>`;
    }
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'edit-btn';
    editBtn.title = 'Edit Address';
    editBtn.innerHTML =
        '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
    editBtn.addEventListener('click', function () {
        renderAddressCards(window.selectedCustomer, type);
    });
    card.appendChild(editBtn);
}
return card;
}

function renderAddressCards(customer, editType = null) {
const addressCards = document.getElementById('addressCards');
addressCards.innerHTML = '';
const customerId = customer.customer_id || customer.id;
let billing = null,
    shipping = null;
if (customer.addresses && Array.isArray(customer.addresses)) {
    billing = customer.addresses.find((a) => a.type === 'billing') || {};
    shipping =
        customer.addresses.find((a) => a.type === 'shipping') || {};
}
addressCards.appendChild(
    createAddressCard(
        billing,
        'billing',
        editType === 'billing',
        customerId
    )
);
addressCards.appendChild(
    createAddressCard(
        shipping,
        'shipping',
        editType === 'shipping',
        customerId
    )
);
}

async function getCustomerById(customerId) {
const response = await fetch('/api/getCustomer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId }),
});
const data = await response.json();
if (!response.ok)
    throw new Error(data.error || 'Failed to fetch customer');
return data.customers ? data.customers[0] : data;
}

async function updateCustomerAddress(
customerId,
addressData,
addressType
) {
const requestBody = {
    customerId,
    address: { ...addressData, type: addressType },
};
const response = await fetch('/api/updateCustomer', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
});
const result = await response.json();
if (!response.ok) {
    const errorMsg =
        result.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMsg);
}
return result;
}

// --- Customer search and selection logic ---
document
.getElementById('searchCustomerBtn')
.addEventListener('click', searchCustomer);
document
.getElementById('existingEmail')
.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchCustomer();
    }
});

function showStatus(message, type = 'info') {
const statusElement = document.getElementById('customerSearchStatus');
statusElement.textContent = message;
statusElement.style.display = 'block';
statusElement.style.color =
    type === 'error'
        ? '#ff4d4f'
        : type === 'success'
        ? '#52c41a'
        : type === 'warning'
        ? '#faad14'
        : '#1890ff';
}

function createCustomerButton(customer) {
const button = document.createElement('button');
button.type = 'button';
button.className = 'customer-btn';
button.style.cssText = `
    text-align: left;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    background: rgba(201, 9, 23, 0.05);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.2);
`;
const displayName =
    customer.display_name ||
    `${customer.first_name || ''} ${customer.last_name || ''}`.trim() ||
    'No name available';
button.innerHTML = `
    <div style="font-weight: 600;">${displayName}</div>
    <div style="font-size: 0.9em; color: #666;">${customer.email}</div>
`;
button.addEventListener('click', () => {
    document.querySelectorAll('.customer-btn').forEach((btn) => {
        btn.style.borderColor = 'var(--border-color)';
        btn.style.backgroundColor = 'rgba(201, 9, 23, 0.05)';
        btn.style.boxShadow = '0 0 0 1px rgba(24, 144, 255, 0.2)';
    });
    button.style.borderColor = '#c90917';
    button.style.backgroundColor = 'rgba(201, 9, 23, 0.05)';
    button.style.boxShadow = '0 0 0 1px rgba(201, 9, 23, 0.5)';
    selectCustomer(customer);
});
return button;
}

async function searchCustomer() {
const email = document.getElementById('existingEmail').value.trim();
const statusElement = document.getElementById('customerSearchStatus');
const customerResults = document.getElementById('customerResults');
const selectedCustomerSection =
    document.getElementById('selectedCustomer');
customerResults.style.display = 'none';
selectedCustomerSection.style.display = 'none';
document.getElementById('customerList').innerHTML = '';
const submitBtn = document.getElementById('submitBtn');
submitBtn.disabled = true;
submitBtn.style.opacity = '0.7';
submitBtn.style.cursor = 'not-allowed';
if (!email) {
    showStatus('Please enter an email address', 'error');
    return;
}
try {
    showStatus('Searching for customers...', 'info');
    const response = await fetch('/api/getCustomer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok)
        throw new Error(data.error || 'Failed to search for customers');
    if (data.customers && data.customers.length > 0) {
        showStatus(`Found ${data.customers.length} customer(s)`, 'success');
        const customerList = document.getElementById('customerList');
        data.customers.forEach((customer) => {
            customerList.appendChild(createCustomerButton(customer));
        });
        customerResults.style.display = 'block';
    } else {
        showStatus('No customers found with this email', 'warning');
    }
} catch (error) {
    showStatus(error.message || 'Error searching for customers', 'error');
}
}

function selectCustomer(customer) {
    window.selectedCustomerId = customer.id;
    window.selectedCustomer = customer;
    
    // Get the status element and ensure it's visible
    const statusElement = document.getElementById('customerSearchStatus');
    statusElement.textContent = `Selected: ${customer.display_name || customer.email}`;
    statusElement.style.display = 'block';
    statusElement.className = 'success';
    
    // Get the serial number section and input
    const serialNumberSection = document.getElementById('serialNumberSection');
    const serialNumberInput = document.getElementById('serialNumber');
    
    // Ensure the section is visible and required
    serialNumberSection.style.display = 'block';
    serialNumberSection.style.visibility = 'visible';
    serialNumberSection.style.opacity = '1';
    serialNumberSection.style.height = 'auto';
    serialNumberSection.style.overflow = 'visible';
    
    // Make the field required and clear any previous value
    serialNumberInput.required = true;
    serialNumberInput.value = ''; // Clear any previous value
    
    // Force a reflow to ensure styles are applied
    void serialNumberSection.offsetHeight;
    
    // Show the selected customer's details
    const customerDetails = document.createElement('div');
    customerDetails.className = 'customer-details';
    customerDetails.innerHTML = `
        <div><strong>Name:</strong> ${customer.display_name || 'N/A'}</div>
        <div><strong>Email:</strong> ${customer.email || 'N/A'}</div>
        <div><strong>Company:</strong> ${customer.company_name || 'N/A'}</div>
    `;
    
    // Remove any existing details
    const existingDetails = statusElement.querySelector('.customer-details');
    if (existingDetails) {
        statusElement.removeChild(existingDetails);
    }
    
    statusElement.appendChild(customerDetails);
    
    // Focus the serial number field
    setTimeout(() => {
        serialNumberInput.focus();
    }, 100);

renderAddressCards(customer);
const submitBtn = document.getElementById('submitBtn');
submitBtn.disabled = false;
submitBtn.style.opacity = '1';
submitBtn.style.cursor = 'pointer';
}

// --- New customer shipping/billing copy logic ---
function copyBillingToShipping() {
if (document.getElementById('sameAsBilling').checked) {
    const billingFields = [
        'Attention',
        'Street',
        'City',
        'State',
        'Zip',
        'Country',
    ];
    billingFields.forEach((field) => {
        const billingValue = document.getElementById(
            `newBilling${field}`
        ).value;
        document.getElementById(`newShipping${field}`).value = billingValue;
    });
}
}
document
.getElementById('sameAsBilling')
.addEventListener('change', function () {
    const shippingSection = document.getElementById(
        'shippingAddressSection'
    );
    shippingSection.style.display = this.checked ? 'none' : 'block';
});
document
.getElementById('firstName')
.addEventListener('input', updateBillingAttention);
document
.getElementById('lastName')
.addEventListener('input', updateBillingAttention);
function updateBillingAttention() {
const firstName = document.getElementById('firstName').value;
const lastName = document.getElementById('lastName').value;
const fullName = `${firstName} ${lastName}`.trim();
document.getElementById('newBillingAttention').value = fullName;
if (document.getElementById('sameAsBilling').checked) {
    document.getElementById('newShippingAttention').value = fullName;
}
}
document
.querySelectorAll('input[name="customerType"]')
.forEach((radio) => {
    radio.addEventListener('change', function () {
        const isExisting = radio.value === 'existing';
        document.getElementById('newCustomerForm').classList.toggle('hidden', isExisting);
        document.getElementById('existingCustomerForm').classList.toggle('hidden', !isExisting);
        
        // Reset form state
        document.getElementById('submitBtn').disabled = true;
        window.selectedCustomerId = null;
        window.selectedCustomer = null;
        
        // Reset serial number field
        document.getElementById('existingSerialNumber').value = '';
        document.getElementById('existingSerialNumber').required = isExisting;
        document.getElementById('existingSerialNumberGroup').style.display = 'none';
    });
});

function validateForm() {
    const customerType = document.querySelector(
        'input[name="customerType"]:checked'
    )?.value;
    const submitBtn = document.getElementById('submitBtn');
    const serialNumberInput = document.getElementById('serialNumber');
    const serialNumber = serialNumberInput.value.trim();
    
    // Reset validation states
    serialNumberInput.classList.remove('is-invalid');
    
    // Check serial number
    if (!serialNumber) {
        serialNumberInput.classList.add('is-invalid');
        serialNumberInput.focus();
        return false;
    }

    if (customerType === 'existing') {
        const isCustomerSelected = !!window.selectedCustomerId;
        
        if (!isCustomerSelected) {
            showStatus('Please select a customer', 'error');
            return false;
        }
        
        submitBtn.disabled = !isCustomerSelected;
        submitBtn.style.opacity = isCustomerSelected ? '1' : '0.7';
        submitBtn.style.cursor = isCustomerSelected ? 'pointer' : 'not-allowed';
        return isCustomerSelected;
    }
    
    // For new customers, validate all required fields
    const requiredFields = [
        'firstName',
        'lastName',
        'email',
        'newBillingStreet',
        'newBillingCity',
        'newBillingState',
        'newBillingZip',
        'newBillingCountry',
        'serialNumber'
    ];
    
    let isFormValid = true;
    requiredFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element && !element.value.trim()) {
            isFormValid = false;
            element.classList.add('is-invalid');
        } else if (element) {
            element.classList.remove('is-invalid');
        }
    });
    
    if (!document.getElementById('sameAsBilling').checked) {
        const shippingFields = [
            'newShippingStreet',
            'newShippingCity',
            'newShippingState',
            'newShippingZip',
            'newShippingCountry',
        ];
        
        shippingFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element && !element.value.trim()) {
                isFormValid = false;
                element.classList.add('is-invalid');
            } else if (element) {
                element.classList.remove('is-invalid');
            }
        });
    }
    
    submitBtn.disabled = !isFormValid;
    submitBtn.style.opacity = isFormValid ? '1' : '0.7';
    submitBtn.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
    
    return isFormValid;
}
[
'firstName',
'lastName',
'email',
'companyName',
'newBillingStreet',
'newBillingCity',
'newBillingState',
'newBillingZip',
'newBillingCountry',
'newShippingStreet',
'newShippingCity',
'newShippingState',
'newShippingZip',
'newShippingCountry',
].forEach((fieldId) => {
const element = document.getElementById(fieldId);
if (element) element.addEventListener('input', validateForm);
});
document
.querySelectorAll('input[name="customerType"]')
.forEach((radio) => {
    radio.addEventListener('change', validateForm);
});

document
.getElementById('submitBtn')
.addEventListener('click', async (e) => {
    try {
        e.preventDefault();
        
        // Clear any existing error messages
        document.getElementById('errorContainer').classList.add('hidden');
        
        // Validate form before proceeding
        if (!validateForm()) {
            return;
        }
        
        const customerType = document.querySelector(
            'input[name="customerType"]:checked'
        ).value;
        let payload = {};
        if (customerType === 'new') {
            const billingAddress = {
                attention: document.getElementById('newBillingAttention').value,
                street: document.getElementById('newBillingStreet').value,
                city: document.getElementById('newBillingCity').value,
                state: document.getElementById('newBillingState').value,
                zip: document.getElementById('newBillingZip').value,
                country: document.getElementById('newBillingCountry').value,
            };
            let shippingAddress;
            if (document.getElementById('sameAsBilling').checked) {
                shippingAddress = { ...billingAddress };
            } else {
                shippingAddress = {
                    attention: document.getElementById('newShippingAttention')
                        .value,
                    street: document.getElementById('newShippingStreet').value,
                    city: document.getElementById('newShippingCity').value,
                    state: document.getElementById('newShippingState').value,
                    zip: document.getElementById('newShippingZip').value,
                    country: document.getElementById('newShippingCountry').value,
                };
            }
            // Get the serial number from the form
            const serialNumber = document.getElementById('serialNumber').value.trim();
            if (!serialNumber) {
                throw new Error('Serial number is required');
            }
            
            payload.customerData = {
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                company_name: document.getElementById('companyName').value,
                serial_number: serialNumber, // Include in customer data
                display_name: `${document.getElementById('firstName').value} ${
                    document.getElementById('lastName').value
                }`.trim(),
                billing_address: billingAddress,
                shipping_address: shippingAddress,
                cf_serial_number: serialNumber, // Add as custom field for Zoho
                custom_fields: [
                    {
                        label: 'Serial Number',
                        field_name: 'cf_serial_number',
                        value: serialNumber
                    }
                ]
            };
            
            // Add serial number to the payload root for easier access in the backend
            payload.serial_number = serialNumber;
        } else if (customerType === 'existing') {
            if (!window.selectedCustomerId) {
                alert('Please select a customer.');
                return;
            }
            
            // Get the serial number from the form
            const serialNumber = document.getElementById('serialNumber').value.trim();
            if (!serialNumber) {
                alert('Please enter the device serial number.');
                document.getElementById('serialNumber').focus();
                return;
            }
            
            payload.customer_id = window.selectedCustomerId;
            payload.serial_number = serialNumber;
            
            // Include serial number in customer data for Zoho
            payload.customerData = {
                ...window.selectedCustomer,
                serial_number: serialNumber,
                cf_serial_number: serialNumber,
                custom_fields: [
                    {
                        label: 'Serial Number',
                        field_name: 'cf_serial_number',
                        value: serialNumber
                    }
                ]
            };
        }
        const pathSegments = window.location.pathname
            .split('/')
            .filter(Boolean);

        const short_code = pathSegments[pathSegments.length - 1];

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        console.log('Submitting payload:', payload);

        const response = await fetch(
            `/api/getUrls/checkout/${short_code}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process payment');
        }
        const result = await response.json();

        const url = new URL(result.hostedPageUrl);
        const urlParams = new URLSearchParams(url.search);
        const urlOrigin = url.origin + url.pathname;

        payload.cf_agent_id = urlParams.get('cf_agent_id') || '';
        payload.cf_dealer_id = urlParams.get('cf_dealer_id') || '';
        payload.source = urlParams.get('source') || 'Amazon';
        payload.serial_number = document.getElementById('serialNumber').value;

        if (result.hostedPageUrl) {
            // --- Log event to Netlify function ---
            const logPayload = {
                plan_id: result.plan_id || '', // or get from your payload if not in result
                checkout_url: urlOrigin,
                cf_agent_id: payload.cf_agent_id || '',
                cf_dealer_id: payload.cf_dealer_id || '',
                cf_dealer_name: urlParams.get('cf_dealer_name') || '',
                cf_distributor_name: urlParams.get('cf_distributor_name') || '',
                cf_distributor_id: urlParams.get('cf_distributor_id') || '',
                cf_dealer_email: urlParams.get('cf_dealer_email') || '',
                source: payload.source || '',
                event_type: 'checkout',
            };

            console.log('Logging event:', logPayload);

            // Fire and forget (don't block redirect)
            fetch('/api/logEvent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logPayload),
            }).catch((err) => {
                // Optionally log error, but don't block user
                console.error('Failed to log event:', err);
            });

            window.location.href = result.hostedPageUrl;
        } else {
            throw new Error('No hosted page URL received');
        }
    } catch (error) {
        document
            .getElementById('errorContainer')
            .classList.remove('hidden');
        document.getElementById('errorMessage').textContent = `Error: ${
            error.message || 'Failed to process payment. Please try again.'
        }`;
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Order';
    }
});

(function () {
    const body = document.body;
    const btn = document.getElementById("theme-toggle");
    const THEME_KEY = "theme";
  
    // 1)  Restore saved preference
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light") body.classList.remove("dark-theme");
  
    // 2)  Toggle on click
    btn.addEventListener("click", () => {
      body.classList.toggle("dark-theme");
      const mode = body.classList.contains("dark-theme") ? "dark" : "light";
      localStorage.setItem(THEME_KEY, mode);
    });
  })();