const fetch = require("node-fetch");

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

const USER_TABLE_ID = "tblPMOglEbuYnwxyd";
const PRODUCT_TABLE_ID = "tblfeCLmlirVWtaA4";
const SALES_TABLE_ID = "tblUpMyEqXM0buXI8";

async function getCheckoutUrlByPlanID(planID) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${PRODUCT_TABLE_ID}/${planID}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  });

  const json = await res.json();
  return json.fields?.URL || null;
}

async function getAgentDetails(dealerId, agentId) {
  try {
    if (!dealerId || !agentId) {
      console.error('Missing required IDs:', { dealerId, agentId });
      return null;
    }

    // Log the exact formula we're using
    const formula = `AND({Agent ID}='${agentId}',{RGID}='${dealerId}')`;
    console.log('Airtable query formula:', formula);

    const url = `https://api.airtable.com/v0/${BASE_ID}/${USER_TABLE_ID}?filterByFormula=${encodeURIComponent(
      formula
    )}&maxRecords=1`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!res.ok) {
      console.error('Airtable request failed:', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    console.log('Airtable response:', JSON.stringify(json, null, 2));

    // Check if we got any records
    if (!json.records || json.records.length === 0) {
      console.log('No records found in Airtable');
      return null;
    }

    return json.records[0].fields;
  } catch (error) {
    console.error('Error fetching agent details:', error);
    return null;
  }
}

module.exports = { getCheckoutUrlByPlanID, getAgentDetails };
