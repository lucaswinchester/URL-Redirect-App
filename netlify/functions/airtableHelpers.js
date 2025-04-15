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
  const formula = `AND({Agent ID}='${agentId}',{RGID}='${dealerId}')`;
  const url = `https://api.airtable.com/v0/${BASE_ID}/${USER_TABLE_ID}?filterByFormula=${encodeURIComponent(
    formula
  )}&maxRecords=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    },
  });

  const json = await res.json();
  return json.records?.[0]?.fields || null;
}

module.exports = { getCheckoutUrlByPlanID, getAgentDetails };
