#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/mobile"

if [ ! -f .env ]; then
  cp .env.example .env
fi

resolve_local_ip() {
  local local_ip=""
  local default_iface=""
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
  if [ -z "$local_ip" ] && command -v ipconfig >/dev/null 2>&1; then
    for iface in en0 en1 en2 en3 en4 en5; do
      local_ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
      if [ -n "$local_ip" ]; then
        break
      fi
    done
  fi
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
  if [ -z "$local_ip" ] && command -v ip >/dev/null 2>&1; then
    local_ip="$(ip -4 -o addr show scope global 2>/dev/null \
      | awk '$2 ~ /^(en|eth|wlan|wlp|enp)/ {split($4,a,"/"); print a[1]; exit}' || true)"
  fi
  if [ -z "$local_ip" ] && command -v hostname >/dev/null 2>&1; then
    local_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  printf '%s' "$local_ip"
}

resolve_api_base_url() {
  local configured
  configured="$(grep -E '^EXPO_PUBLIC_API_BASE_URL=' .env | tail -n1 | cut -d= -f2- || true)"
  configured="$(printf '%s' "$configured" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"

  if [ -n "$configured" ] && [ "$configured" != "auto" ]; then
    echo "$configured"
    return
  fi

  local local_ip=""
  local_ip="$(resolve_local_ip)"

  if [ -n "$local_ip" ]; then
    echo "http://${local_ip}:8000"
    return
  fi
  echo "http://localhost:8000"
}

API_BASE_URL="$(resolve_api_base_url)"
export EXPO_PUBLIC_API_BASE_URL="$API_BASE_URL"
echo "[INFO] EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL"

# .env.local schreiben: Expo Metro inlined dann garantiert die aktuelle URL.
{
  echo "# Auto-generiert von start_mobile_tunnel.sh bei jedem Start - nicht von Hand editieren."
  echo "EXPO_PUBLIC_API_BASE_URL=$API_BASE_URL"
} > .env.local
echo "[INFO] mobile/.env.local aktualisiert."

if echo "$EXPO_PUBLIC_API_BASE_URL" | grep -E '^https?://(localhost|127\.0\.0\.1)(:|/|$)' >/dev/null 2>&1; then
  echo "[HINWEIS] localhost zeigt in Expo Go auf das Handy selbst."
  echo "         Setze in mobile/.env EXPO_PUBLIC_API_BASE_URL auf eine LAN-Adresse (z. B. http://192.168.x.x:8000)."
fi
if command -v curl >/dev/null 2>&1; then
  if ! curl -fsS "$EXPO_PUBLIC_API_BASE_URL/api/health/" >/dev/null 2>&1; then
    echo "[WARN] Backend unter $EXPO_PUBLIC_API_BASE_URL nicht erreichbar. Starte ggf. ./scripts/start_backend.sh"
  fi
fi

npm install --include=dev
npx expo install --check || true

# Bundle-Cache invalidieren - sonst haelt Metro alte EXPO_PUBLIC_*-Werte fest.
echo "[INFO] Bundle-Cache aufraeumen (.expo, node_modules/.cache, watchman) ..."
rm -rf .expo node_modules/.cache 2>/dev/null || true
if command -v watchman >/dev/null 2>&1; then
  watchman watch-del-all >/dev/null 2>&1 || true
fi

npx expo start --tunnel --clear
