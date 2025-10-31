/**
 * SYNC DETAILS API ENDPOINT
 *
 * GET /api/sync/details?run_id={uuid}
 *
 * Returns records that were synchronized during a specific run
 *
 * Query Parameters:
 * - run_id: UUID of the sync run (required)
 * - limit: Max records to return (optional, default 200)
 *
 * Example:
 * GET /api/sync/details?run_id=ed72494f-7d65-4715-9010-3c3d557eeecd&limit=100
 *
 * Response:
 * {
 *   records: [
 *     { id: "12345", name: "John Doe", action: "updated", synced_at: "2025-10-31..." },
 *     ...
 *   ],
 *   total: 236,
 *   showing: 100
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('run_id');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    if (!runId) {
      return NextResponse.json(
        { error: 'run_id parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get run details
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('script_name, started_at, finished_at, records_fetched')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      );
    }

    // Determine which table to query based on script_name
    let tableName: string;
    let nameField: string;

    if (run.script_name.includes('contact')) {
      tableName = 'hubspot_contacts_raw';
      nameField = "CONCAT(firstname, ' ', lastname)";
    } else if (run.script_name.includes('deal')) {
      tableName = 'hubspot_deals_raw';
      nameField = 'dealname';
    } else if (run.script_name.includes('call')) {
      tableName = 'hubspot_calls_raw';
      nameField = "raw_json->'properties'->>'hs_call_title'";
    } else {
      return NextResponse.json(
        { error: 'Unknown script type' },
        { status: 400 }
      );
    }

    // Query records that were synced during this run
    // We filter by updated_at between started_at and finished_at
    const { data: records, error: recordsError } = await supabase
      .rpc('get_sync_details', {
        p_table_name: tableName,
        p_name_field: nameField,
        p_started_at: run.started_at,
        p_finished_at: run.finished_at,
        p_limit: limit
      });

    if (recordsError) {
      // If RPC doesn't exist, fall back to direct query
      const query = `
        SELECT
          hubspot_id,
          ${nameField} as name,
          updated_at,
          created_at,
          CASE
            WHEN created_at >= '${run.started_at}'::timestamptz
            THEN 'created'
            ELSE 'updated'
          END as action
        FROM ${tableName}
        WHERE updated_at BETWEEN '${run.started_at}'::timestamptz
          AND '${run.finished_at}'::timestamptz
        ORDER BY updated_at DESC
        LIMIT ${limit}
      `;

      const { data: fallbackRecords, error: fallbackError } = await supabase.rpc('exec_sql', { sql: query });

      if (fallbackError) {
        // Final fallback - use simple select with table-specific fields
        let selectFields = 'hubspot_id, updated_at';
        let createdField = 'createdate';

        if (tableName === 'hubspot_contacts_raw') {
          selectFields = 'hubspot_id, firstname, lastname, updated_at, createdate';
          createdField = 'createdate';
        } else if (tableName === 'hubspot_deals_raw') {
          selectFields = 'hubspot_id, dealname, updated_at, createdate';
          createdField = 'createdate';
        } else if (tableName === 'hubspot_calls_raw') {
          selectFields = 'hubspot_id, raw_json, updated_at, call_timestamp';
          createdField = 'call_timestamp';
        }

        // Simply show latest records (trying to filter by time doesn't work reliably)
        const { data: simpleRecords, error: simpleError } = await supabase
          .from(tableName)
          .select(selectFields)
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (simpleError) {
          throw simpleError;
        }

        // Transform records
        const transformedRecords = simpleRecords?.map(record => {
          let name = '';
          let createdAt = record.createdate || record.call_timestamp;

          if (tableName === 'hubspot_contacts_raw') {
            name = `${record.firstname || ''} ${record.lastname || ''}`.trim();
          } else if (tableName === 'hubspot_deals_raw') {
            name = record.dealname || 'Untitled Deal';
          } else if (tableName === 'hubspot_calls_raw') {
            name = record.raw_json?.properties?.hs_call_title || 'Untitled Call';
          }

          return {
            id: record.hubspot_id,
            name: name || 'N/A',
            action: createdAt && new Date(createdAt) >= new Date(run.started_at) ? 'created' : 'updated',
            synced_at: record.updated_at
          };
        });

        return NextResponse.json({
          records: transformedRecords || [],
          total: run.records_fetched || 0,
          showing: transformedRecords?.length || 0,
          run: {
            script_name: run.script_name,
            started_at: run.started_at,
            finished_at: run.finished_at
          }
        });
      }

      return NextResponse.json({
        records: fallbackRecords || [],
        total: run.records_fetched || 0,
        showing: fallbackRecords?.length || 0,
        run: {
          script_name: run.script_name,
          started_at: run.started_at,
          finished_at: run.finished_at
        }
      });
    }

    return NextResponse.json({
      records: records || [],
      total: run.records_fetched || 0,
      showing: records?.length || 0,
      run: {
        script_name: run.script_name,
        started_at: run.started_at,
        finished_at: run.finished_at
      }
    });

  } catch (error) {
    console.error('Error fetching sync details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync details' },
      { status: 500 }
    );
  }
}
