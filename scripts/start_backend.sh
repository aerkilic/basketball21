#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [ ! -f .env ]; then
  cp .env.example .env
fi

resolve_local_ip() {
  local local_ip=""
  local default_iface=""
  # macOS: Default-Route Interface (nur en* akzeptieren, sonst landet man auf utun/VPN)
  if command -v route >/dev/null 2>&1; then
    default_iface="$(route get default 2>/dev/null | awk '/interface:/{print $2; exit}' || true)"
  fi
  case "$default_iface" in
    en*) ;;
    *) default_iface="" ;;
  esac
  if [ -n "$default_iface" ] && command -v ipconfig >/dev/null 2>&1; then
    local_ip="$(ipconfig getifaddr "$default_iface" 2>/dev/null || true)"
  fi
  # macOS: en0..en5 durchprobieren
  if [ -z "$local_ip" ] && command -v ipconfig >/dev/null 2>&1; then
    for iface in en0 en1 en2 en3 en4 en5; do
      local_ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
      if [ -n "$local_ip" ]; then
        break
      fi
    done
  fi
  # Linux/macOS-Fallback: nur RFC1918 aus physischen Interfaces (en/eth/wlan/wlp/enp), kein utun/docker/bridge
  if [ -z "$local_ip" ] && command -v ifconfig >/dev/null 2>&1; then
    local_ip="$(ifconfig 2>/dev/null | awk '
      /^[a-zA-Z]/ { iface=$1; sub(/:$/,"",iface) }
      /inet / {
        ip=$2
        if (iface ~ /^(en|eth|wlan|wlp|enp)/ &&
            (ip ~ /^192\.168\./ || ip ~ /^10\./ ||
             ip ~ /^172\.(1[6-9]|2[0-9]|3[01])\./)) {
          print ip; exit
        }
      }' || true)"
  fi
  # Linux mit iproute2
  if [ -z "$local_ip" ] && command -v ip >/dev/null 2>&1; then
    local_ip="$(ip -4 -o addr show scope global 2>/dev/null \
      | awk '$2 ~ /^(en|eth|wlan|wlp|enp)/ {split($4,a,"/"); print a[1]; exit}' || true)"
  fi
  if [ -z "$local_ip" ] && command -v hostname >/dev/null 2>&1; then
    local_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  printf '%s' "$local_ip"
}

resolve_backend_allowed_hosts() {
  local configured
  configured="$(grep -E '^DJANGO_ALLOWED_HOSTS=' .env | tail -n1 | cut -d= -f2- || true)"
  configured="$(printf '%s' "$configured" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  if [ -z "$configured" ]; then
    configured="localhost,127.0.0.1"
  fi
  if echo "$configured" | grep -q '\*'; then
    echo "$configured"
    return
  fi

  local local_ip=""
  local_ip="$(resolve_local_ip)"

  if [ -n "$local_ip" ] && ! echo ",$configured," | grep -q ",$local_ip,"; then
    configured="$configured,$local_ip"
  fi
  echo "$configured"
}

export DJANGO_ALLOWED_HOSTS="$(resolve_backend_allowed_hosts)"
echo "[INFO] DJANGO_ALLOWED_HOSTS=$DJANGO_ALLOWED_HOSTS"

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
  echo "[FEHLER] Keine geeignete Python-Version (>=3.10) gefunden. Bitte installieren (z.B. brew install python@3.13)." >&2; exit 1
fi
VENV_DIR=".venv"
if [ -d "$VENV_DIR" ] && [ ! -x "$VENV_DIR/bin/python" ]; then
  rm -rf "$VENV_DIR"
fi
if [ ! -d "$VENV_DIR" ]; then
  "$PYBIN" -m venv "$VENV_DIR"
fi
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "[FEHLER] venv konnte nicht erstellt werden ($VENV_DIR/bin/python fehlt)." >&2; exit 1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install -r requirements.txt
python manage.py ensure_database
python manage.py migrate
python manage.py ensure_superuser
python manage.py runserver 0.0.0.0:8000
