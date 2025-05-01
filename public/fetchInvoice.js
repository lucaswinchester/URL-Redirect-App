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
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch invoice');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}
