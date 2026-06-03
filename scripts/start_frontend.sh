#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/frontend"

if [ ! -f .env ]; then
  cp .env.example .env
fi

npm install --include=dev >/dev/null
npm run dev
