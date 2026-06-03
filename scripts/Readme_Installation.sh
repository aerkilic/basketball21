#!/usr/bin/env bash
# Readme_Installation.sh
#
# Verwendung:
#   ./scripts/install.sh
#   ./scripts/install.sh --IEnvFile ~/Documents/daten/backend.env ~/Documents/daten/mobile.env
#   ./scripts/install.sh --IEnvFile ./backend.env --IEnvFile ./mobile.env
#   ./scripts/install.sh --IEnvFile "./env/*.env"
#
# Ziel-Mapping fuer --IEnvFile:
#   root      -> .env
#   backend   -> backend/.env
#   frontend  -> frontend/.env
#   mobile    -> mobile/.env
#   deploy    -> deploy/app.env
