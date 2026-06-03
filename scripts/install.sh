#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IENV_FILES=()

usage() {
  cat <<'EOF'
Usage:
  ./scripts/install.sh [--IEnvFile <path-or-glob> [more-paths...]]...

Examples:
  ./scripts/install.sh
  ./scripts/install.sh --IEnvFile ~/Documents/daten/backend.env ~/Documents/daten/mobile.env
  ./scripts/install.sh --IEnvFile ./backend.env --IEnvFile ./mobile.env
  ./scripts/install.sh --IEnvFile "./env/*.env"
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --IEnvFile)
      shift
      if [[ $# -eq 0 ]]; then
        echo "[ERROR] --IEnvFile benoetigt einen Pfad."
        exit 2
      fi
      if [[ "$1" == -* ]]; then
        echo "[ERROR] --IEnvFile benoetigt mindestens einen Dateipfad."
        exit 2
      fi
      while [[ $# -gt 0 && "$1" != --* ]]; do
        IENV_FILES+=("$1")
        shift
      done
      continue
      ;;
    --IEnvFile=*)
      value="${1#*=}"
      if [[ -z "$value" ]]; then
        echo "[ERROR] --IEnvFile= darf nicht leer sein."
        exit 2
      fi
      IENV_FILES+=("$value")
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] Unbekanntes Argument: $1"
      usage
      exit 2
      ;;
  esac
  shift
done

check_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERROR] $cmd ist nicht installiert."
    exit 1
  fi
}

echo "[1/8] Pruefe Abhaengigkeiten..."
check_cmd python3
check_cmd node
check_cmd npm
if command -v docker >/dev/null 2>&1; then
  echo "[INFO] Docker gefunden."
else
  echo "[WARN] Docker nicht gefunden (optional)."
fi

echo "[2/8] Erzeuge .env Dateien falls noetig..."
[ -f "$ROOT_DIR/.env" ] || cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
[ -f "$ROOT_DIR/backend/.env" ] || cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
[ -f "$ROOT_DIR/frontend/.env" ] || cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env"
[ -f "$ROOT_DIR/mobile/.env" ] || cp "$ROOT_DIR/mobile/.env.example" "$ROOT_DIR/mobile/.env"
[ -f "$ROOT_DIR/deploy/app.env" ] || cp "$ROOT_DIR/deploy/app.env.example" "$ROOT_DIR/deploy/app.env"

if [ "${#IENV_FILES[@]}" -gt 0 ]; then
  echo "[3/8] Merge von --IEnvFile Dateien..."
  merge_cmd=(python3 "$ROOT_DIR/scripts/apply_env_inputs.py" --root "$ROOT_DIR")
  for env_file in "${IENV_FILES[@]}"; do
    merge_cmd+=(--ienvfile "$env_file")
  done
  "${merge_cmd[@]}"
else
  echo "[3/8] Kein --IEnvFile uebergeben, Env-Merge wird uebersprungen."
fi

echo "[4/8] Backend venv + dependencies..."
cd "$ROOT_DIR/backend"
PYBIN=""
for cand in python3.13 python3.12 python3.11 python3.10 python3 python; do
  if command -v "$cand" >/dev/null 2>&1; then
    ver=$("$cand" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || echo "")
    major=${ver%%.*}; minor=${ver##*.}
    if [ -n "$ver" ] && [ "$major" = "3" ] && [ "$minor" -ge 10 ] 2>/dev/null; then
      PYBIN="$cand"; break
    fi
  fi
done
if [ -z "$PYBIN" ]; then
  echo "[FEHLER] Keine geeignete Python-Version (>=3.10) gefunden. Bitte installieren (z.B. brew install python@3.13)."; exit 1
fi
echo "  -> verwende $PYBIN ($($PYBIN --version 2>&1))"
VENV_DIR=".venv"
if [ -d "$VENV_DIR" ] && [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "  -> entferne kaputtes $VENV_DIR"
  rm -rf "$VENV_DIR"
fi
if [ ! -d "$VENV_DIR" ]; then
  "$PYBIN" -m venv "$VENV_DIR"
fi
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "[FEHLER] venv konnte nicht erstellt werden ($VENV_DIR/bin/python fehlt)."; exit 1
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo "[5/8] Frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install --include=dev

echo "[6/8] Mobile dependencies..."
cd "$ROOT_DIR/mobile"
npm install --include=dev

echo "[7/8] Optional checks..."
python3 "$ROOT_DIR/scripts/check_env.py" || true

echo "[8/8] Fertig."
echo "Backend starten:   ./scripts/start_backend.sh"
echo "Frontend starten:  ./scripts/start_frontend.sh"
echo "Mobile starten:    ./scripts/start_mobile.sh"
