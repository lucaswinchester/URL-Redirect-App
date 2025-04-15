// logSubscription.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_ID = "tblUpMyEqXM0buXI8";

    const payload = {
      records: [
        {
          fields: {
            "SUB ID": body.subscription_id || "",
            "Customer Name": body.customer_name || "",
            Email: body.email || "",
            "Plan ID": body.plan_id || "",
            "RGID": body.cf_dealer_id || "",
            "Agent ID": body.cf_agent_id || "",
            "Line Items": body.line_items || "",
            Amount: body.amount || 0,
            Created: body.timestamp || new Date().toISOString(),
            Source: body.source || "",
          },
        },
      ],
    };

    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, record: data }),
    };
  } catch (err) {
    console.error("Logging error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Logging failed" }),
    };
  }
};
