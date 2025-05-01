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
  invoiceContent.innerHTML = "<p>Loading invoice...</p>";
  try {
    const invoiceData = await fetchInvoice(invoiceId);
    const inv = invoiceData.invoice;

    // Render invoice details
    invoiceContent.innerHTML = `
      <div class="invoice-header">
        <h2>Invoice Details</h2>
      </div>
      <div class="invoice-header-info">
        <div class="invoice-info-left">
          <p><strong>Invoice Number:</strong> ${inv.invoice_number || '-'}</p>
          <p><strong>Invoice Date:</strong> ${inv.date || '-'}</p>
        </div>
        <div class="invoice-info-right">
          <p><strong>Customer:</strong> ${inv.customer_name || '-'}</p>
          <p><strong>Due Date:</strong> ${inv.due_date || '-'}</p>
        </div>
      </div>
      <div class="invoice-items">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.line_items || []).map(item => `
              <tr>
                <td>${item.name || '-'}</td>
                <td>${item.quantity || '-'}</td>
                <td>${item.unit_price || '-'}</td>
                <td>${item.total || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="invoice-total">
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
