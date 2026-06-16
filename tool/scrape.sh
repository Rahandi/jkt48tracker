#!/bin/bash
set -euo pipefail

LOG="$(dirname "$0")/scrape.log"
exec >> "$LOG" 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') ==="

set -a
. "$(dirname "$0")/../.env"
set +a

SYNC_YEAR=$(date -d '2 months ago' '+%Y')
SYNC_MONTH=$(date -d '2 months ago' '+%-m')

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull ghcr.io/rahandi/jkt48tracker-tools:latest

# Sync member profiles (names, nicknames, teams)
docker run --rm \
  --network=host \
  --env-file "$(dirname "$0")/../.env" \
  -v "$(dirname "$0")/theater.py:/app/theater.py" \
  ghcr.io/rahandi/jkt48tracker-tools:latest \
  python3 /app/theater.py sync-members

# Sync theater schedule (rolling 2-month window)
docker run --rm \
  --network=host \
  --env-file "$(dirname "$0")/../.env" \
  -e SYNC_START_YEAR="$SYNC_YEAR" \
  -e SYNC_START_MONTH="$SYNC_MONTH" \
  -v "$(dirname "$0")/theater.py:/app/theater.py" \
  ghcr.io/rahandi/jkt48tracker-tools:latest \
  python3 /app/theater.py

echo "=== done ==="
