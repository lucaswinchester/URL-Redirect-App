// thank-you.js

import { fetchInvoice } from './fetchInvoice.js';

// Supabase setup
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_PUBLIC_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('invoice_id');
const subscriptionId = params.get('subscription_id');
const email = params.get('email'); // If you pass email in the redirect URL

// Elements
const viewInvoiceBtn = document.getElementById('view-invoice-btn');
const invoiceModal = document.getElementById('invoice-modal');
const invoiceContent = document.getElementById('invoice-content');
const closeModalBtn = document.getElementById('close-modal');
const statusEl = document.getElementById('status');

// Insert into sales table, avoiding duplicates
async function recordSale() {
  if (!invoiceId) {
    statusEl.textContent = "Missing invoice reference. Please contact support.";
    return;
  }

  // Check for existing sale with this invoice_id
  const { data: existingSales, error: lookupError } = await supabase
    .from('sales')
    .select('id')
    .eq('invoice_id', invoiceId)
    .limit(1);

  if (lookupError) {
    statusEl.textContent = "Error checking for existing sale. Please contact support.";
    console.error(lookupError);
    return;
  }

  if (existingSales && existingSales.length > 0) {
    statusEl.textContent = "Your order has already been recorded. Thank you!";
    return;
  }

  // Insert into sales table
  const { data, error } = await supabase
    .from('sales')
    .insert([
      {
        invoice_id: invoiceId,
        subscription_id: subscriptionId || null,
        email: email || null,
      }
    ]);

  if (error) {
    statusEl.textContent = "There was an error recording your sale. Please contact support.";
    console.error(error);
  } else {
    statusEl.textContent = "Your order has been recorded. Thank you!";
  }
}

// Update the showInvoice function
async function showInvoice(invoiceId) {
  const button = document.getElementById('view-invoice-btn');
  const originalText = button.textContent;
  button.textContent = 'Loading...';
  button.disabled = true;
  
  try {
    const invoiceData = await fetchInvoice(invoiceId);
    
    if (invoiceData.code === 0) {
      const invoice = invoiceData.invoice;
      
      // Update header information
      document.getElementById('invoice-number').textContent = invoice.number;
      document.getElementById('invoice-date').textContent = invoice.invoice_date;
      document.getElementById('invoice-due-date').textContent = invoice.due_date;
      document.getElementById('customer-name').textContent = invoice.customer_name;
      document.getElementById('invoice-status').textContent = invoice.status.toUpperCase();
      
      // Format currency
      const formatCurrency = (amount) => `${invoice.currency_symbol}${amount.toFixed(2)}`;
      
      // Clear existing items
      const itemsBody = document.getElementById('invoice-items-body');
      itemsBody.innerHTML = '';
      
      // Add invoice items
      invoice.invoice_items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.item_total)}</td>
        `;
        itemsBody.appendChild(row);
      });
      
      // Calculate and display totals
      const subtotal = invoice.invoice_items.reduce((sum, item) => sum + item.item_total, 0);
      const totalTax = invoice.invoice_items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
      
      document.getElementById('subtotal').textContent = formatCurrency(subtotal);
      document.getElementById('tax').textContent = formatCurrency(totalTax);
      document.getElementById('total-amount').textContent = formatCurrency(invoice.total);
      
      // Update payment information
      document.getElementById('payment-status').textContent = invoice.status === 'paid' ? 'Paid' : 'Pending';
      if (invoice.payments && invoice.payments.length > 0) {
        document.getElementById('payment-date').textContent = invoice.payments[0].date;
        document.getElementById('customer-name').textContent = invoice.customer_name;
        document.getElementById('invoice-status').textContent = invoice.status.toUpperCase();
        
        // Format currency
        const formatCurrency = (amount) => `${invoice.currency_symbol}${amount.toFixed(2)}`;
        
        // Clear existing items
        const itemsBody = document.getElementById('invoice-items-body');
        itemsBody.innerHTML = '';
        
        // Add invoice items
        invoice.invoice_items.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>
              <div class="item-name">
                ${item.name}
                ${item.sku ? `<span class="sku">SKU: ${item.sku}</span>` : ''}
              </div>
            </td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.item_total)}</td>
          `;
          itemsBody.appendChild(row);
        });
        
        // Calculate and display totals
        const subtotal = invoice.invoice_items.reduce((sum, item) => sum + item.item_total, 0);
        const totalTax = invoice.invoice_items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
        
      }
      
      // Show modal
      document.getElementById('invoice-modal').style.display = 'flex';
    } else {
      statusEl.textContent = "Failed to fetch invoice details. Please try again.";
    }
  } catch (error) {
    console.error('Error:', error);
    statusEl.textContent = "Error fetching invoice. Please try again.";
  } finally {
    // Always restore button state
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Button and modal logic
if (invoiceId) {
  viewInvoiceBtn.style.display = 'inline-block';
  viewInvoiceBtn.addEventListener('click', () => showInvoice(invoiceId));

const customerPortalBtn = document.getElementById('customer-portal-btn');
if (customerPortalBtn) {
  customerPortalBtn.addEventListener('click', () => {
    window.location.href = 'https://billing.revgennetworks.com/portal/revgennetworks/signup#/send-invite';
  });
}

  // Close modal when clicking the close button
  closeModalBtn.addEventListener('click', () => {
    invoiceModal.style.display = 'none';
    document.getElementById('invoice-pdf-container').innerHTML = '';
    document.getElementById('invoice-number').textContent = '-';
    document.getElementById('invoice-date').textContent = '-';
    document.getElementById('invoice-due-date').textContent = '-';
    document.getElementById('invoice-status').textContent = '-';
    document.getElementById('invoice-total').textContent = '-';
    document.getElementById('payment-status').textContent = '-';
  });

  // Close modal when clicking outside of modal content
  invoiceModal.addEventListener('click', (e) => {
    if (e.target === invoiceModal) {
      invoiceModal.style.display = 'none';
      document.getElementById('invoice-pdf-container').innerHTML = '';
      document.getElementById('invoice-number').textContent = '-';
      document.getElementById('invoice-date').textContent = '-';
      document.getElementById('invoice-due-date').textContent = '-';
      document.getElementById('invoice-status').textContent = '-';
      document.getElementById('invoice-total').textContent = '-';
      document.getElementById('payment-status').textContent = '-';
    }
  });
}

// Run on page load
recordSale();