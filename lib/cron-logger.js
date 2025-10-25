/**
 * Logger class for cron job execution tracking
 * Writes logs to Supabase runs and logs tables
 *
 * Adapted from Vapi project logging system
 * Uses Node.js built-in fetch (available in Node.js v18+)
 */
class Logger {
  constructor(runId, supabaseUrl, supabaseKey) {
    this.runId = runId;
    this.url = supabaseUrl;
    this.key = supabaseKey;
  }

  /**
   * Write log entry to Supabase logs table
   */
  async log(level, step, message, meta = {}) {
    const body = {
      run_id: this.runId,
      level,
      step,
      message,
      meta,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(`${this.url}/rest/v1/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(body),
      });

      console.log(`[${level}] ${step}: ${message}`);
    } catch (error) {
      console.error('Failed to write log to Supabase:', error.message);
      console.log(`[${level}] ${step}: ${message}`);
    }
  }

  /**
   * Log info message
   */
  info(step, message, meta = {}) {
    return this.log('INFO', step, message, meta);
  }

  /**
   * Log error message
   */
  error(step, message, meta = {}) {
    return this.log('ERROR', step, message, meta);
  }

  /**
   * Log warning message
   */
  warning(step, message, meta = {}) {
    return this.log('WARNING', step, message, meta);
  }

  /**
   * Log debug message (for development)
   */
  debug(step, message, meta = {}) {
    if (process.env.DEBUG === 'true') {
      return this.log('DEBUG', step, message, meta);
    }
  }
}

/**
 * Helper function to create a new run in Supabase
 */
async function createRun(scriptName, supabaseUrl, supabaseKey, triggeredBy = 'manual') {
  try {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`Missing Supabase credentials: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`);
    }

    const body = {
      script_name: scriptName,
      status: 'running',
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const run = Array.isArray(data) ? data[0] : data;

    if (!run || !run.id) {
      throw new Error(`Invalid run response from Supabase: ${JSON.stringify(data)}`);
    }

    console.log(`\n🚀 Run started: ${scriptName} (run_id: ${run.id.substring(0, 8)}...)`);

    return run;
  } catch (error) {
    console.error('❌ Failed to create run in Supabase:', error.message);
    throw error;
  }
}

/**
 * Helper function to update run status
 */
async function updateRun(runId, updates, supabaseUrl, supabaseKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to update run: ${errorText}`);
    }
  } catch (error) {
    console.error('Failed to update run:', error.message);
  }
}

module.exports = {
  Logger,
  createRun,
  updateRun,
};
