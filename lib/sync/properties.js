/**
 * HubSpot Properties Configuration
 *
 * Optimized list: 35 fields instead of 421 (91% space savings)
 * Shared across all sync scripts
 */

// Standard HubSpot fields (11) + Custom Critical (9) + Custom Useful (15) = 35 fields
const CONTACT_PROPERTIES = [
  // Standard HubSpot fields (11)
  'email',
  'phone',
  'firstname',
  'lastname',
  'createdate',
  'lifecyclestage',
  'hubspot_owner_id',
  'lastmodifieddate',
  'hs_object_id',

  // Custom Critical (9) - REQUIRED for business logic
  'sold_by_',              // WHO SOLD (critical!)
  'contact_stage',         // contact stage
  'sales_script_version',  // sales script version
  'qualified',             // is qualified
  'status',                // current status
  'stage',                 // funnel stage
  'hot_lead',              // hot lead
  'contact_source',        // contact source
  'lost_reason',           // reason for loss

  // Custom Useful (15) - useful for analytics
  'first_contact_within_30min',
  'offer_sent',
  'deal_amount',
  'monthly_payment',
  'number_of_installments',
  'first_payment_date',
  'last_payment',
  'video_attended',
  'vsl_watched',
  'vsl_watch_duration',
  'lead_score',
  'campaign',
  'ad',
  'source',
  'payment_method',
  'quiz'
];

const DEAL_PROPERTIES = [
  'amount',
  'dealstage',
  'dealname',
  'createdate',
  'closedate',
  'qualified_status',
  'trial_status',
  'payment_status',
  'number_of_installments__months',
  'cancellation_reason',
  'is_refunded',
  'installment_plan',
  'upfront_payment',
  'offer_given',
  'offer_accepted',
  'hubspot_owner_id',
  'lastmodifieddate',
  'deal_whole_amount',
  'the_left_amount',
  'installment_monthly_amount',
];

const CALL_PROPERTIES = [
  'hs_call_duration',
  'hs_call_direction',
  'hs_call_to_number',
  'hs_call_from_number',
  'hs_timestamp',
  'hs_call_disposition',
  'hs_call_status',
];

module.exports = {
  CONTACT_PROPERTIES,
  DEAL_PROPERTIES,
  CALL_PROPERTIES,
};
