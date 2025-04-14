const fetch = require("node-fetch");
require('dotenv').config();

exports.handler = async (event) => {
  const { 
    router,
    plan,
    program,
    protection_plan = "false"
  } = event.queryStringParameters;

  if (!router || !plan || !program) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" })
    };
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  //SIMPLE PRODUCT LINKS TABLE
  //const TABLE_ID = "tblJTN70fil3fwcle";
  
  //DIRECT RETAILER PRICING TABLE
  const TABLE_ID = "tblfeCLmlirVWtaA4";

  // Airtable filter using AND() on all criteria
  const formula = `AND(
    {Router SKU}='${router.toUpperCase()}',
    {Plan}='${plan.toUpperCase()}',
    {Program}='${capitalizeFirstLetter(program)}',
    {Router Protection}=${protection_plan === 'true' ? 'TRUE()' : 'FALSE()'}
  )`;

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

  console.log(url);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`
      }
    });

    const data = await response.json();
    const record = data.records[0];

    console.log('Record = ', record);

    if (!record) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No matching checkout URL found." })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: record.fields.URL
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal error", detail: err.message })
    };
  }
};
