/**
 * OWNERS API ENDPOINT
 *
 * GET /api/owners
 *
 * Returns list of sales managers/owners for dashboard filters
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLogger } from '@/lib/app-logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const logger = getLogger('owners-api');

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('hubspot_owners')
      .select('hubspot_id, email, first_name, last_name')
      .order('first_name');

    if (error) {
      throw new Error(`Failed to fetch owners: ${error.message}`);
    }

    logger.info('Owners fetched successfully', { count: data?.length || 0 });

    return NextResponse.json(data || []);
  } catch (error) {
    logger.error('Owners API error', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch owners',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
