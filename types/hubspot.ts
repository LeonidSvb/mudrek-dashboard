// HubSpot API Types

export type ObjectType = 'contacts' | 'deals' | 'calls';

export interface HubSpotPaginatedResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    phone?: string;
    firstname?: string;
    lastname?: string;
    createdate?: string;
    lifecyclestage?: string;
    contact_stage?: string;
    sales_script_version?: string;
    vsl_watched?: string;
    vsl_watch_duration?: string;
    hubspot_owner_id?: string;
    hs_lastmodifieddate?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    amount?: string;
    dealstage?: string;
    dealname?: string;
    createdate?: string;
    closedate?: string;
    qualified_status?: string;
    trial_status?: string;
    payment_status?: string;
    number_of_installments__months?: string;
    cancellation_reason?: string;
    is_refunded?: string;
    installment_plan?: string;
    upfront_payment?: string;
    offer_given?: string;
    offer_accepted?: string;
    hubspot_owner_id?: string;
    hs_lastmodifieddate?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

export interface HubSpotCall {
  id: string;
  properties: {
    hs_call_duration?: string;
    hs_call_direction?: string;
    hs_call_to_number?: string;
    hs_call_from_number?: string;
    hs_timestamp?: string;
    hs_call_disposition?: string;
    hs_call_status?: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

// Database table types (for Supabase)
export interface ContactRaw {
  hubspot_id: string;
  email: string | null;
  phone: string | null;
  firstname: string | null;
  lastname: string | null;
  createdate: string | null;
  lifecyclestage: string | null;
  sales_script_version: string | null;
  vsl_watched: boolean;
  vsl_watch_duration: number | null;
  raw_json: HubSpotContact;
  synced_at: string;
  updated_at: string;
  sync_batch_id?: string;
}

export interface DealRaw {
  hubspot_id: string;
  amount: number | null;
  dealstage: string | null;
  createdate: string | null;
  closedate: string | null;
  qualified_status: string | null;
  trial_status: string | null;
  payment_status: string | null;
  number_of_installments__months: number | null;
  cancellation_reason: string | null;
  is_refunded: boolean;
  installment_plan: string | null;
  upfront_payment: number | null;
  offer_given: boolean;
  offer_accepted: boolean;
  raw_json: HubSpotDeal;
  synced_at: string;
  updated_at: string;
  sync_batch_id?: string;
}

export interface CallRaw {
  hubspot_id: string;
  call_duration: number | null;
  call_direction: string | null;
  call_to_number: string | null;
  call_from_number: string | null;
  call_timestamp: string | null;
  call_disposition: string | null;
  raw_json: HubSpotCall;
  synced_at: string;
  updated_at: string;
  sync_batch_id?: string;
}

// Sync result types
export interface SyncResult {
  object_type: ObjectType;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_failed: number;
  status: 'success' | 'partial' | 'failed';
  duration_seconds: number;
}

// Sync log table type (from Supabase)
export interface SyncLog {
  id: number;
  batch_id: string;
  object_type: ObjectType;
  status: 'success' | 'partial' | 'failed';
  sync_started_at: string;
  sync_completed_at?: string | null;
  duration_seconds?: number | null;
  records_fetched?: number | null;
  records_inserted?: number | null;
  records_updated?: number | null;
  records_failed?: number | null;
  error_message?: string | null;
  triggered_by?: 'cron' | 'manual' | 'api' | null;
  metadata?: Record<string, any> | null;
}
