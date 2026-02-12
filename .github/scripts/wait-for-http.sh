#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: wait-for-http.sh <url> [timeout_seconds]" >&2
  exit 2
fi

url="$1"
timeout="${2:-60}"

for ((i=1; i<=timeout; i++)); do
  if curl -fsS "$url" >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for ${url} after ${timeout}s" >&2
exit 1
