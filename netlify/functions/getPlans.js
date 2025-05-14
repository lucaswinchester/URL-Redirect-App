// netlify/functions/getPlans.js
const supabase = require('./supabaseClient');

exports.handler = async () => {
  try {
    const { data, error } = await supabase.from('bundles').select('*');
    if (error) throw error;
    return {
      statusCode: 200,
      body: JSON.stringify({ bundles: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
