/**
 * Fetches invoice data from your serverless function.
 * @param {string} invoiceId
 * @returns {Promise<Object>} Invoice data from Zoho
 */
export async function fetchInvoice(invoiceId) {
    if (!invoiceId) throw new Error("Missing invoice ID");
    const res = await fetch(`/api/get-invoice?invoice_id=${encodeURIComponent(invoiceId)}`);
    if (!res.ok) throw new Error("Failed to fetch invoice");
    return await res.json();
  }
  