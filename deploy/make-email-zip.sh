#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${ROOT_DIR}/pi-dashboard-for-brother.zip"

cd "${ROOT_DIR}"
rm -f "${OUTPUT}"

zip -r "${OUTPUT}" . \
  -x "node_modules/*" \
  -x "apps/*/node_modules/*" \
  -x "dist/*" \
  -x "apps/*/dist/*" \
  -x "packages/*/dist/*" \
  -x "apps/*/data/*" \
  -x "*.tsbuildinfo" \
  -x "packages/*/src/*.js" \
  -x "*.sqlite" \
  -x "*.sqlite-shm" \
  -x "*.sqlite-wal" \
  -x ".git/*" \
  -x ".env" \
  -x ".env.local"

echo "Created ${OUTPUT}"
