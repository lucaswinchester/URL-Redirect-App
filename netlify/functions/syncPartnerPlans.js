const supabase = require('./supabaseClient');

// Simple random string generator
function generateShortCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Syncs all bundles to all partners, creating unique short codes for new combinations
 * This version processes one partner at a time to avoid timeouts
 */
exports.handler = async () => {
  try {
    // 1. First, get just the counts to estimate work
    const [
      { count: partnerCount },
      { data: allBundles, count: bundleCount }
    ] = await Promise.all([
      supabase.from('partners').select('*', { count: 'exact', head: true }),
      supabase.from('bundles').select('id')
    ]);

    if (!partnerCount || !bundleCount) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No partners or bundles to process',
          total: 0,
          successCount: 0,
          errorCount: 0
        })
      };
    }

    // 2. Process one partner at a time
    const BATCH_SIZE = 100; // Process bundles in batches of 100
    let successCount = 0;
    const errors = [];
    const now = new Date().toISOString();
    const bundleIds = allBundles.map(b => b.id);

    // Get all partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('agent_id_auto');

    if (partnersError) {
      throw partnersError;
    }

    // Process each partner
    for (const partner of partners) {
      try {
        // Get existing bundle IDs for this partner
        const { data: existingPlans, error: existingError } = await supabase
          .from('partner_plans')
          .select('bundle_id')
          .eq('agent_id_auto', partner.agent_id_auto);

        if (existingError) throw existingError;

        const existingBundleIds = new Set(existingPlans.map(p => p.bundle_id));
        
        // Find bundles that don't have a plan for this partner
        const newBundleIds = bundleIds.filter(id => !existingBundleIds.has(id));

        // Process bundles in batches
        for (let i = 0; i < newBundleIds.length; i += BATCH_SIZE) {
          const batch = newBundleIds.slice(i, i + BATCH_SIZE);
          const newPlans = batch.map(bundleId => ({
            agent_id_auto: partner.agent_id_auto,
            bundle_id: bundleId,
            short_code: generateShortCode(8),
            created_at: now
          }));

          if (newPlans.length > 0) {
            const { error: insertError } = await supabase
              .from('partner_plans')
              .insert(newPlans);

            if (insertError) throw insertError;
            successCount += newPlans.length;
          }
        }
      } catch (error) {
        console.error(`Error processing partner ${partner.agent_id_auto}:`, error);
        errors.push({
          agent_id_auto: partner.agent_id_auto,
          error: error.message
        });
      }
    }

    // 3. Return results
    return {
      statusCode: errors.length === 0 ? 200 : 207, // 207 for partial success
      body: JSON.stringify({
        success: errors.length === 0,
        total: partners.length * bundleIds.length,
        successCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    console.error('Sync partner plans failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to sync partner plans',
        details: error.message 
      }),
    };
  }
};