#!/bin/bash
set -euo pipefail

LOG="$(dirname "$0")/tweet_daily_stats.log"
exec >> "$LOG" 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') ==="

set -a
. "$(dirname "$0")/../.env"
set +a

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull ghcr.io/rahandi/jkt48tracker-tools:latest
docker run --rm \
  --network=host \
  --env-file "$(dirname "$0")/../.env" \
  ghcr.io/rahandi/jkt48tracker-tools:latest \
  python3 tweet_daily_stats.py

echo "=== done ==="
