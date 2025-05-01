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
  invoiceContent.innerHTML = "Loading invoice...";
  try {
    const invoiceData = await fetchInvoice(invoiceId);
    const inv = invoiceData.invoice;

    // Render invoice details (adjust field names as needed)
    invoiceContent.innerHTML = `
      <h2 style="text-align:center;">Invoice Details</h2>
      <hr>
      <div style="display:flex;justify-content:space-between;">
        <div>
          <strong>Invoice Number:</strong> ${inv.invoice_number || '-'}<br>
          <strong>Invoice Date:</strong> ${inv.date || '-'}
        </div>
        <div>
          <strong>Customer:</strong> ${inv.customer_name || '-'}<br>
          <strong>Due Date:</strong> ${inv.due_date || '-'}
        </div>
      </div>
      <hr>
      <table style="width:100%;margin-bottom:1em;">
        <thead>
          <tr>
            <th>Name</th><th>Quantity</th><th>Unit Price</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.line_items || []).map(item => `
            <tr>
              <td>${item.name || '-'}</td>
              <td>${item.quantity || '-'}</td>
              <td>${item.rate || '-'}</td>
              <td>${item.item_total || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:space-between;">
        <div>
          <strong>Subtotal:</strong> ${inv.sub_total || '-'}<br>
          <strong>Tax:</strong> ${inv.tax_total || '-'}
        </div>
        <div>
          <strong>Payment Status:</strong> ${inv.payment_status || '-'}<br>
          <strong>Payment Date:</strong> ${inv.payment_date || '-'}
        </div>
      </div>
      <hr>
      <div style="text-align:right;">
        <strong>Total Amount:</strong> ${inv.total || '-'}
      </div>
    `;
  } catch (err) {
    invoiceContent.innerHTML = "Failed to load invoice.<br><pre>" + err.message + "</pre>";
    console.error("Invoice fetch error:", err);
  }
  invoiceModal.style.display = 'flex';
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
