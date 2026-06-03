        # basketball21

        ## 1. Was ist dieses Projekt?
        Dieses Repository ist eine generische Fullstack/Mobile/DevOps-Projekthuelle auf Basis von Django, React (Vite), Expo und optional PostgreSQL via Docker.

        ## 2. Ordnerstruktur
        ```text
        PROJECT_NAME/
|-- backend/
|-- frontend/
|-- mobile/
|-- marketing/
|-- assets/
|-- deploy/
|-- scripts/
|-- .vscode/
|-- .env.example
|-- deploy/app.env.example
|-- .dockerignore
|-- deploy/docker-compose.yml
|-- Jenkinsfile
|-- Jenkinsfile.mobile_expo
|-- Jenkinsfile.mobile.submit-android
|-- Jenkinsfile.mobile.submit-ios
|-- PLAYSTORE_TESTING_GUIDE.md
|-- README.md
|-- CHANGELOG.md
        ```

        ## 3. Voraussetzungen
        - Python 3.11+
        - Node.js 20+
        - npm 10+
        - Docker + Docker Compose (optional)

        ## 4. Installation macOS/Linux
        ```bash
        chmod +x scripts/install.sh
        ./scripts/install.sh
        # Optional: eigene env-Dateien einspielen
        ./scripts/install.sh --IEnvFile ./backend.env --IEnvFile ./frontend.env
        ```

        ## 5. Installation Windows
        Starte CMD und fuehre aus:
        ```bat
        .\scripts\install.bat
        REM Optional: eigene env-Dateien einspielen
        .\scripts\install.bat --IEnvFile .ackend.env --IEnvFile .\mobile.env
        ```

        ## 6. Backend starten
        ```bash
        ./scripts/start_backend.sh
        ```
        Login-Template:
        - Anmelden mit E-Mail + Passwort ueber `POST /api/auth/login/`
        - Registrieren mit E-Mail + Passwort ueber `POST /api/auth/register/`
        - Standard-Werte kommen aus `backend/.env` (`SUPERUSER_EMAIL`, `SUPERUSER_PASSWORD`)
        - Optional Google-Login ueber `GET /api/auth/google/start/` (benoetigt Google OAuth Variablen in `backend/.env`)
        - Ein `401` bei `/api/auth/login/` bedeutet: kein passender Account oder falsches Passwort.
          Pruefe `SUPERUSER_EMAIL`/`SUPERUSER_PASSWORD` und fuehre danach
          `python manage.py ensure_superuser` im Backend erneut aus.

        ## 7. Frontend starten
        ```bash
        ./scripts/start_frontend.sh
        ```

        ## 8. Mobile App starten
        ```bash
        ./scripts/start_mobile_tunnel.sh
        ```
        Alternative (ohne Tunnel, eher fuer Emulator/LAN):
        ```bash
        ./scripts/start_mobile.sh
        ```
        Hinweis: Fuer Login in Expo Go muss das Handy den Backend-Host unter `EXPO_PUBLIC_API_BASE_URL`
        erreichen koennen (gleiches WLAN/LAN oder oeffentlich erreichbare URL).

        ## 9. PostgreSQL mit Docker starten
        ```bash
        docker compose -f deploy/docker-compose.yml up -d postgres
        ```

        ## 10. Env-Dateien
        Es werden nur `.env.example` und `deploy/app.env.example` erzeugt. Kopiere sie lokal nach `.env` bzw. `deploy/app.env` und passe Werte an.
        Mit `--IEnvFile` koennen eigene `*.env` Dateien nach der Installation automatisch in die passenden Ziele gemerged werden:
        - root: `.env`
        - backend: `backend/.env`
        - frontend: `frontend/.env`
        - mobile: `mobile/.env`
        - deploy/app: `deploy/app.env`
        Frontend Theme-Optionen in `frontend/.env`:
        - `VITE_ENABLE_THEME_TOGGLE=true|false`
        - `VITE_DEFAULT_THEME=system|light|dark`

        ## 11. Jenkins-Parameter
        Siehe `Jenkinsfile` fuers generatorische Setup mit `DRY_RUN` und Feature-Flags.

        ## 12. Git-Initialisierung
        Optional ueber Generator-Flag `--init-git true`.

        ## 13. VS Code Debugging
        Siehe `.vscode/launch.json` und `.vscode/tasks.json`.

        ## 14. Mobile CI/CD (Expo)
        - `Jenkinsfile.mobile_expo` fuer EAS Builds
        - `Jenkinsfile.mobile.submit-android` fuer Android Submit
        - `Jenkinsfile.mobile.submit-ios` fuer iOS Submit
        - Basis-Konfiguration in `mobile/eas.json`

        ## 15. Marketing-Seite
        Statische Seiten liegen unter `marketing/`.
        Wichtige Vorlagen:
        - `marketing/support.html`
        - `marketing/datenschutz.html`
        - `marketing/impressum.html`
        - `marketing/kontakt.html`
        - `marketing/terms.html`

        ## 16. Datenschutz/Impressum Hinweis
        Die Rechtsseiten sind Vorlagen. Bitte vor Veroeffentlichung rechtlich pruefen lassen.

        ## 17. Assets und intro.mp4
        Intro-Video ist als Platzhalter vorbereitet. Wenn kein echtes Video vorhanden ist, README-Hinweise verwenden.
