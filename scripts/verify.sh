#!/usr/bin/env bash
# Build the site, then drive every route of docs/FEATURES.md in headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
node scripts/verify.mjs
