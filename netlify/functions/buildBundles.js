const supabase = require('./supabaseClient');

function getCombinations(array) {
  const result = [[]];
  for (const value of array) {
    const copy = [...result];
    for (const prefix of copy) {
      result.push([...prefix, value]);
    }
  }
  return result;
}

function bundleKey(plan_id, addon_id) {
  // Sort addon_ids to ensure uniqueness regardless of order
  return `${plan_id}::${addon_id.slice().sort().join(',')}`;
}

exports.handler = async (event, context) => {
  // 1. Fetch plans, addons, and existing bundles
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*');
  const { data: addons, error: addonsError } = await supabase
    .from('addons')
    .select('*');
  const { data: existingBundles, error: bundlesError } = await supabase
    .from('bundles')
    .select('id, plan_id, addon_id');

  if (plansError || addonsError || bundlesError) {
    console.error('Error fetching data:', plansError, addonsError, bundlesError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data' }),
    };
  }

  // 2. Build a set of existing bundle keys
  const existingBundleKeys = new Set(
    (existingBundles || []).map((b) => bundleKey(b.plan_id, b.addon_id))
  );

  // 3. Categorize addons by bundle_behavior
  const alwaysAddons = addons.filter((a) => a.bundle_behavior === 'Always');
  const exclusiveAddons = addons.filter((a) => a.bundle_behavior === 'Exclusive');
  const optionalAddons = addons.filter((a) => a.bundle_behavior === 'Optional');

  // 4. Generate new bundles
  const newBundles = [];

  for (const plan of plans) {
    const baseAddons = alwaysAddons.map((a) => a.zoho_id);

    // a) Bundles with each exclusive add-on (and always)
    for (const exclusive of exclusiveAddons) {
      const addon_id = [...baseAddons, exclusive.zoho_id];
      const key = bundleKey(plan.zoho_id, addon_id);
      if (!existingBundleKeys.has(key)) {
        newBundles.push({
          plan_id: plan.zoho_id,
          addon_id,
          Program: plan.Program || 'Default', // Add default Program value
          Plan: plan.Plan || plan.zoho_id,   // Include Plan field if it's required
          router_id: plan.router_id || null,  // Include router_id if it's required
          Carrier: plan.Carrier || 'Default', // Add default Carrier value
          "Router Assurance": plan["Router Assurance"] || false // Add default Router Assurance value
        });
        existingBundleKeys.add(key); // Prevent duplicates in this run
      }
    }

    // b) Bundles with all combinations of optional add-ons (and always)
    const optionalCombos = getCombinations(optionalAddons.map((a) => a.zoho_id));
    for (const combo of optionalCombos) {
      const addon_id = [...baseAddons, ...combo];
      const key = bundleKey(plan.zoho_id, addon_id);
      if (!existingBundleKeys.has(key)) {
        newBundles.push({
          plan_id: plan.zoho_id,
          addon_id,
          Program: plan.Program || 'Default', // Add default Program value
          Plan: plan.Plan || plan.zoho_id,   // Include Plan field if it's required
          router_id: plan.router_id || null,  // Include router_id if it's required
          Carrier: plan.Carrier || 'Default', // Add default Carrier value
          "Router Assurance": plan["Router Assurance"] || false // Add default Router Assurance value
        });
        existingBundleKeys.add(key);
      }
    }
  }

  // 5. Insert or update bundles with error handling
  if (newBundles.length > 0) {
    const batchSize = 50; // Reduced batch size for better error handling
    let successfulInserts = 0;
    const errors = [];

    for (let i = 0; i < newBundles.length; i += batchSize) {
      const batch = newBundles.slice(i, i + batchSize);
      
      // Process each bundle individually within the batch
      for (const bundle of batch) {
        try {
          // Try to insert the bundle
          const { data: existing, error: selectError } = await supabase
            .from('bundles')
            .select('id')
            .eq('plan_id', bundle.plan_id)
            .contains('addon_id', bundle.addon_id)
            .single();

          if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is 'not found' error
            throw selectError;
          }

          if (existing) {
            // Update existing bundle if needed
            const { error: updateError } = await supabase
              .from('bundles')
              .update(bundle)
              .eq('id', existing.id);
              
            if (updateError) throw updateError;
          } else {
            // Insert new bundle
            const { error: insertError } = await supabase
              .from('bundles')
              .insert([bundle]);
              
            if (insertError) throw insertError;
          }
          
          successfulInserts++;
        } catch (error) {
          console.error(`Error processing bundle (plan_id: ${bundle.plan_id}, addon_id: ${bundle.addon_id}):`, error.message);
          errors.push({
            plan_id: bundle.plan_id,
            addon_id: bundle.addon_id,
            error: error.message
          });
          // Continue with next bundle even if one fails
        }
      }
    }

    console.log(`Successfully processed ${successfulInserts} out of ${newBundles.length} bundles.`);
    if (errors.length > 0) {
      console.error(`Failed to process ${errors.length} bundles.`);
      // Return partial success with error details
      return {
        statusCode: 207, // Multi-status
        body: JSON.stringify({
          success: true,
          processed: successfulInserts,
          failed: errors.length,
          total: newBundles.length,
          errors: errors
        })
      };
    }
  }

  console.log(`Inserted ${newBundles.length} new bundles.`);
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, inserted: newBundles.length }),
  };
};
