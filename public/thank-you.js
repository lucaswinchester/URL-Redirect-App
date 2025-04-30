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

// Show invoice in modal
async function showInvoice(invoiceId) {
  invoiceContent.innerHTML = "Loading invoice...";
  try {
    const invoiceData = await fetchInvoice(invoiceId);
    // Render invoice details as HTML (customize as needed)
    invoiceContent.innerHTML = `
      <h3>Invoice #${invoiceData.invoice.invoice_number}</h3>
      <p>Date: ${invoiceData.invoice.date}</p>
      <p>Amount: ${invoiceData.invoice.total}</p>
      <pre>${JSON.stringify(invoiceData, null, 2)}</pre>
    `;
  } catch (err) {
    invoiceContent.innerHTML = "Failed to load invoice.";
    console.error(err);
  }
  invoiceModal.style.display = 'flex';
}

// Button and modal logic
if (invoiceId) {
  viewInvoiceBtn.style.display = 'inline-block';
  viewInvoiceBtn.addEventListener('click', () => showInvoice(invoiceId));
}

closeModalBtn.addEventListener('click', () => {
  invoiceModal.style.display = 'none';
  invoiceContent.innerHTML = '';
});

invoiceModal.addEventListener('click', (e) => {
  if (e.target === invoiceModal) {
    invoiceModal.style.display = 'none';
    invoiceContent.innerHTML = '';
  }
});

// Run on page load
recordSale();