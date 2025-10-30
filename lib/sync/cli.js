/**
 * CLI Argument Parser
 *
 * Flexible sync options instead of rigid incremental/full:
 * - node script.js                     (incremental by default)
 * - node script.js --all               (full sync)
 * - node script.js --from=2025-10-20   (sync from date)
 * - node script.js --to=2025-10-30     (sync to date)
 * - node script.js --last=7d           (last 7 days)
 * - node script.js --rollback=2025-10-25  (resync from date)
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    from: null,
    to: null,
    last: null,
    all: false,
    rollback: null,
    incremental: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--from=')) {
      options.from = new Date(arg.split('=')[1]);
    } else if (arg.startsWith('--to=')) {
      options.to = new Date(arg.split('=')[1]);
    } else if (arg.startsWith('--last=')) {
      const value = arg.split('=')[1];
      const match = value.match(/^(\d+)([hdwmy])$/); // 7d, 24h, 1w, 1m, 1y
      if (match) {
        const [, num, unit] = match;
        const ms = {
          h: 60 * 60 * 1000,
          d: 24 * 60 * 60 * 1000,
          w: 7 * 24 * 60 * 60 * 1000,
          m: 30 * 24 * 60 * 60 * 1000,
          y: 365 * 24 * 60 * 60 * 1000,
        };
        options.from = new Date(Date.now() - parseInt(num) * ms[unit]);
      }
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--rollback=')) {
      options.rollback = new Date(arg.split('=')[1]);
      options.from = options.rollback;
    }
  }

  // Default: incremental (last successful sync)
  if (!options.from && !options.all) {
    options.incremental = true;
  }

  return options;
}

function printUsage(scriptName) {
  console.log(`
Usage: node ${scriptName} [options]

Options:
  (no args)               Incremental sync (from last successful sync)
  --all                   Full sync (all records)
  --from=YYYY-MM-DD       Sync from specific date
  --to=YYYY-MM-DD         Sync to specific date
  --last=7d               Sync last N days/hours (7d, 24h, 1w, 1m, 1y)
  --rollback=YYYY-MM-DD   Resync from specific date (same as --from)

Examples:
  node ${scriptName}                        # Incremental (default)
  node ${scriptName} --all                  # Full sync
  node ${scriptName} --from=2025-10-20      # From specific date
  node ${scriptName} --last=7d              # Last 7 days
  node ${scriptName} --rollback=2025-10-25  # Resync from Oct 25
`);
}

module.exports = {
  parseArgs,
  printUsage,
};
