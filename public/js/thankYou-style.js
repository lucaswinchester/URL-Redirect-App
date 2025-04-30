// thank-you.js
document.addEventListener("DOMContentLoaded", () => {
    // Confetti celebration 🎊
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 }
    });
  
    // Get query params (assume sale data was passed this way)
    const params = new URLSearchParams(window.location.search);
  
    const fields = {
      "SUB ID": params.get("subscription_id"),
      "Customer Name": params.get("customer_name"),
      "Email": params.get("email"),
      "Plan ID": params.get("plan_id"),
      "RGID": params.get("cf_dealer_id"),
      "Agent ID": params.get("cf_agent_id"),
      "Line Items": params.get("line_items"),
      "Amount": params.get("amount"),
      "Source": params.get("source"),
    };
  
    const orderDetails = document.getElementById("orderDetails");
  
    if (!orderDetails) return;
  
    Object.entries(fields).forEach(([key, value]) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${key}:</strong> ${value || "N/A"}`;
      orderDetails.appendChild(p);
    });
  });
  