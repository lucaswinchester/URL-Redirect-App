const { handler: syncPlansHandler } = require('./syncPlans');
const { handler: syncAddonsHandler } = require('./syncAddons');

exports.handler = async (event, context) => {
  const plansResult = await syncPlansHandler(event, context);
  const addonsResult = await syncAddonsHandler(event, context);

  return {
    statusCode: 200,
    body: JSON.stringify({
      plans: JSON.parse(plansResult.body),
      addons: JSON.parse(addonsResult.body)
    })
  };
};