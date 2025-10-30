/**
 * Transform Functions
 *
 * Convert HubSpot objects to Supabase format
 */

function transformContact(contact, batchId) {
  const props = contact.properties;

  return {
    hubspot_id: contact.id,
    email: props.email || null,
    phone: props.phone || null,
    firstname: props.firstname || null,
    lastname: props.lastname || null,
    createdate: props.createdate || null,
    lifecyclestage: props.lifecyclestage || null,
    sales_script_version: props.sales_script_version || null,
    vsl_watched: props.vsl_watched === 'true' || props.vsl_watched === '1',
    vsl_watch_duration: props.vsl_watch_duration ? parseInt(props.vsl_watch_duration) : null,
    hubspot_owner_id: props.hubspot_owner_id || null,
    contact_stage: props.contact_stage || null,
    raw_json: contact,
    sync_batch_id: batchId,
  };
}

function transformDeal(deal, batchId) {
  const props = deal.properties;

  return {
    hubspot_id: deal.id,
    amount: props.amount ? parseFloat(props.amount) : null,
    dealstage: props.dealstage || null,
    dealname: props.dealname || null,
    createdate: props.createdate || null,
    closedate: props.closedate || null,
    qualified_status: props.qualified_status || null,
    trial_status: props.trial_status || null,
    payment_status: props.payment_status || null,
    number_of_installments__months: props.number_of_installments__months ? parseInt(props.number_of_installments__months) : null,
    cancellation_reason: props.cancellation_reason || null,
    is_refunded: props.is_refunded === 'true' || props.is_refunded === '1',
    installment_plan: props.installment_plan || null,
    upfront_payment: props.upfront_payment ? parseFloat(props.upfront_payment) : null,
    offer_given: props.offer_given === 'true' || props.offer_given === '1',
    offer_accepted: props.offer_accepted === 'true' || props.offer_accepted === '1',
    hubspot_owner_id: props.hubspot_owner_id || null,
    deal_whole_amount: props.deal_whole_amount ? parseFloat(props.deal_whole_amount) : null,
    the_left_amount: props.the_left_amount ? parseFloat(props.the_left_amount) : null,
    installment_monthly_amount: props.installment_monthly_amount ? parseFloat(props.installment_monthly_amount) : null,
    raw_json: deal,
    sync_batch_id: batchId,
  };
}

function transformCall(call, batchId) {
  const props = call.properties;

  return {
    hubspot_id: call.id,
    call_duration: props.hs_call_duration ? parseInt(props.hs_call_duration) : null,
    call_direction: props.hs_call_direction || null,
    call_to_number: props.hs_call_to_number || null,
    call_from_number: props.hs_call_from_number || null,
    call_timestamp: props.hs_timestamp || null,
    call_disposition: props.hs_call_disposition || null,
    raw_json: call,
    sync_batch_id: batchId,
  };
}

module.exports = {
  transformContact,
  transformDeal,
  transformCall,
};
