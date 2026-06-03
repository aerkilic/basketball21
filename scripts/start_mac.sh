#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v docker >/dev/null 2>&1; then
  echo "[INFO] Starte PostgreSQL via docker compose..."
  (cd "$ROOT_DIR" && [ -f .env ] || cp .env.example .env; docker compose -f deploy/docker-compose.yml up -d postgres)
else
  echo "[WARN] Docker nicht gefunden, postgres wird uebersprungen."
fi

echo "[INFO] Starte Backend, Frontend und Mobile in separaten Prozessen..."
"$ROOT_DIR/scripts/start_backend.sh" &
BACK_PID=$!
"$ROOT_DIR/scripts/start_frontend.sh" &
FRONT_PID=$!
"$ROOT_DIR/scripts/start_mobile.sh" &
MOBILE_PID=$!

echo "Backend PID: $BACK_PID"
echo "Frontend PID: $FRONT_PID"
echo "Mobile PID: $MOBILE_PID"
echo "Beenden mit: kill $BACK_PID $FRONT_PID $MOBILE_PID"

wait
