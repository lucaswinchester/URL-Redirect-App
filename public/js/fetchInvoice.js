// public/fetchInvoice.js
export async function fetchInvoice(invoiceId) {
  if (!invoiceId) throw new Error("Missing invoice ID");
  const res = await fetch('/.netlify/functions/get-invoice?invoice_id=' + encodeURIComponent(invoiceId));
  if (!res.ok) {
    let errMsg = await res.text();
    throw new Error(errMsg);
  }
  return await res.json();
}

