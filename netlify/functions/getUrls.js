const fetch = require("node-fetch");

exports.handler = async (event) => {
  const { router, plan, program, protection_plan = "false" } = event.queryStringParameters;

  if (!router || !plan || !program) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" })
    };
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;
  const TABLE_NAME = "tblJTN70fil3fwcle";

  // Airtable filter using AND() on all criteria
  const formula = `AND(
    {fldhZc2Bq0JYVLQ2b}='${router}',
    {fldvK3fefCQS4IyZo}='${plan}',
    {flddy9xyJ4VDqQPz2}='${program}',
    {fldZBDNAO24X3QQnt}='${protection_plan}'
  )`;

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

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
        body: JSON.stringify({ error: "No matching checkout URL found." })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: record.fields.zoho_url
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal error", detail: err.message })
    };
  }
};
