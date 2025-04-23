// netlify/functions/syncPartners.js
const fetch = require('node-fetch');
const supabase = require('./supabaseClient');

exports.handler = async () => {
  try {
    // TODO: Add authentication headers if SparqFi API requires them
    const sparqFiUrl = 'https://api.partner.sparqfi.com/api/v1/resellers';
    const sparqFiApiKey = process.env.SPARQFI_API_KEY;
    const response = await fetch(sparqFiUrl, {
      headers: {
        'Authorization': `Bearer ${sparqFiApiKey}`
      }
    });
    const partnersResponse = await response.json();
    const partnerList = Array.isArray(partnersResponse) ? partnersResponse : partnersResponse.items || [];

    // Map SparqFi API fields to Supabase partners table schema
    const insertData = partnerList.map((partner) => ({
      uuid: partner.uuid,
      name: partner.name,
      created_at: partner.created_at,
      last_updated_at: partner.last_updated_at,
      parent_reseller_name: partner.parent_reseller_name,
      allow_activate_deactivate: partner.allow_activate_deactivate,
      allow_plan_change: partner.allow_plan_change,
      allow_networking: partner.allow_networking,
      allow_sim_activity: partner.allow_sim_activity,
      bw_customer_id: partner.bw_customer_id,
      device_webhook: partner.device_webhook
    }));

    const { error } = await supabase.from('partners').upsert(insertData, { onConflict: 'uuid' });

    if (error) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to sync partners' }),
      };
    }

    // Now fetch and sync users for each partner
    let totalAgents = 0;
    for (const partner of partnerList) {
      try {
        const usersUrl = `https://api.partner.sparqfi.com/api/v1/reseller/${partner.uuid}/users`;
        const usersResponse = await fetch(usersUrl, {
          headers: {
            'Authorization': `Bearer ${sparqFiApiKey}`
          }
        });
        const usersData = await usersResponse.json();
        if (Array.isArray(usersData.items) && usersData.items.length > 0) {
          const agentInsertData = usersData.items.map((user) => ({
            uuid: user.uuid,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
            last_updated_at: user.last_updated_at,
            is_super_admin: user.is_super_admin,
            is_reseller_manager: user.is_reseller_manager,
            reseller_uuid: user.reseller_uuid,
            has_sim_mgmt_access: user.has_sim_mgmt_access,
            has_activate_deactivate_access: user.has_activate_deactivate_access,
            has_plan_change_access: user.has_plan_change_access,
            has_networking_access: user.has_networking_access,
            has_sim_activity_access: user.has_sim_activity_access
          }));
          const { error: agentError } = await supabase.from('agent').upsert(agentInsertData, { onConflict: 'uuid' });
          if (agentError) {
            console.error(`Supabase agent insert error for reseller ${partner.uuid}:`, agentError);
          } else {
            totalAgents += agentInsertData.length;
          }
        }
      } catch (userErr) {
        console.error(`Failed to sync users for reseller ${partner.uuid}:`, userErr);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, partners: insertData.length, agents: totalAgents }),
    };

  } catch (err) {
    console.error('Sync failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
