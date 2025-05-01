/**
 * Fetches invoice data from your serverless function.
 * @param {string} invoiceId
 * @returns {Promise<Object>} Invoice data from Zoho
 */
export async function fetchInvoice(invoiceId) {
  if (!invoiceId) throw new Error("Missing invoice ID");
  try {
    const response = await fetch(`/.netlify/functions/getInvoice?invoice_id=${encodeURIComponent(invoiceId)}`);
    const data = await response.json();
    
    if (data.code === 0) {
      const invoice = data.invoice;
      
      // Update invoice details
      document.getElementById('invoice-number').textContent = invoice.number;
      document.getElementById('invoice-date').textContent = invoice.invoice_date;
      document.getElementById('invoice-due-date').textContent = invoice.due_date;
      document.getElementById('invoice-status').textContent = invoice.status;
      document.getElementById('invoice-total').textContent = `${invoice.currency_symbol}${invoice.total}`;
      document.getElementById('payment-status').textContent = invoice.status === 'paid' ? 'Paid' : 'Pending';

      // Create PDF viewer
      const pdfContainer = document.getElementById('invoice-pdf-container');
      pdfContainer.innerHTML = `
        <iframe 
          src="${invoice.invoice_url}" 
          style="width: 100%; height: 500px; border: none;"
          title="Invoice PDF"
        ></iframe>
      `;

      // Show modal
      document.getElementById('invoice-modal').style.display = 'flex';
    } else {
      console.error('Error fetching invoice:', data);
      alert('Failed to fetch invoice. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while fetching the invoice.');
  }
}
