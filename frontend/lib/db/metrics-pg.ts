/**
 * METRICS с прямым PostgreSQL подключением
 *
 * Использует pg driver напрямую чтобы установить statement_timeout
 * Это нужно когда Supabase REST API timeout слишком короткий
 */

import { Pool } from 'pg';
import { getLogger } from '@/lib/app-logger';
import type { AllMetrics, MetricsFilters } from './metrics-fast';

const logger = getLogger('metrics-pg');

// Supabase Direct Connection (Session Mode - порт 5432)
// НЕ используем DATABASE_URL (он для Prisma с pgbouncer)
const connectionString = process.env.DATABASE_URL!
  .replace(':6543', ':5432')  // Session Mode вместо Transaction Mode
  .replace('?pgbouncer=true', '');  // Убираем pgbouncer параметр

// Connection pool
const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Увеличиваем statement_timeout до 60 секунд
  statement_timeout: 60000,
});

export async function getAllMetricsPg(
  filters: MetricsFilters = {}
): Promise<AllMetrics> {
  const { ownerId, dateFrom, dateTo } = filters;

  logger.info('Fetching metrics via direct PG connection', { filters });

  const startTime = Date.now();
  const client = await pool.connect();

  try {
    // Устанавливаем timeout для этой сессии
    await client.query('SET statement_timeout = 60000');

    // Вызываем SQL функцию
    const result = await client.query(
      'SELECT get_all_metrics($1, $2, $3) as metrics',
      [ownerId || null, dateFrom || null, dateTo || null]
    );

    const duration = Date.now() - startTime;
    const metrics = result.rows[0].metrics;

    logger.info('Metrics fetched successfully via PG', {
      duration_ms: duration,
      totalSales: metrics.totalSales,
      totalDeals: metrics.totalDeals,
    });

    return metrics as AllMetrics;

  } catch (error) {
    logger.error('PG fetch error', { error });
    throw error;
  } finally {
    client.release();
  }
}
