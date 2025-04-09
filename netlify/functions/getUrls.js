const fetch = require("node-fetch");

exports.handler = async (event) => {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "Products";

  const params = event.queryStringParameters;
  const product = params.product;
  const variant = params.variant || "default";

  if (!product) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing product" })
    };
  }

  const filterFormula = `AND({product_id}='${product}', OR({variant}='${variant}', {variant}='default'))`;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const data = await response.json();
    const record = data.records[0];

    if (!record) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Product or variant not found" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: record.fields.zoho_url
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: error.message })
    };
  }
};
