/**
 * Enhanced Sync Logger
 *
 * Logs to:
 * 1. Console (always, for engineer)
 * 2. JSON file (always, raw stream for debugging)
 * 3. Supabase (only important events, for client)
 *
 * Philosophy: "Noise kills trust"
 * - Engineer sees EVERYTHING in console + JSON files
 * - Client sees only summary in Supabase (no noise)
 */

const fs = require('fs').promises;
const path = require('path');

class SyncLogger {
  constructor(runId, supabaseUrl, supabaseKey) {
    this.runId = runId;
    this.url = supabaseUrl;
    this.key = supabaseKey;
    this.logFile = path.join('logs', `sync-${runId}.jsonl`);

    // Ensure logs directory exists
    this.ensureLogsDir();
  }

  async ensureLogsDir() {
    try {
      await fs.mkdir('logs', { recursive: true });
    } catch (error) {
      // Directory already exists, ignore
    }
  }

  async log(level, step, message, meta = {}) {
    const logEntry = {
      run_id: this.runId,
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
      meta
    };

    // 1. Console (всегда, для инженера)
    console.log(`[${level}] ${step}: ${message}`);

    // 2. JSON file (всегда, raw stream для отладки)
    try {
      await fs.appendFile(
        this.logFile,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
    } catch (err) {
      console.error('Failed to write to JSON log:', err.message);
    }

    // 3. Supabase (только важное для клиента - no noise!)
    const shouldLogToSupabase =
      level === 'ERROR' ||
      level === 'WARNING' ||
      step === 'START' ||
      step === 'END' ||
      step === 'TIMEOUT';

    if (shouldLogToSupabase) {
      try {
        await fetch(`${this.url}/rest/v1/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(logEntry),
        });
      } catch (err) {
        console.error('Failed to write to Supabase:', err.message);
      }
    }
  }

  info(step, message, meta = {}) {
    return this.log('INFO', step, message, meta);
  }

  error(step, message, meta = {}) {
    return this.log('ERROR', step, message, meta);
  }

  warning(step, message, meta = {}) {
    return this.log('WARNING', step, message, meta);
  }

  debug(step, message, meta = {}) {
    if (process.env.DEBUG === 'true') {
      return this.log('DEBUG', step, message, meta);
    }
  }
}

module.exports = { SyncLogger };
