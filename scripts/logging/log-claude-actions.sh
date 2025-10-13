#!/bin/bash

# Claude Code Complete Logging Script
# Logs all actions to a centralized log file

LOG_DIR="$HOME/Desktop/Shadi - new/logs"
LOG_FILE="$LOG_DIR/claude-actions-$(date +%Y%m%d).jsonl"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Read JSON from stdin
input=$(cat)

# Add timestamp and write to log file
echo "$input" | jq -c '. + {
  logged_at: now | strftime("%Y-%m-%d %H:%M:%S"),
  timestamp_unix: now
}' >> "$LOG_FILE" 2>/dev/null

# If jq is not available, fallback to simple logging
if [ $? -ne 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $input" >> "$LOG_FILE"
fi

# Exit successfully
exit 0
