import { fetchInvoice } from './fetchInvoice.js';

// Get parameters from URL
const params = new URLSearchParams(window.location.search);
const invoiceId = params.get('invoice_id');

// Elements
const viewInvoiceBtn = document.getElementById('view-invoice-btn');
const invoiceModal = document.getElementById('invoice-modal');
const invoiceContent = document.getElementById('invoice-content');
const closeModalBtn = document.getElementById('close-modal');

// Show the button if invoiceId is present
if (invoiceId) {
  viewInvoiceBtn.style.display = 'inline-block';
  viewInvoiceBtn.addEventListener('click', () => showInvoice(invoiceId));
}

// Show invoice in modal
async function showInvoice(invoiceId) {
  invoiceModal.style.display = 'flex';
  
  try {
    const invoiceData = await fetchInvoice(invoiceId);
    const invoice = invoiceData.invoice;
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }

    // Update invoice header info
    document.getElementById('invoice-number').textContent = invoice.number || '-';
    document.getElementById('invoice-date').textContent = invoice.invoice_date || '-';
    document.getElementById('customer-name').textContent = invoice.customer_name || '-';
    document.getElementById('invoice-due-date').textContent = invoice.due_date || '-';

    // Update totals
    document.getElementById('payment-made').textContent = formatCurrency(invoice.payment_made) || '-';
    document.getElementById('balance-due').textContent = formatCurrency(invoice.balance) || '-';
    document.getElementById('total-amount').textContent = formatCurrency(invoice.total) || '-';

    // Update payment status
    document.getElementById('payment-status').textContent = invoice.status.toUpperCase() || '-';
    document.getElementById('payment-date').textContent = invoice.payments[0].date || '-';

    // Clear existing items and add new ones
    const itemsBody = document.getElementById('invoice-items-body');
    itemsBody.innerHTML = '';
    
    invoice.invoice_items?.forEach(item => {
      const row = document.createElement('tr');
      const total = item.price * item.quantity;
      row.innerHTML = `
        <td>${item.name || '-'}${item.code || ''}</td>
        <td>${item.quantity || '-'}</td>
        <td>${formatCurrency(item.price) || '-'}</td>
        <td>${formatCurrency(total) || '-'}</td>
      `;
      itemsBody.appendChild(row);
    });
  } catch (err) {
    invoiceContent.innerHTML = "Failed to load invoice.<br><pre>" + err.message + "</pre>";
    console.error("Invoice fetch error:", err);
  }
  invoiceModal.style.display = 'flex';
}

// Customer portal button
const customerPortalBtn = document.getElementById('customer-portal-btn');
if (customerPortalBtn) {
  customerPortalBtn.addEventListener('click', () => {
    window.location.href = 'https://billing.revgennetworks.com/portal/revgennetworks';
  });
}

// Close modal logic
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
