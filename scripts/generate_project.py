#!/usr/bin/env python3
"""Generate a reusable fullstack/mobile/devops project template."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import textwrap
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path


PNG_PLACEHOLDER_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3ZfZ8AAAAASUVORK5CYII="
)


@dataclass(frozen=True)
class ProjectNames:
    project_name: str
    project_display_name: str
    project_slug: str
    python_package_name: str
    npm_package_name: str
    mobile_app_name: str
    database_name: str
    database_user: str
    docker_service_prefix: str
    backend_service_name: str
    frontend_service_name: str
    api_base_url: str
    bundle_identifier: str
    android_package_name: str


@dataclass
class Summary:
    created_dirs: list[str] = field(default_factory=list)
    created_files: list[str] = field(default_factory=list)
    skipped_dirs: list[str] = field(default_factory=list)
    skipped_files: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    git_initialized: bool = False


class Writer:
    def __init__(self, root: Path, dry_run: bool) -> None:
        self.root = root
        self.dry_run = dry_run
        self.summary = Summary()

    def _path(self, rel: str) -> Path:
        return self.root / rel

    def ensure_dir(self, rel: str) -> None:
        target = self._path(rel)
        if target.exists():
            self.summary.skipped_dirs.append(rel)
            return
        if self.dry_run:
            self.summary.created_dirs.append(f"{rel} (dry-run)")
            return
        target.mkdir(parents=True, exist_ok=True)
        self.summary.created_dirs.append(rel)

    def write_text(self, rel: str, content: str) -> None:
        target = self._path(rel)
        if target.exists():
            self.summary.skipped_files.append(rel)
            return
        if self.dry_run:
            self.summary.created_files.append(f"{rel} (dry-run)")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        self.summary.created_files.append(rel)

    def write_binary(self, rel: str, data: bytes) -> None:
        target = self._path(rel)
        if target.exists():
            self.summary.skipped_files.append(rel)
            return
        if self.dry_run:
            self.summary.created_files.append(f"{rel} (dry-run)")
            return
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        self.summary.created_files.append(rel)

    def maybe_git_init(self) -> None:
        if self.dry_run:
            self.summary.notes.append("DRY_RUN=true: git init skipped.")
            return
        if (self.root / ".git").exists():
            self.summary.notes.append("Git already initialized in target directory.")
            return
        subprocess.run(["git", "init", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "branch", "-M", "main"], check=False)
        self.summary.git_initialized = True


def parse_bool(raw: str) -> bool:
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "y", "on"}:
        return True
    if value in {"0", "false", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"Invalid bool value: {raw}")


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def slugify(value: str) -> str:
    ascii_only = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9]+", "-", ascii_only).strip("-").lower()
    slug = re.sub(r"-{2,}", "-", slug)
    return slug


def validate_project_name(value: str) -> str:
    display = normalize_spaces(value)
    if not display:
        raise ValueError("PROJECT_NAME must not be empty.")
    if len(display) < 2:
        raise ValueError("PROJECT_NAME must contain at least 2 characters.")
    if len(display) > 100:
        raise ValueError("PROJECT_NAME must not exceed 100 characters.")
    if not slugify(display):
        raise ValueError("PROJECT_NAME must contain letters or numbers.")
    return display


def derive_names(project_name: str) -> ProjectNames:
    display = validate_project_name(project_name)
    slug = slugify(display)

    python_name = slug.replace("-", "_")
    if not re.match(r"^[a-z_]", python_name):
        python_name = f"app_{python_name}"

    npm_name = slug if re.match(r"^[a-z0-9]", slug) else f"app-{slug}"

    mobile_id = re.sub(r"[^a-z0-9]", "", slug)
    if not mobile_id:
        mobile_id = "app"
    if re.match(r"^[0-9]", mobile_id):
        mobile_id = f"app{mobile_id}"

    return ProjectNames(
        project_name=display,
        project_display_name=display,
        project_slug=slug,
        python_package_name=python_name,
        npm_package_name=npm_name,
        mobile_app_name=f"{slug}-mobile",
        database_name=f"{python_name}_db",
        database_user=f"{python_name}_user",
        docker_service_prefix=python_name,
        backend_service_name=f"{slug}-backend",
        frontend_service_name=f"{slug}-frontend",
        api_base_url="http://localhost:8000",
        bundle_identifier=f"com.example.{mobile_id}",
        android_package_name=f"com.example.{mobile_id}",
    )


def root_env_example(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        PROJECT_NAME={names.project_name}
        PROJECT_DISPLAY_NAME={names.project_display_name}
        PROJECT_SLUG={names.project_slug}
        PYTHON_PACKAGE_NAME={names.python_package_name}
        NPM_PACKAGE_NAME={names.npm_package_name}
        MOBILE_APP_NAME={names.mobile_app_name}

        BACKEND_PORT=8000
        FRONTEND_PORT=5173
        MOBILE_PORT=8081

        API_BASE_URL={names.api_base_url}
        BUNDLE_IDENTIFIER={names.bundle_identifier}
        ANDROID_PACKAGE_NAME={names.android_package_name}

        BACKEND_SERVICE_NAME={names.backend_service_name}
        FRONTEND_SERVICE_NAME={names.frontend_service_name}
        DOCKER_SERVICE_PREFIX={names.docker_service_prefix}

        """
    )


def app_env_example(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        APP_IMAGE_NAME={names.project_slug}-app
        APP_IMAGE_TAG=latest
        APP_CONTAINER_NAME={names.project_slug}-app
        APP_HOST_PORT=8000

        APP_VERSION=v1.0.0
        BUILD_TIME_BERLIN=auto

        DEBUG=False
        SECRET_KEY=change-me-in-production

        DB_NAME={names.database_name}
        DB_USER={names.database_user}
        DB_PASSWORD=change-me
        DB_HOST=host.docker.internal
        DB_PORT=5432

        # Run initial seed/schedule import at container startup.
        # Set to true only for first boot or explicit reseed.
        RUN_SEED_ON_START=false
        """
    )


def backend_env_example(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        PROJECT_NAME={names.project_name}
        PROJECT_DISPLAY_NAME={names.project_display_name}
        PROJECT_SLUG={names.project_slug}

        DJANGO_SECRET_KEY=change-me
        DJANGO_DEBUG=true
        DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
        CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000

        POSTGRES_DB={names.database_name}
        POSTGRES_USER={names.database_user}
        POSTGRES_PASSWORD=change-me
        POSTGRES_HOST=localhost
        POSTGRES_PORT=5432
        # Admin-Credentials zum Anlegen von DB+Rolle (ensure_database).
        # Leer lassen = OS-User via peer auth (Homebrew-Default auf Mac).
        POSTGRES_ADMIN_USER=
        POSTGRES_ADMIN_PASSWORD=
        AUTO_CREATE_DATABASE=true

        CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081

        # Optional Google OAuth (for login template)
        GOOGLE_OAUTH_CLIENT_ID=
        GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/google/callback
        GOOGLE_OAUTH_STATE=change-me-state

        # Optional: if empty, username is derived from SUPERUSER_EMAIL (before '@').
        SUPERUSER_NAME=admin
        SUPERUSER_EMAIL=admin@example.com
        SUPERUSER_PASSWORD=change-me-now
        AUTO_CREATE_SUPERUSER=true
        """
    )


def frontend_env_example(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        VITE_PROJECT_NAME={names.project_display_name}
        VITE_API_BASE_URL={names.api_base_url}
        VITE_ENABLE_GOOGLE_LOGIN=true
        VITE_ENABLE_THEME_TOGGLE=true
        VITE_DEFAULT_THEME=system
        """
    )


def mobile_env_example(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        EXPO_PUBLIC_PROJECT_NAME={names.project_display_name}
        EXPO_PUBLIC_API_BASE_URL=auto
        EXPO_PUBLIC_ENABLE_THEME_TOGGLE=true
        EXPO_PUBLIC_DEFAULT_THEME=system
        """
    )


def gitignore_content() -> str:
    return textwrap.dedent(
        """\
        # Python
        __pycache__/
        *.pyc
        .venv/
        venv/
        .env
        .env.local

        # Django
        backend/staticfiles/
        backend/media/
        backend/db.sqlite3

        # Node
        node_modules/
        dist/
        build/
        .expo/
        .expo-shared/

        # Mobile
        mobile/.expo/
        mobile/.env.local
        mobile/android/
        mobile/ios/

        # OS
        .DS_Store
        Thumbs.db

        # IDE
        .vscode/*
        !.vscode/launch.json
        !.vscode/tasks.json
        !.vscode/settings.json

        # Secrets
        *.pem
        *.key
        *.p8
        .env.local
        .env.production
        """
    )


def dockerignore_content() -> str:
    return textwrap.dedent(
        """\
        .git
        .gitignore
        **/__pycache__/
        **/*.pyc
        **/*.pyo
        **/*.pyd
        **/.pytest_cache/
        **/.mypy_cache/
        **/node_modules/
        backend/venv/
        mobile/node_modules/
        frontend/node_modules/
        .env
        deploy/app.env
        backend/.env
        README_TEST.md
        """
    )


def changelog_content() -> str:
    return textwrap.dedent(
        """\
        # Changelog

        All notable changes to this template project should be documented in this file.

        ## [0.1.0] - Initial
        - Initial generic template generation
        """
    )


def playstore_testing_guide(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        # Play Store Testing Guide

        Stand: 2026-05-30

        Diese Anleitung beschreibt den Android-Test- und Release-Weg fuer das Projekt
        **{names.project_display_name}** mit Expo/EAS und Google Play.

        ## 1. Projektwerte pruefen

        Relevante Dateien:
        - `mobile/app.json`
        - `mobile/eas.json`
        - `mobile/.env`

        Typische Zielwerte:
        - Android Package Name: `{names.android_package_name}`
        - iOS Bundle Identifier: `{names.bundle_identifier}`

        ## 2. Lokales Expo-Testen (schnell)

        ```bash
        cd mobile
        npm install --include=dev
        npx expo install --check
        npm run local:expo
        ```

        Danach QR-Code mit Expo Go scannen.

        ## 3. EAS Preview Build (APK fuer interne Tests)

        ```bash
        cd mobile
        npx --yes eas-cli login
        npx --yes eas-cli build --platform android --profile preview
        ```

        Ergebnis:
        - installierbares APK fuer interne Verteilung
        - Build-Link kann direkt an Tester gesendet werden

        ## 4. EAS Production Build (AAB fuer Google Play)

        ```bash
        cd mobile
        npx --yes eas-cli build --platform android --profile production
        ```

        Ergebnis:
        - `.aab` fuer Google Play Console
        - nicht direkt auf Geraet installierbar

        ## 5. Submit nach Google Play via Jenkins

        Verwende die Pipeline:
        - `Jenkinsfile.mobile.submit-android`

        Voraussetzungen in Jenkins:
        - Secret Text Credential fuer Expo Token (z. B. `EXPO_TOKEN`)
        - Secret File Credential fuer Google Play Service Account JSON
        - Parameter `EAS_PROFILE` passend zu `mobile/eas.json` (Default `production`)

        Wichtig:
        - In `mobile/eas.json` muss `submit.<profile>.android.serviceAccountKeyPath`
          auf `./.secrets/google-service-account.json` zeigen.

        ## 6. Tests in Google Play Console

        Empfohlene Reihenfolge:
        1. Internal Testing
        2. Closed Testing
        3. Open Testing (optional)
        4. Production Release

        ## 7. Fehlerbilder (Kurzcheck)

        - `EXPO_TOKEN is missing`:
          Jenkins Credential fehlt oder ist leer.
        - `Missing Android submit profile`:
          Profil in `mobile/eas.json` fehlt.
        - `Unexpected serviceAccountKeyPath`:
          `serviceAccountKeyPath` in `mobile/eas.json` korrigieren.
        - Build-Link oeffnet, Installation scheitert:
          Android erlaubt ggf. keine Installation aus unbekannter Quelle.
        """
    )


def root_readme(names: ProjectNames) -> str:
    structure_block = textwrap.dedent(
        """\
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
        """
    )
    return textwrap.dedent(
        f"""\
        # {names.project_display_name}

        ## 1. Was ist dieses Projekt?
        Dieses Repository ist eine generische Fullstack/Mobile/DevOps-Projekthuelle auf Basis von Django, React (Vite), Expo und optional PostgreSQL via Docker.

        ## 2. Ordnerstruktur
        ```text
        {structure_block.rstrip()}
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
        .\scripts\install.bat --IEnvFile .\backend.env --IEnvFile .\mobile.env
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
        """
    )


def docker_compose_content() -> str:
    return textwrap.dedent(
        """\
        services:
          postgres:
            image: postgres:16-alpine
            container_name: ${DOCKER_SERVICE_PREFIX:-project}_postgres
            env_file:
              - ../backend/.env
            ports:
              - "${POSTGRES_PORT:-5432}:5432"
            volumes:
              - postgres_data:/var/lib/postgresql/data

          backend:
            profiles: ["backend"]
            build:
              context: ..
              dockerfile: deploy/Dockerfile
            container_name: ${BACKEND_SERVICE_NAME:-project-backend}
            env_file:
              - ../backend/.env
            environment:
              POSTGRES_HOST: postgres
            ports:
              - "${BACKEND_PORT:-8000}:8000"
            depends_on:
              - postgres

        volumes:
          postgres_data:
        """
    )


def docker_readme() -> str:
    return textwrap.dedent(
        """\
        # Deploy

        Dieser Ordner enthaelt Deployment- und Docker-bezogene Dateien fuer das Template.
        """
    )


def dockerfile_backend() -> str:
    return textwrap.dedent(
        """\
        FROM python:3.12-slim

        WORKDIR /app/backend

        COPY backend/requirements.txt /tmp/requirements.txt
        RUN pip install --no-cache-dir -r /tmp/requirements.txt

        COPY backend /app/backend

        EXPOSE 8000
        CMD ["sh", "-c", "python manage.py ensure_database && python manage.py migrate && python manage.py ensure_superuser && python manage.py runserver 0.0.0.0:8000"]
        """
    )


def backend_requirements() -> str:
    return textwrap.dedent(
        """\
        Django==5.2.1
        djangorestframework==3.15.2
        django-cors-headers==4.4.0
        psycopg2-binary==2.9.10
        python-dotenv==1.1.0
        """
    )


def backend_manage_py() -> str:
    return textwrap.dedent(
        """\
        #!/usr/bin/env python
        import os
        import sys


        def main() -> None:
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
            from django.core.management import execute_from_command_line

            execute_from_command_line(sys.argv)


        if __name__ == "__main__":
            main()
        """
    )


def backend_settings(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        from pathlib import Path
        import os

        from dotenv import load_dotenv

        BASE_DIR = Path(__file__).resolve().parent.parent
        load_dotenv(BASE_DIR / ".env")


        def env_bool(name: str, default: bool = False) -> bool:
            value = os.getenv(name)
            if value is None:
                return default
            return value.strip().lower() in {{"1", "true", "yes", "on"}}


        def env_list(name: str, default: str = "") -> list[str]:
            raw = os.getenv(name, default)
            return [item.strip() for item in raw.split(",") if item.strip()]


        SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me")
        DEBUG = env_bool("DJANGO_DEBUG", True)
        ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
        CSRF_TRUSTED_ORIGINS = env_list(
            "CSRF_TRUSTED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000",
        )
        PROJECT_NAME = os.getenv("PROJECT_NAME", "{names.project_name}")

        INSTALLED_APPS = [
            "django.contrib.admin",
            "django.contrib.auth",
            "django.contrib.contenttypes",
            "django.contrib.sessions",
            "django.contrib.messages",
            "django.contrib.staticfiles",
            "corsheaders",
            "rest_framework",
            "core.apps.CoreConfig",
        ]

        MIDDLEWARE = [
            "django.middleware.security.SecurityMiddleware",
            "django.contrib.sessions.middleware.SessionMiddleware",
            "corsheaders.middleware.CorsMiddleware",
            "django.middleware.common.CommonMiddleware",
            "django.middleware.csrf.CsrfViewMiddleware",
            "django.contrib.auth.middleware.AuthenticationMiddleware",
            "django.contrib.messages.middleware.MessageMiddleware",
            "django.middleware.clickjacking.XFrameOptionsMiddleware",
        ]

        ROOT_URLCONF = "config.urls"

        TEMPLATES = [
            {{
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [],
                "APP_DIRS": True,
                "OPTIONS": {{
                    "context_processors": [
                        "django.template.context_processors.request",
                        "django.contrib.auth.context_processors.auth",
                        "django.contrib.messages.context_processors.messages",
                    ],
                }},
            }}
        ]

        WSGI_APPLICATION = "config.wsgi.application"
        ASGI_APPLICATION = "config.asgi.application"

        DATABASES = {{
            "default": {{
                "ENGINE": "django.db.backends.postgresql",
                "NAME": os.getenv("POSTGRES_DB", "{names.database_name}"),
                "USER": os.getenv("POSTGRES_USER", "{names.database_user}"),
                "PASSWORD": os.getenv("POSTGRES_PASSWORD", "change-me"),
                "HOST": os.getenv("POSTGRES_HOST", "localhost"),
                "PORT": os.getenv("POSTGRES_PORT", "5432"),
            }}
        }}

        AUTH_PASSWORD_VALIDATORS = [
            {{"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"}},
            {{"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"}},
            {{"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"}},
            {{"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"}},
        ]

        LANGUAGE_CODE = "en-us"
        TIME_ZONE = "UTC"
        USE_I18N = True
        USE_TZ = True

        STATIC_URL = "static/"
        STATIC_ROOT = BASE_DIR / "staticfiles"

        DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

        REST_FRAMEWORK = {{
            "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
            "DEFAULT_AUTHENTICATION_CLASSES": [],
        }}

        CORS_ALLOWED_ORIGINS = env_list(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081",
        )
        """
    )


def backend_urls() -> str:
    return textwrap.dedent(
        """\
        from django.contrib import admin
        from django.urls import include, path

        urlpatterns = [
            path("admin/", admin.site.urls),
            path("api/", include("core.urls")),
        ]
        """
    )


def backend_wsgi() -> str:
    return textwrap.dedent(
        """\
        import os

        from django.core.wsgi import get_wsgi_application

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

        application = get_wsgi_application()
        """
    )


def backend_asgi() -> str:
    return textwrap.dedent(
        """\
        import os

        from django.core.asgi import get_asgi_application

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

        application = get_asgi_application()
        """
    )


def backend_core_apps() -> str:
    return textwrap.dedent(
        """\
        from django.apps import AppConfig


        class CoreConfig(AppConfig):
            default_auto_field = "django.db.models.BigAutoField"
            name = "core"

            def ready(self):
                from .bootstrap_superuser import ensure_superuser_from_env

                ensure_superuser_from_env()
        """
    )


def backend_core_bootstrap_superuser() -> str:
    return textwrap.dedent(
        """\
        import os
        import re

        from django.contrib.auth import get_user_model
        from django.db import OperationalError, ProgrammingError


        def env_bool(name: str, default: bool = True) -> bool:
            value = os.getenv(name)
            if value is None:
                return default
            return value.strip().lower() in {"1", "true", "yes", "on"}


        def normalize_username(raw_username: str, email: str) -> str:
            username = (raw_username or "").strip().lower()
            if username:
                return username
            local_part = (email or "").split("@", 1)[0].strip().lower()
            candidate = re.sub(r"[^a-z0-9_]+", "", local_part)
            return candidate or "admin"


        def ensure_superuser_from_env() -> None:
            if not env_bool("AUTO_CREATE_SUPERUSER", True):
                return

            email = (os.getenv("SUPERUSER_EMAIL") or "").strip().lower()
            username = normalize_username(os.getenv("SUPERUSER_NAME") or "", email)
            password = os.getenv("SUPERUSER_PASSWORD") or ""
            if not password:
                return

            user_model = get_user_model()
            try:
                user = user_model.objects.filter(email__iexact=email).first() if email else None
                if not user:
                    user = user_model.objects.filter(username__iexact=username).first()

                if user:
                    changed = False
                    if email and (user.email or "").lower() != email:
                        user.email = email
                        changed = True
                    if (user.username or "").lower() != username:
                        username_taken = (
                            user_model.objects.filter(username__iexact=username).exclude(pk=user.pk).exists()
                        )
                        if not username_taken:
                            user.username = username
                            changed = True
                    if not user.is_staff:
                        user.is_staff = True
                        changed = True
                    if not user.is_superuser:
                        user.is_superuser = True
                        changed = True
                    if not user.check_password(password):
                        user.set_password(password)
                        changed = True
                    if changed:
                        user.save()
                    return

                user_model.objects.create_superuser(username=username, email=email, password=password)
            except (OperationalError, ProgrammingError):
                # DB not ready yet (e.g. before migrations) -> skip.
                return
        """
    )


def backend_core_views() -> str:
    return textwrap.dedent(
        """\
        import os
        import re
        from urllib.parse import urlencode

        from django.conf import settings
        from django.contrib.auth import authenticate, get_user_model
        from django.core.exceptions import ValidationError
        from django.core.validators import validate_email
        from rest_framework import status
        from rest_framework.decorators import api_view
        from rest_framework.response import Response


        @api_view(["GET"])
        def health_view(_request):
            return Response(
                {
                    "status": "ok",
                    "project": settings.PROJECT_NAME,
                    "backend": "running",
                }
            )


        @api_view(["POST"])
        def login_view(request):
            email = str(request.data.get("email") or request.data.get("login") or "").strip()
            password = str(request.data.get("password", ""))
            if not email or not password:
                return Response(
                    {"detail": "email (or login) and password are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user_model = get_user_model()
            user = user_model.objects.filter(email__iexact=email).first()
            if not user and "@" not in email:
                user = user_model.objects.filter(username__iexact=email).first()
            if not user:
                return Response(
                    {
                        "detail": (
                            "No account found for this email/login. "
                            "Check backend/.env SUPERUSER_EMAIL and run: "
                            "python manage.py ensure_superuser"
                        )
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            auth_user = authenticate(request, username=user.get_username(), password=password)
            if not auth_user:
                return Response(
                    {
                        "detail": (
                            "Invalid password for this account. "
                            "If needed, update SUPERUSER_PASSWORD in backend/.env and run: "
                            "python manage.py ensure_superuser"
                        )
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            return Response(
                {
                    "status": "ok",
                    "user": {
                        "id": auth_user.id,
                        "email": auth_user.email,
                        "username": auth_user.get_username(),
                    },
                }
            )


        @api_view(["POST"])
        def register_view(request):
            email = str(request.data.get("email", "")).strip().lower()
            password = str(request.data.get("password", ""))
            confirm_password = str(request.data.get("confirm_password", ""))

            if not email or not password:
                return Response(
                    {"detail": "email and password are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if password != confirm_password:
                return Response(
                    {"detail": "password and confirm_password do not match."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(password) < 6:
                return Response(
                    {"detail": "password must contain at least 6 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                validate_email(email)
            except ValidationError:
                return Response({"detail": "invalid email format."}, status=status.HTTP_400_BAD_REQUEST)

            user_model = get_user_model()
            if user_model.objects.filter(email__iexact=email).exists():
                return Response({"detail": "email is already registered."}, status=status.HTTP_409_CONFLICT)

            local_part = email.split("@", 1)[0]
            base_username = re.sub(r"[^a-z0-9_]+", "", local_part) or "user"
            username = base_username
            suffix = 1
            while user_model.objects.filter(username__iexact=username).exists():
                suffix += 1
                username = f"{base_username}{suffix}"

            created_user = user_model.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
            return Response(
                {
                    "status": "created",
                    "user": {
                        "id": created_user.id,
                        "email": created_user.email,
                        "username": created_user.get_username(),
                    },
                },
                status=status.HTTP_201_CREATED,
            )


        @api_view(["GET"])
        def google_login_start_view(_request):
            client_id = str(os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")).strip()
            redirect_uri = str(os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")).strip()
            state = str(os.getenv("GOOGLE_OAUTH_STATE", "change-me-state")).strip()

            if not client_id or not redirect_uri:
                return Response(
                    {
                        "status": "not_configured",
                        "detail": (
                            "Google login is not configured. "
                            "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI in backend/.env."
                        ),
                    },
                    status=status.HTTP_501_NOT_IMPLEMENTED,
                )

            query = urlencode(
                {
                    "client_id": client_id,
                    "redirect_uri": redirect_uri,
                    "response_type": "code",
                    "scope": "openid email profile",
                    "access_type": "online",
                    "include_granted_scopes": "true",
                    "state": state,
                    "prompt": "select_account",
                }
            )
            auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
            return Response({"status": "ok", "auth_url": auth_url})
        """
    )


def backend_core_urls() -> str:
    return textwrap.dedent(
        """\
        from django.urls import path

        from .views import google_login_start_view, health_view, login_view, register_view

        urlpatterns = [
            path("health/", health_view, name="health"),
            path("auth/login/", login_view, name="auth-login"),
            path("auth/register/", register_view, name="auth-register"),
            path("auth/google/start/", google_login_start_view, name="auth-google-start"),
        ]
        """
    )


def backend_ensure_database_command() -> str:
    return textwrap.dedent(
        '''\
        import os
        import getpass

        import psycopg2
        from psycopg2 import sql
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        from django.core.management.base import BaseCommand, CommandError


        def env_bool(name: str, default: bool = True) -> bool:
            value = os.getenv(name)
            if value is None:
                return default
            return value.strip().lower() in {"1", "true", "yes", "on"}


        class Command(BaseCommand):
            help = "Create Postgres role and database from POSTGRES_* env vars if missing."

            def handle(self, *args, **options):
                if not env_bool("AUTO_CREATE_DATABASE", True):
                    self.stdout.write(self.style.WARNING("AUTO_CREATE_DATABASE=false. Skipping."))
                    return

                db_name = (os.getenv("POSTGRES_DB") or "").strip()
                db_user = (os.getenv("POSTGRES_USER") or "").strip()
                db_password = os.getenv("POSTGRES_PASSWORD") or ""
                host = (os.getenv("POSTGRES_HOST") or "localhost").strip()
                port = (os.getenv("POSTGRES_PORT") or "5432").strip()

                if not db_name or not db_user:
                    raise CommandError("POSTGRES_DB and POSTGRES_USER must be set.")

                admin_user = (os.getenv("POSTGRES_ADMIN_USER") or "").strip() or getpass.getuser()
                admin_password = os.getenv("POSTGRES_ADMIN_PASSWORD") or None

                conn_kwargs = {
                    "host": host,
                    "port": port,
                    "dbname": "postgres",
                    "user": admin_user,
                }
                if admin_password:
                    conn_kwargs["password"] = admin_password

                try:
                    conn = psycopg2.connect(**conn_kwargs)
                except psycopg2.Error as error:
                    raise CommandError(
                        f"Cannot connect to Postgres maintenance DB as '{admin_user}': {error}"
                    ) from error

                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (db_user,))
                        if cur.fetchone() is None:
                            cur.execute(
                                sql.SQL("CREATE USER {} WITH PASSWORD %s").format(
                                    sql.Identifier(db_user)
                                ),
                                (db_password,),
                            )
                            self.stdout.write(self.style.SUCCESS(f"Role '{db_user}' created."))
                        else:
                            cur.execute(
                                sql.SQL("ALTER USER {} WITH PASSWORD %s").format(
                                    sql.Identifier(db_user)
                                ),
                                (db_password,),
                            )
                            self.stdout.write(self.style.SUCCESS(f"Role '{db_user}' already exists (password synced)."))

                        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
                        if cur.fetchone() is None:
                            cur.execute(
                                sql.SQL("CREATE DATABASE {} OWNER {}").format(
                                    sql.Identifier(db_name),
                                    sql.Identifier(db_user),
                                )
                            )
                            self.stdout.write(self.style.SUCCESS(f"Database '{db_name}' created."))
                        else:
                            self.stdout.write(self.style.SUCCESS(f"Database '{db_name}' already exists."))

                        cur.execute(
                            sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}").format(
                                sql.Identifier(db_name),
                                sql.Identifier(db_user),
                            )
                        )
                finally:
                    conn.close()
        '''
    )


def backend_ensure_superuser_command() -> str:
    return textwrap.dedent(
        """\
        import os
        import re

        from django.contrib.auth import get_user_model
        from django.core.management.base import BaseCommand, CommandError
        from django.db import OperationalError, ProgrammingError


        def env_bool(name: str, default: bool = True) -> bool:
            value = os.getenv(name)
            if value is None:
                return default
            return value.strip().lower() in {"1", "true", "yes", "on"}


        def normalize_username(raw_username: str, email: str) -> str:
            username = (raw_username or "").strip().lower()
            if username:
                return username
            local_part = (email or "").split("@", 1)[0].strip().lower()
            candidate = re.sub(r"[^a-z0-9_]+", "", local_part)
            return candidate or "admin"


        class Command(BaseCommand):
            help = "Create or update superuser from SUPERUSER_* env vars."

            def handle(self, *args, **options):
                if not env_bool("AUTO_CREATE_SUPERUSER", True):
                    self.stdout.write(self.style.WARNING("AUTO_CREATE_SUPERUSER=false. Skipping."))
                    return

                email = (os.getenv("SUPERUSER_EMAIL") or "").strip().lower()
                username = normalize_username(os.getenv("SUPERUSER_NAME") or "", email)
                password = os.getenv("SUPERUSER_PASSWORD") or ""

                if not password:
                    self.stdout.write(
                        self.style.WARNING(
                            "SUPERUSER_PASSWORD missing. Skipping superuser creation."
                        )
                    )
                    return

                user_model = get_user_model()
                try:
                    user = user_model.objects.filter(email__iexact=email).first() if email else None
                    if not user:
                        user = user_model.objects.filter(username__iexact=username).first()

                    if user:
                        changed = False
                        if email and (user.email or "").lower() != email:
                            user.email = email
                            changed = True
                        if (user.username or "").lower() != username:
                            username_taken = (
                                user_model.objects.filter(username__iexact=username).exclude(pk=user.pk).exists()
                            )
                            if not username_taken:
                                user.username = username
                                changed = True
                        if not user.is_staff:
                            user.is_staff = True
                            changed = True
                        if not user.is_superuser:
                            user.is_superuser = True
                            changed = True
                        if not user.check_password(password):
                            user.set_password(password)
                            changed = True
                        if changed:
                            user.save()
                            self.stdout.write(self.style.SUCCESS(f"Superuser '{user.username}' updated from env."))
                        else:
                            self.stdout.write(self.style.SUCCESS(f"Superuser '{user.username}' already up to date."))
                        return

                    user_model.objects.create_superuser(username=username, email=email, password=password)
                except (OperationalError, ProgrammingError) as error:
                    raise CommandError(f"Database not ready for superuser creation: {error}") from error

                self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created."))
        """
    )


def frontend_package_json(names: ProjectNames) -> str:
    payload = {
        "name": f"{names.npm_package_name}-frontend",
        "private": True,
        "version": "0.1.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "tsc -b && vite build",
            "preview": "vite preview",
        },
        "dependencies": {
            "react": "^19.1.0",
            "react-dom": "^19.1.0",
        },
        "devDependencies": {
            "@types/react": "^19.1.0",
            "@types/react-dom": "^19.1.0",
            "@vitejs/plugin-react": "^4.4.1",
            "typescript": "~5.8.3",
            "vite": "^6.3.5",
        },
    }
    return json.dumps(payload, indent=2) + "\n"


def frontend_index_html(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{names.project_display_name}</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
        """
    )


def frontend_vite_config() -> str:
    return textwrap.dedent(
        """\
        import { defineConfig } from "vite";
        import react from "@vitejs/plugin-react";

        export default defineConfig({
          plugins: [react()],
        });
        """
    )


def frontend_tsconfig() -> str:
    return textwrap.dedent(
        """\
        {
          "files": [],
          "references": [
            { "path": "./tsconfig.app.json" },
            { "path": "./tsconfig.node.json" }
          ]
        }
        """
    )


def frontend_tsconfig_app() -> str:
    return textwrap.dedent(
        """\
        {
          "compilerOptions": {
            "target": "ES2020",
            "useDefineForClassFields": true,
            "lib": ["ES2020", "DOM", "DOM.Iterable"],
            "module": "ESNext",
            "skipLibCheck": true,
            "moduleResolution": "Bundler",
            "resolveJsonModule": true,
            "isolatedModules": true,
            "noEmit": true,
            "jsx": "react-jsx",
            "strict": true
          },
          "include": ["src"]
        }
        """
    )


def frontend_tsconfig_node() -> str:
    return textwrap.dedent(
        """\
        {
          "compilerOptions": {
            "composite": true,
            "module": "ESNext",
            "moduleResolution": "Bundler",
            "allowSyntheticDefaultImports": true
          },
          "include": ["vite.config.ts"]
        }
        """
    )


def frontend_main_tsx() -> str:
    return textwrap.dedent(
        """\
        import React from "react";
        import ReactDOM from "react-dom/client";
        import App from "./App";
        import "./styles.css";

        ReactDOM.createRoot(document.getElementById("root")!).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        );
        """
    )


def frontend_app_tsx() -> str:
    return textwrap.dedent(
        """\
        import { useEffect, useState } from "react";
        import type { AuthUser } from "./api/client";
        import { HomePage } from "./pages/HomePage";
        import { LoginPage } from "./pages/LoginPage";

        export type ThemeMode = "light" | "dark";
        type ThemeDefaultMode = ThemeMode | "system";

        const truthyValues = new Set(["1", "true", "yes", "on"]);

        function normalizeEnvValue(value: unknown): string {
          return String(value ?? "")
            .trim()
            .replace(/^["']|["']$/g, "")
            .toLowerCase();
        }

        function envBool(value: unknown, fallback: boolean): boolean {
          const normalized = normalizeEnvValue(value);
          if (!normalized) {
            return fallback;
          }
          return truthyValues.has(normalized);
        }

        function envThemeDefault(value: unknown): ThemeDefaultMode {
          const normalized = normalizeEnvValue(value);
          if (normalized === "light" || normalized === "dark" || normalized === "system") {
            return normalized;
          }
          return "system";
        }

        const enableThemeToggle = envBool(import.meta.env.VITE_ENABLE_THEME_TOGGLE, true);
        const configuredDefaultTheme = envThemeDefault(import.meta.env.VITE_DEFAULT_THEME);

        function initialTheme(): ThemeMode {
          const fromStorage = window.localStorage.getItem("theme_mode");
          if (fromStorage === "light" || fromStorage === "dark") {
            return fromStorage;
          }
          if (configuredDefaultTheme === "light" || configuredDefaultTheme === "dark") {
            return configuredDefaultTheme;
          }
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }

        export default function App() {
          const [user, setUser] = useState<AuthUser | null>(null);
          const [theme, setTheme] = useState<ThemeMode>(initialTheme);

          useEffect(() => {
            document.documentElement.setAttribute("data-theme", theme);
            document.body.setAttribute("data-theme", theme);
            document.documentElement.style.colorScheme = theme;
            window.localStorage.setItem("theme_mode", theme);
          }, [theme]);

          const toggleTheme = () => {
            if (!enableThemeToggle) {
              return;
            }
            setTheme((current) => (current === "light" ? "dark" : "light"));
          };

          if (!user) {
            return (
              <LoginPage
                onLogin={setUser}
                theme={theme}
                onToggleTheme={toggleTheme}
                showThemeToggle={enableThemeToggle}
              />
            );
          }

          return (
            <HomePage
              user={user}
              onLogout={() => setUser(null)}
              theme={theme}
              onToggleTheme={toggleTheme}
              showThemeToggle={enableThemeToggle}
            />
          );
        }
        """
    )


def frontend_client_ts() -> str:
    return textwrap.dedent(
        """\
        export type AuthUser = {
          id: number;
          email: string;
          username: string;
        };

        export type LoginResponse = {
          status: string;
          user: AuthUser;
        };

        export type GoogleStartResponse = {
          status: string;
          auth_url?: string;
          detail?: string;
        };

        export type HealthResponse = {
          status: string;
          project: string;
          backend: string;
        };

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

        export async function fetchHealth(): Promise<HealthResponse> {
          const response = await fetch(`${apiBaseUrl}/api/health/`);
          if (!response.ok) {
            throw new Error(`Backend request failed with status ${response.status}`);
          }
          return response.json();
        }

        export async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
          const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const payload = (await response.json().catch(() => ({}))) as LoginResponse & { detail?: string };
          if (!response.ok) {
            throw new Error(payload.detail ?? `Login failed with status ${response.status}`);
          }
          return payload;
        }

        export async function registerWithEmailPassword(
          email: string,
          password: string,
          confirmPassword: string
        ): Promise<LoginResponse> {
          const response = await fetch(`${apiBaseUrl}/api/auth/register/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, confirm_password: confirmPassword }),
          });
          const payload = (await response.json().catch(() => ({}))) as LoginResponse & { detail?: string };
          if (!response.ok) {
            throw new Error(payload.detail ?? `Registration failed with status ${response.status}`);
          }
          return payload;
        }

        export async function fetchGoogleAuthUrl(): Promise<string> {
          const response = await fetch(`${apiBaseUrl}/api/auth/google/start/`);
          const payload = (await response.json()) as GoogleStartResponse;
          if (!response.ok || payload.status !== "ok" || !payload.auth_url) {
            throw new Error(payload.detail ?? `Google login failed with status ${response.status}`);
          }
          return payload.auth_url;
        }
        """
    )


def frontend_home_page() -> str:
    return textwrap.dedent(
        """\
        import { useState } from "react";
        import { fetchHealth, type AuthUser } from "../api/client";
        import type { ThemeMode } from "../App";

        const projectName = import.meta.env.VITE_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";

        type Props = {
          user: AuthUser;
          onLogout: () => void;
          theme: ThemeMode;
          onToggleTheme: () => void;
          showThemeToggle: boolean;
        };

        export function HomePage({ user, onLogout, theme, onToggleTheme, showThemeToggle }: Props) {
          const [message, setMessage] = useState("Backend noch nicht geprueft.");
          const [busy, setBusy] = useState(false);

          const checkBackend = async () => {
            setBusy(true);
            setMessage("Backend wird geprueft...");
            try {
              const health = await fetchHealth();
              setMessage(`Status: ${health.status} | Projekt: ${health.project} | Backend: ${health.backend}`);
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setMessage(`Backend nicht erreichbar: ${detail}`);
            } finally {
              setBusy(false);
            }
          };

          return (
            <main className="page">
              <section className="card">
                <h1>{projectName}</h1>
                <p>Neutrale Projektvorlage mit Backend-Health-Check und Marketing-Verlinkung.</p>
                <p className="status">Angemeldet als: {user.email}</p>
                <p className="status">Aktives Theme: {theme}</p>

                <button type="button" onClick={checkBackend} disabled={busy}>
                  {busy ? "Pruefe..." : "Backend pruefen"}
                </button>
                {showThemeToggle && (
                  <button type="button" className="secondary" onClick={onToggleTheme}>
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                )}
                <button type="button" className="secondary" onClick={onLogout}>
                  Abmelden
                </button>
                <p className="status">{message}</p>

                <div className="preview" aria-label="App-Vorschau-Platzhalter">
                  <span>Platzhalter App-Vorschau</span>
                </div>

                <nav className="links">
                  <a href="/../marketing/index.html" target="_blank" rel="noreferrer">Marketing-Seite</a>
                  <a href="/../marketing/datenschutz.html" target="_blank" rel="noreferrer">Datenschutz</a>
                  <a href="/../marketing/support.html" target="_blank" rel="noreferrer">Support</a>
                  <a href="/../marketing/impressum.html" target="_blank" rel="noreferrer">Impressum</a>
                  <a href="/../marketing/kontakt.html" target="_blank" rel="noreferrer">Kontakt</a>
                </nav>
              </section>
            </main>
          );
        }
        """
    )


def frontend_login_page() -> str:
    return textwrap.dedent(
        """\
        import { useState } from "react";
        import type { ThemeMode } from "../App";
        import {
          fetchGoogleAuthUrl,
          loginWithEmailPassword,
          registerWithEmailPassword,
          type AuthUser,
        } from "../api/client";

        const projectName = import.meta.env.VITE_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";
        const enableGoogleLogin = (import.meta.env.VITE_ENABLE_GOOGLE_LOGIN ?? "true").toLowerCase() === "true";

        type Props = {
          onLogin: (user: AuthUser) => void;
          theme: ThemeMode;
          onToggleTheme: () => void;
          showThemeToggle: boolean;
        };

        export function LoginPage({ onLogin, theme, onToggleTheme, showThemeToggle }: Props) {
          const [mode, setMode] = useState<"login" | "register">("login");
          const [email, setEmail] = useState("");
          const [password, setPassword] = useState("");
          const [confirmPassword, setConfirmPassword] = useState("");
          const [busy, setBusy] = useState(false);
          const [message, setMessage] = useState("Bitte mit E-Mail und Passwort anmelden.");

          const handleLogin = async () => {
            if (!email.trim() || !password) {
              setMessage("E-Mail und Passwort sind erforderlich.");
              return;
            }
            setBusy(true);
            setMessage("Anmeldung wird geprueft...");
            try {
              const payload = await loginWithEmailPassword(email.trim(), password);
              onLogin(payload.user);
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setMessage(`Login fehlgeschlagen: ${detail}`);
            } finally {
              setBusy(false);
            }
          };

          const handleRegister = async () => {
            if (!email.trim() || !password || !confirmPassword) {
              setMessage("E-Mail, Passwort und Passwort-Bestaetigung sind erforderlich.");
              return;
            }
            if (password !== confirmPassword) {
              setMessage("Passwort und Bestaetigung sind nicht identisch.");
              return;
            }
            setBusy(true);
            setMessage("Account wird erstellt...");
            try {
              const payload = await registerWithEmailPassword(email.trim(), password, confirmPassword);
              setMessage("Registrierung erfolgreich. Du bist jetzt angemeldet.");
              onLogin(payload.user);
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setMessage(`Registrierung fehlgeschlagen: ${detail}`);
            } finally {
              setBusy(false);
            }
          };

          const handleGoogleLogin = async () => {
            setBusy(true);
            setMessage("Google-Login wird vorbereitet...");
            try {
              const authUrl = await fetchGoogleAuthUrl();
              window.location.href = authUrl;
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setMessage(`Google-Login nicht verfuegbar: ${detail}`);
              setBusy(false);
            }
          };

          return (
            <main className="page">
              <section className="card">
                <h1>{projectName}</h1>
                <p>Auth-Vorlage: Login und Registrierung mit E-Mail + Passwort, optional Google-Login.</p>
                <p className="status">Aktives Theme: {theme}</p>

                {showThemeToggle && (
                  <div className="button-row">
                    <button type="button" className="secondary" onClick={onToggleTheme}>
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                  </div>
                )}

                <div className="button-row">
                  <button
                    type="button"
                    className={mode === "login" ? "" : "secondary"}
                    onClick={() => {
                      setMode("login");
                      setMessage("Bitte mit E-Mail und Passwort anmelden.");
                    }}
                  >
                    Anmelden
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "" : "secondary"}
                    onClick={() => {
                      setMode("register");
                      setMessage("Neuen Account mit E-Mail und Passwort erstellen.");
                    }}
                  >
                    Registrieren
                  </button>
                </div>

                <div className="field">
                  <label htmlFor="email">E-Mail-Adresse</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="mail@example.com"
                  />
                </div>

                <div className="field">
                  <label htmlFor="password">Passwort</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        if (mode === "register") {
                          return;
                        }
                        void handleLogin();
                      }
                    }}
                  />
                </div>

                {mode === "register" && (
                  <div className="field">
                    <label htmlFor="confirm_password">Passwort bestaetigen</label>
                    <input
                      id="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleRegister();
                        }
                      }}
                    />
                  </div>
                )}

                <div className="button-row">
                  {mode === "login" ? (
                    <button type="button" onClick={() => void handleLogin()} disabled={busy}>
                      {busy ? "Bitte warten..." : "Mit E-Mail anmelden"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => void handleRegister()} disabled={busy}>
                      {busy ? "Bitte warten..." : "Account erstellen"}
                    </button>
                  )}
                  {mode === "login" && enableGoogleLogin && (
                    <button type="button" className="google" onClick={() => void handleGoogleLogin()} disabled={busy}>
                      Mit Google anmelden
                    </button>
                  )}
                </div>

                <p className="status">{message}</p>
                <p className="hint">
                  Hinweis: Google-Login ist eine Vorlage. Konfiguriere
                  `GOOGLE_OAUTH_CLIENT_ID` und `GOOGLE_OAUTH_REDIRECT_URI` in `backend/.env`.
                </p>
              </section>
            </main>
          );
        }
        """
    )


def frontend_styles() -> str:
    return textwrap.dedent(
        """\
        :root {
          --bg-page: #f1f5fb;
          --bg-page-grad-a: #e8f0ff;
          --bg-page-grad-b: #f8fbff;
          --bg-card: #ffffff;
          --text-main: #10223a;
          --text-muted: #2f435e;
          --text-hint: #4d6282;
          --border-input: #c4d5ec;
          --border-soft: #c6d3e6;
          --status-bg: #eef4ff;
          --button-primary: #1e88e5;
          --button-secondary: #6f7f96;
          --button-google-bg: #ffffff;
          --button-google-text: #10223a;
          --preview-border: #8db4e3;
          --preview-bg: #f7fbff;
          --link: #1e63b5;
          font-family: "Segoe UI", sans-serif;
          color: var(--text-main);
          background: var(--bg-page);
        }

        :root[data-theme="dark"],
        html[data-theme="dark"],
        body[data-theme="dark"] {
          --bg-page: #0f1724;
          --bg-page-grad-a: #101a2d;
          --bg-page-grad-b: #141f33;
          --bg-card: #1a2438;
          --text-main: #e6eefb;
          --text-muted: #bccbe3;
          --text-hint: #9fb1cf;
          --border-input: #3b4d6e;
          --border-soft: #44587d;
          --status-bg: #24324d;
          --button-primary: #2f8fff;
          --button-secondary: #607596;
          --button-google-bg: #283754;
          --button-google-text: #e6eefb;
          --preview-border: #4d6ea1;
          --preview-bg: #1f2d47;
          --link: #80b9ff;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(145deg, var(--bg-page-grad-a), var(--bg-page-grad-b));
        }

        .card {
          width: min(680px, 100%);
          background: var(--bg-card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 40px rgba(16, 34, 58, 0.12);
        }

        button {
          border: 0;
          border-radius: 10px;
          background: var(--button-primary);
          color: #fff;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 600;
          margin-right: 8px;
          margin-bottom: 8px;
        }

        .secondary {
          background: var(--button-secondary);
        }

        .google {
          background: var(--button-google-bg);
          color: var(--button-google-text);
          border: 1px solid var(--border-soft);
        }

        .status {
          margin: 12px 0;
          padding: 10px;
          background: var(--status-bg);
          border-radius: 8px;
        }

        .preview {
          margin-top: 12px;
          min-height: 180px;
          border-radius: 12px;
          border: 2px dashed var(--preview-border);
          display: grid;
          place-items: center;
          background: var(--preview-bg);
        }

        .links {
          margin-top: 14px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .field {
          display: grid;
          gap: 6px;
          margin: 12px 0;
        }

        .field label {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 600;
        }

        .field input {
          border: 1px solid var(--border-input);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 15px;
          background: var(--bg-card);
          color: var(--text-main);
        }

        .button-row {
          margin-top: 8px;
        }

        .hint {
          margin: 8px 0 0;
          color: var(--text-hint);
          font-size: 13px;
        }

        a {
          color: var(--link);
          font-weight: 600;
          text-decoration: none;
        }
        """
    )


def mobile_package_json(names: ProjectNames) -> str:
    payload = {
        "name": f"{names.npm_package_name}-mobile",
        "private": True,
        "version": "1.0.0",
        "main": "index.js",
        "scripts": {
            "start": "expo start",
            "local:expo": "expo start --tunnel --clear",
            "android": "expo run:android",
            "ios": "expo run:ios",
            "web": "expo start --web",
        },
        "dependencies": {
            "expo": "~54.0.35",
            "expo-status-bar": "~3.0.9",
            "react": "19.1.0",
            "react-native": "0.81.5",
        },
        "devDependencies": {
            "@types/react": "~19.1.0",
            "babel-preset-expo": "^54.0.0",
            "typescript": "~5.9.2",
        },
    }
    return json.dumps(payload, indent=2) + "\n"


def mobile_eas_json() -> str:
    payload = {
        "cli": {
            "appVersionSource": "remote",
        },
        "build": {
            "development": {
                "developmentClient": True,
                "distribution": "internal",
                "channel": "development",
            },
            "preview": {
                "distribution": "internal",
                "channel": "preview",
            },
            "production": {
                "autoIncrement": True,
                "channel": "production",
            },
        },
        "submit": {
            "production": {
                "android": {
                    "serviceAccountKeyPath": "./.secrets/google-service-account.json",
                    "track": "internal",
                    "releaseStatus": "completed",
                },
                "ios": {
                    "ascAppId": "HIER_ASC_APP_ID_EINTRAGEN",
                },
            },
        },
    }
    return json.dumps(payload, indent=2) + "\n"


def mobile_readme() -> str:
    return textwrap.dedent(
        """\
        # Mobile (Expo)

        ## Lokale Installation und Start (Expo Go)
        ```bash
        cd mobile
        npm install --include=dev
        npx expo install --check
        npm run local:expo
        ```

        Danach in der Expo Go App den QR-Code scannen.
        Fuer Login muss die API-URL (`EXPO_PUBLIC_API_BASE_URL`) vom Handy erreichbar sein
        (gleiches WLAN/LAN oder oeffentlich erreichbare URL).

        ## Optional: lokale Development Builds
        ```bash
        cd mobile
        npx expo run:ios
        npx expo run:android
        ```

        ## EAS / CI
        - Konfiguration liegt in `mobile/eas.json`
        - Jenkins-Pipelines:
          - `Jenkinsfile.mobile_expo`
          - `Jenkinsfile.mobile.submit-android`
          - `Jenkinsfile.mobile.submit-ios`
        
        ## Theme-Optionen in `mobile/.env`
        - `EXPO_PUBLIC_ENABLE_THEME_TOGGLE=true|false`
        - `EXPO_PUBLIC_DEFAULT_THEME=system|light|dark`
        """
    )


def mobile_app_json(names: ProjectNames) -> str:
    payload = {
        "expo": {
            "name": names.project_display_name,
            "slug": names.project_slug,
            "version": "1.0.0",
            "orientation": "portrait",
            "icon": "./assets/icon.png",
            "userInterfaceStyle": "automatic",
            "splash": {
                "image": "./assets/splash-icon.png",
                "resizeMode": "contain",
                "backgroundColor": "#f2f6fc",
            },
            "ios": {
                "supportsTablet": True,
                "bundleIdentifier": names.bundle_identifier,
            },
            "android": {
                "adaptiveIcon": {
                    "foregroundImage": "./assets/adaptive-icon.png",
                    "backgroundColor": "#ffffff",
                },
                "package": names.android_package_name,
            },
            "web": {
                "bundler": "metro",
            },
        }
    }
    return json.dumps(payload, indent=2) + "\n"


def mobile_index_js() -> str:
    return textwrap.dedent(
        """\
        import { registerRootComponent } from "expo";
        import App from "./App";

        registerRootComponent(App);
        """
    )


def mobile_app_tsx() -> str:
    return textwrap.dedent(
        """\
        import { StatusBar } from "expo-status-bar";
        import { useState } from "react";
        import { Appearance, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

        type HealthResponse = {
          status: string;
          project: string;
          backend: string;
        };

        type AuthUser = {
          email: string;
        };

        type LoginResponse = {
          status: string;
          user: AuthUser;
          detail?: string;
        };

        type ThemeMode = "light" | "dark";
        type ThemeDefaultMode = ThemeMode | "system";

        const projectName = process.env.EXPO_PUBLIC_PROJECT_NAME ?? "PROJECT_DISPLAY_NAME";
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
        const truthyValues = new Set(["1", "true", "yes", "on"]);

        function normalizeEnvValue(value: unknown): string {
          return String(value ?? "")
            .trim()
            .replace(/^["']|["']$/g, "")
            .toLowerCase();
        }

        function envBool(value: unknown, fallback: boolean): boolean {
          const normalized = normalizeEnvValue(value);
          if (!normalized) {
            return fallback;
          }
          return truthyValues.has(normalized);
        }

        function envThemeDefault(value: unknown): ThemeDefaultMode {
          const normalized = normalizeEnvValue(value);
          if (normalized === "light" || normalized === "dark" || normalized === "system") {
            return normalized;
          }
          return "system";
        }

        const enableThemeToggle = envBool(process.env.EXPO_PUBLIC_ENABLE_THEME_TOGGLE, true);
        const configuredDefaultTheme = envThemeDefault(process.env.EXPO_PUBLIC_DEFAULT_THEME);

        function initialTheme(): ThemeMode {
          if (configuredDefaultTheme === "light" || configuredDefaultTheme === "dark") {
            return configuredDefaultTheme;
          }
          const systemTheme = Appearance.getColorScheme();
          return systemTheme === "dark" ? "dark" : "light";
        }

        async function loginWithEmailPassword(email: string, password: string): Promise<LoginResponse> {
          const response = await fetch(`${apiBaseUrl}/api/auth/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const payload = (await response.json().catch(() => ({}))) as LoginResponse;
          if (!response.ok || payload.status !== "ok" || !payload.user) {
            throw new Error(payload.detail ?? `Login failed with status ${response.status}`);
          }
          return payload;
        }

        async function registerWithEmailPassword(
          email: string,
          password: string,
          confirmPassword: string
        ): Promise<LoginResponse> {
          const response = await fetch(`${apiBaseUrl}/api/auth/register/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, confirm_password: confirmPassword }),
          });
          const payload = (await response.json().catch(() => ({}))) as LoginResponse;
          if (!response.ok || !payload.user) {
            throw new Error(payload.detail ?? `Registration failed with status ${response.status}`);
          }
          return payload;
        }

        export default function App() {
          const [theme, setTheme] = useState<ThemeMode>(initialTheme);
          const [user, setUser] = useState<AuthUser | null>(null);
          const [mode, setMode] = useState<"login" | "register">("login");
          const [email, setEmail] = useState("");
          const [password, setPassword] = useState("");
          const [confirmPassword, setConfirmPassword] = useState("");
          const [status, setStatus] = useState("Backend noch nicht geprueft.");
          const [authMessage, setAuthMessage] = useState("Bitte mit E-Mail und Passwort anmelden.");
          const [loading, setLoading] = useState(false);

          const palette =
            theme === "dark"
              ? {
                  bg: "#0f1724",
                  card: "#1a2438",
                  title: "#e6eefb",
                  muted: "#bccbe3",
                  text: "#d7e5fb",
                  inputBg: "#24324d",
                  inputBorder: "#44587d",
                  placeholder: "#9fb1cf",
                  modeBorder: "#4d6282",
                  modeActiveBg: "#274063",
                  modeActiveBorder: "#80b9ff",
                  primary: "#2f8fff",
                  secondary: "#607596",
                  statusBg: "#24324d",
                  note: "#9fb1cf",
                }
              : {
                  bg: "#f2f6fc",
                  card: "#ffffff",
                  title: "#10223a",
                  muted: "#38506e",
                  text: "#243b53",
                  inputBg: "#ffffff",
                  inputBorder: "#b8cde6",
                  placeholder: "#6b7f99",
                  modeBorder: "#8aa8cb",
                  modeActiveBg: "#d7e8ff",
                  modeActiveBorder: "#1e63b5",
                  primary: "#1e88e5",
                  secondary: "#6b7f99",
                  statusBg: "#eaf1fb",
                  note: "#5b6f86",
                };

          const toggleTheme = () => {
            if (!enableThemeToggle) {
              return;
            }
            setTheme((current) => (current === "light" ? "dark" : "light"));
          };

          const handleLogin = async () => {
            if (!email.trim() || !password) {
              setAuthMessage("E-Mail und Passwort sind erforderlich.");
              return;
            }
            setLoading(true);
            setAuthMessage("Anmeldung wird geprueft...");
            try {
              const payload = await loginWithEmailPassword(email.trim(), password);
              setUser(payload.user);
              setAuthMessage(`Angemeldet als ${payload.user.email}`);
              setPassword("");
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setAuthMessage(`Login fehlgeschlagen: ${detail}`);
            } finally {
              setLoading(false);
            }
          };

          const handleRegister = async () => {
            if (!email.trim() || !password || !confirmPassword) {
              setAuthMessage("Bitte E-Mail, Passwort und Bestaetigung angeben.");
              return;
            }
            if (password !== confirmPassword) {
              setAuthMessage("Passwoerter stimmen nicht ueberein.");
              return;
            }
            setLoading(true);
            setAuthMessage("Registrierung wird geprueft...");
            try {
              const payload = await registerWithEmailPassword(email.trim(), password, confirmPassword);
              setUser(payload.user);
              setAuthMessage(`Registriert als ${payload.user.email}`);
              setPassword("");
              setConfirmPassword("");
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setAuthMessage(`Registrierung fehlgeschlagen: ${detail}`);
            } finally {
              setLoading(false);
            }
          };

          const checkBackend = async () => {
            setLoading(true);
            setStatus("Backend wird geprueft...");
            try {
              const response = await fetch(`${apiBaseUrl}/api/health/`);
              if (!response.ok) {
                throw new Error(`Status ${response.status}`);
              }
              const data: HealthResponse = await response.json();
              setStatus(`Status: ${data.status} | Backend: ${data.backend}`);
            } catch (error) {
              const detail = error instanceof Error ? error.message : "Unbekannter Fehler";
              setStatus(`Backend nicht erreichbar: ${detail}`);
            } finally {
              setLoading(false);
            }
          };

          const logout = () => {
            setUser(null);
            setMode("login");
            setStatus("Backend noch nicht geprueft.");
            setAuthMessage("Abgemeldet.");
          };

          if (!user) {
            return (
              <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
                <StatusBar style={theme === "dark" ? "light" : "dark"} />
                <View style={[styles.container, { backgroundColor: palette.card }]}>
                  <Text style={[styles.title, { color: palette.title }]}>{projectName}</Text>
                  <Text style={[styles.subtitle, { color: palette.muted }]}>Mobile Login-Vorlage mit Backend-Anbindung.</Text>
                  <Text style={[styles.themeInfo, { color: palette.muted }]}>Aktives Theme: {theme}</Text>

                  {enableThemeToggle && (
                    <Pressable
                      style={[styles.secondaryButton, { backgroundColor: palette.secondary }]}
                      onPress={toggleTheme}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</Text>
                    </Pressable>
                  )}

                  <View style={styles.modeRow}>
                    <Pressable
                      style={[
                        styles.modeButton,
                        { backgroundColor: palette.inputBg, borderColor: palette.modeBorder },
                        mode === "login" && { backgroundColor: palette.modeActiveBg, borderColor: palette.modeActiveBorder },
                      ]}
                      onPress={() => setMode("login")}
                      disabled={loading}
                    >
                      <Text style={[styles.modeButtonText, { color: palette.muted }, mode === "login" && { color: palette.text }]}>Login</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modeButton,
                        { backgroundColor: palette.inputBg, borderColor: palette.modeBorder },
                        mode === "register" && { backgroundColor: palette.modeActiveBg, borderColor: palette.modeActiveBorder },
                      ]}
                      onPress={() => setMode("register")}
                      disabled={loading}
                    >
                      <Text style={[styles.modeButtonText, { color: palette.muted }, mode === "register" && { color: palette.text }]}>Registrieren</Text>
                    </Pressable>
                  </View>

                  <TextInput
                    style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                    placeholder="E-Mail"
                    placeholderTextColor={palette.placeholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                    placeholder="Passwort"
                    placeholderTextColor={palette.placeholder}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                  {mode === "register" && (
                    <TextInput
                      style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                      placeholder="Passwort bestaetigen"
                      placeholderTextColor={palette.placeholder}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  )}

                  <Pressable
                    style={[styles.button, { backgroundColor: palette.primary }]}
                    onPress={() => void (mode === "login" ? handleLogin() : handleRegister())}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>{loading ? "Pruefe..." : mode === "login" ? "Anmelden" : "Registrieren"}</Text>
                  </Pressable>
                  <Text style={[styles.status, { color: palette.text, backgroundColor: palette.statusBg }]}>{authMessage}</Text>
                  <Text style={[styles.note, { color: palette.note }]}>API-Basis: {apiBaseUrl}</Text>
                </View>
              </SafeAreaView>
            );
          }

          return (
            <SafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
              <StatusBar style={theme === "dark" ? "light" : "dark"} />
              <View style={[styles.container, { backgroundColor: palette.card }]}>
                <Text style={[styles.title, { color: palette.title }]}>{projectName}</Text>
                <Text style={[styles.subtitle, { color: palette.muted }]}>Angemeldet als: {user.email}</Text>
                <Text style={[styles.themeInfo, { color: palette.muted }]}>Aktives Theme: {theme}</Text>

                {enableThemeToggle && (
                  <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={toggleTheme} disabled={loading}>
                    <Text style={styles.buttonText}>{theme === "dark" ? "Light Mode" : "Dark Mode"}</Text>
                  </Pressable>
                )}

                <Pressable style={[styles.button, { backgroundColor: palette.primary }]} onPress={checkBackend} disabled={loading}>
                  <Text style={styles.buttonText}>{loading ? "Pruefe..." : "Backend pruefen"}</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, { backgroundColor: palette.secondary }]} onPress={logout} disabled={loading}>
                  <Text style={styles.buttonText}>Abmelden</Text>
                </Pressable>
                <Text style={[styles.status, { color: palette.text, backgroundColor: palette.statusBg }]}>{status}</Text>
                <Text style={[styles.note, { color: palette.note }]}>Intro-Video Platzhalter: mobile/assets/intro.mp4</Text>
              </View>
            </SafeAreaView>
          );
        }

        const styles = StyleSheet.create({
          root: { flex: 1 },
          container: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 20,
            gap: 12,
            margin: 12,
            borderRadius: 16,
          },
          title: { fontSize: 30, fontWeight: "700", textAlign: "center" },
          subtitle: { fontSize: 16, textAlign: "center", marginBottom: 2 },
          themeInfo: { fontSize: 13, textAlign: "center", marginBottom: 4 },
          modeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
          modeButton: {
            borderRadius: 10,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
          },
          modeButtonText: { fontWeight: "600" },
          input: {
            width: "100%",
            maxWidth: 380,
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          },
          button: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
          secondaryButton: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
          buttonText: { color: "#ffffff", fontWeight: "600" },
          status: { marginTop: 10, textAlign: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
          note: { marginTop: 6, textAlign: "center", fontSize: 12 },
        });
        """
    )


def mobile_tsconfig() -> str:
    return textwrap.dedent(
        """\
        {
          "extends": "expo/tsconfig.base",
          "compilerOptions": {
            "strict": true
          }
        }
        """
    )


def mobile_babel() -> str:
    return textwrap.dedent(
        """\
        module.exports = function (api) {
          api.cache(true);
          return {
            presets: ["babel-preset-expo"],
          };
        };
        """
    )


def intro_readme() -> str:
    return "Lege hier dein Intro-Video als intro.mp4 ab.\n"


def marketing_index(names: ProjectNames) -> str:
    return textwrap.dedent(
        f"""\
        <!doctype html>
        <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{names.project_display_name} - Marketing</title>
          <style>
            body {{ margin:0; font-family:Segoe UI,sans-serif; color:#0f2740; background:#f5f8fd; }}
            .hero {{ padding:56px 24px; background:linear-gradient(140deg,#ddeaff,#f8fbff); }}
            .wrap {{ max-width:1100px; margin:0 auto; }}
            h1 {{ margin:0 0 12px; }}
            .grid {{ display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }}
            .card {{ background:#fff; border-radius:12px; padding:16px; box-shadow:0 8px 22px rgba(16,34,58,.08); }}
            .placeholder {{ border:2px dashed #8fb3df; border-radius:10px; min-height:180px; display:grid; place-items:center; }}
            .footlinks a {{ margin-right:14px; color:#1e63b5; text-decoration:none; font-weight:600; }}
            .notice {{ background:#fff8e1; border-left:4px solid #f0ab00; padding:10px 12px; border-radius:6px; }}
          </style>
        </head>
        <body>
          <section class="hero">
            <div class="wrap">
              <h1>{names.project_display_name}</h1>
              <p>Generische App-Vorlage mit Web, Backend und Mobile.</p>
              <div class="notice">Bitte vor Veroeffentlichung rechtlich pruefen lassen.</div>
            </div>
          </section>

          <section class="wrap" style="padding:28px 24px;">
            <h2>App-Vorschau</h2>
            <div class="placeholder">Platzhalter-Screenshot (marketing/assets/app-preview.png)</div>
          </section>

          <section class="wrap" style="padding:0 24px 28px;">
            <h2>Intro-Video</h2>
            <div class="placeholder">Platzhalter Video: marketing/assets/intro.mp4</div>
          </section>

          <section class="wrap" style="padding:0 24px 28px;">
            <h2>Features</h2>
            <div class="grid">
              <article class="card"><h3>Feature 1</h3><p>Beschreibung als Platzhalter.</p></article>
              <article class="card"><h3>Feature 2</h3><p>Beschreibung als Platzhalter.</p></article>
              <article class="card"><h3>Feature 3</h3><p>Beschreibung als Platzhalter.</p></article>
            </div>
          </section>

          <section class="wrap" style="padding:0 24px 28px;">
            <h2>Download</h2>
            <p>iOS Download-Link (Platzhalter) | Android Download-Link (Platzhalter)</p>
          </section>

          <section class="wrap" style="padding:0 24px 56px;">
            <h2>Kontakt</h2>
            <p>E-Mail: kontakt@example.com</p>
            <div class="footlinks">
              <a href="datenschutz.html">Datenschutz</a>
              <a href="support.html">Support</a>
              <a href="impressum.html">Impressum</a>
              <a href="kontakt.html">Kontakt</a>
              <a href="terms.html">Nutzungsbedingungen</a>
            </div>
          </section>
        </body>
        </html>
        """
    )


def marketing_privacy() -> str:
    content = textwrap.dedent(
        """\
        <article class="content-card">
          <h2>1. Verantwortliche Stelle</h2>
          <p><strong>[Unternehmen / Name]</strong><br />[Strasse, PLZ, Ort, Land]<br />E-Mail: <a href="mailto:kontakt@example.com">kontakt@example.com</a></p>
        </article>

        <article class="content-card">
          <h2>2. Welche Daten verarbeitet werden</h2>
          <ul>
            <li>Kontodaten wie Name/Anzeigename, optionale E-Mail und Login-Informationen</li>
            <li>Technische Nutzungsdaten wie Zeitstempel, IP-Adresse und Fehlerprotokolle</li>
            <li>Inhalte aus Support- oder Kontaktanfragen</li>
          </ul>
        </article>

        <article class="content-card">
          <h2>3. Zweck und Rechtsgrundlage</h2>
          <p>Die Verarbeitung erfolgt zur Bereitstellung des Dienstes, zur Sicherstellung des technischen Betriebs und zur Bearbeitung von Support-Anfragen.</p>
          <ul>
            <li>Art. 6 Abs. 1 lit. b DSGVO: Vertragserfuellung und Bereitstellung der Funktionen</li>
            <li>Art. 6 Abs. 1 lit. f DSGVO: Sicherheit, Fehleranalyse und Missbrauchsvermeidung</li>
          </ul>
        </article>

        <article class="content-card">
          <h2>4. Speicherdauer und Loeschung</h2>
          <p>Personenbezogene Daten werden nur so lange gespeichert, wie sie fuer den Betrieb erforderlich sind oder gesetzliche Aufbewahrungspflichten bestehen. Danach werden sie geloescht oder anonymisiert.</p>
        </article>

        <article class="content-card">
          <h2>5. Betroffenenrechte</h2>
          <p>Du hast das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Datenuebertragbarkeit und Widerspruch nach den gesetzlichen Vorgaben.</p>
          <p>Anfragen bitte an <a href="mailto:support@example.com">support@example.com</a>.</p>
        </article>

        <article class="content-card">
          <h2>6. Stand</h2>
          <p>[Datum einsetzen]</p>
          <p><strong>Hinweis:</strong> Diese Vorlage ersetzt keine Rechtsberatung und sollte vor Veroeffentlichung juristisch geprueft werden.</p>
        </article>
        """
    )
    return marketing_legal_page(
        page_title="Datenschutz",
        eyebrow="Datenschutzerklaerung",
        hero_title="Informationen zur Verarbeitung personenbezogener Daten",
        hero_lead="Diese Vorlage beschreibt in neutraler Form, welche Daten in einem App- oder Webprojekt verarbeitet werden und zu welchem Zweck.",
        meta='<a class="meta-chip" href="mailto:support@example.com">support@example.com</a>',
        content=content,
    )


def marketing_legal_page(page_title: str, eyebrow: str, hero_title: str, hero_lead: str, meta: str, content: str) -> str:
    return textwrap.dedent(
        """\
        <!doctype html>
        <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{page_title}</title>
          <style>
            :root {{
              --bg-0: #0b1532;
              --bg-1: #102045;
              --surface: #f4f7fc;
              --card: #ffffff;
              --text: #0f2740;
              --muted: #5a6f89;
              --line: #d7e2f0;
              --accent: #1e63b5;
            }}
            * {{ box-sizing: border-box; }}
            body {{
              margin: 0;
              font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
              background: radial-gradient(circle at top right, #1a3b75 0%, var(--bg-0) 45%, #070d21 100%);
              color: var(--text);
            }}
            .page {{ min-height: 100vh; padding: 22px; }}
            .shell {{ max-width: 980px; margin: 0 auto; }}
            .topbar {{
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              color: #e9f0ff;
              margin-bottom: 16px;
              flex-wrap: wrap;
            }}
            .topbar a {{ color: #e9f0ff; text-decoration: none; font-weight: 600; }}
            .brand {{ font-size: 15px; letter-spacing: .04em; text-transform: uppercase; opacity: .95; }}
            .hero-card {{
              background: linear-gradient(145deg, #1a3f86 0%, #16366f 100%);
              color: #f4f7ff;
              border-radius: 16px;
              padding: 24px;
              box-shadow: 0 16px 44px rgba(2, 8, 20, .35);
            }}
            .eyebrow {{
              display: inline-block;
              margin: 0 0 8px;
              padding: 4px 10px;
              border-radius: 999px;
              background: rgba(255, 255, 255, .12);
              font-size: 12px;
              letter-spacing: .08em;
              text-transform: uppercase;
              font-weight: 700;
            }}
            h1 {{ margin: 0 0 10px; font-size: clamp(26px, 4vw, 38px); }}
            .lead {{ margin: 0; max-width: 72ch; color: rgba(244, 247, 255, .92); line-height: 1.58; }}
            .meta {{ margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap; }}
            .meta-chip {{
              border: 1px solid rgba(255, 255, 255, .2);
              color: #ffffff;
              border-radius: 999px;
              padding: 6px 10px;
              font-size: 13px;
              text-decoration: none;
            }}
            .cards {{
              margin-top: 16px;
              display: grid;
              gap: 12px;
            }}
            .content-card {{
              background: var(--card);
              border: 1px solid var(--line);
              border-radius: 14px;
              padding: 16px 18px;
              box-shadow: 0 10px 24px rgba(11, 21, 50, .08);
            }}
            .content-card h2 {{
              margin: 0 0 8px;
              font-size: 20px;
              color: #112e55;
            }}
            .content-card p {{
              margin: 0 0 8px;
              line-height: 1.58;
              color: #183553;
            }}
            .content-card ul {{ margin: 0; padding-left: 18px; color: #183553; line-height: 1.58; }}
            .content-card li + li {{ margin-top: 6px; }}
            .footer {{
              margin-top: 18px;
              padding: 14px 16px;
              border-radius: 12px;
              background: rgba(255, 255, 255, .08);
              color: #e9f0ff;
              display: flex;
              justify-content: space-between;
              gap: 10px;
              flex-wrap: wrap;
            }}
            .footer nav {{
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
            }}
            .footer a {{ color: #f4f7ff; text-decoration: none; font-weight: 600; }}
            @media (max-width: 720px) {{
              .page {{ padding: 14px; }}
              .hero-card {{ padding: 18px; }}
              .content-card {{ padding: 14px; }}
            }}
          </style>
        </head>
        <body>
          <div class="page">
            <div class="shell">
              <header class="topbar">
                <a href="index.html" class="brand">Projektinformationen</a>
                <a href="index.html">Zur Marketing-Seite</a>
              </header>
              <main>
                <section class="hero-card">
                  <p class="eyebrow">{eyebrow}</p>
                  <h1>{hero_title}</h1>
                  <p class="lead">{hero_lead}</p>
                  <div class="meta">{meta}</div>
                </section>
                <section class="cards">
                  {content}
                </section>
              </main>
              <footer class="footer">
                <div>© [Jahr] [Projektname]</div>
                <nav>
                  <a href="support.html">Support</a>
                  <a href="datenschutz.html">Datenschutz</a>
                  <a href="impressum.html">Impressum</a>
                  <a href="kontakt.html">Kontakt</a>
                </nav>
              </footer>
            </div>
          </div>
        </body>
        </html>
        """
    ).format(
        page_title=page_title,
        eyebrow=eyebrow,
        hero_title=hero_title,
        hero_lead=hero_lead,
        meta=meta,
        content=content,
    )


def marketing_datenschutz() -> str:
    return marketing_privacy()


def marketing_support() -> str:
    content = textwrap.dedent(
        """\
        <article class="content-card">
          <h2>Wobei wir helfen koennen</h2>
          <ul>
            <li>Fragen zur Nutzung der App oder Webanwendung</li>
            <li>Probleme bei Login, Registrierung oder Kontozugriff</li>
            <li>Fehlermeldungen, Darstellungsprobleme oder Abstuerze</li>
            <li>Anfragen zu Datenexport, Kontoloeschung und Datenschutz</li>
          </ul>
        </article>

        <article class="content-card">
          <h2>Kontakt</h2>
          <p>E-Mail: <a href="mailto:support@example.com">support@example.com</a></p>
          <p>Antwortzeit (Beispiel): innerhalb von 1-2 Werktagen.</p>
        </article>

        <article class="content-card">
          <h2>Hilfreiche Angaben fuer eine schnelle Bearbeitung</h2>
          <ul>
            <li>Kurze Problembeschreibung</li>
            <li>Geraet/Browser und Betriebssystem</li>
            <li>Zeitpunkt des Problems</li>
            <li>Optional: Screenshot oder genaue Fehlermeldung</li>
          </ul>
        </article>

        <article class="content-card">
          <h2>Datenschutz-Hinweis</h2>
          <p>Weitere Informationen zur Verarbeitung personenbezogener Daten findest du in der <a href="datenschutz.html">Datenschutzerklaerung</a>.</p>
        </article>
        """
    )
    return marketing_legal_page(
        page_title="Support",
        eyebrow="App Support",
        hero_title="Wir helfen dir weiter.",
        hero_lead="Wenn du Fragen zur Anwendung hast oder technische Hilfe brauchst, kannst du uns jederzeit per E-Mail erreichen.",
        meta='<a class="meta-chip" href="mailto:support@example.com">support@example.com</a><span class="meta-chip">Antwortzeit meist innerhalb von 48 Stunden</span>',
        content=content,
    )


def marketing_impressum() -> str:
    content = textwrap.dedent(
        """\
        <article class="content-card">
          <h2>Angaben gemaess § 5 DDG</h2>
          <p><strong>[Unternehmen / Name]</strong><br />[Strasse, PLZ, Ort]<br />[Land]</p>
        </article>

        <article class="content-card">
          <h2>Kontakt</h2>
          <p>E-Mail: <a href="mailto:kontakt@example.com">kontakt@example.com</a></p>
          <p>Telefon (optional): [Telefonnummer]</p>
        </article>

        <article class="content-card">
          <h2>Verantwortlich fuer den Inhalt</h2>
          <p>[Name der verantwortlichen Person]</p>
        </article>

        <article class="content-card">
          <h2>Weitere Angaben</h2>
          <p>Umsatzsteuer-ID (optional): [USt-ID]</p>
          <p><strong>Hinweis:</strong> Diese Seite ist eine Vorlage und sollte vor Veroeffentlichung rechtlich geprueft werden.</p>
        </article>
        """
    )
    return marketing_legal_page(
        page_title="Impressum",
        eyebrow="Impressum",
        hero_title="Angaben zum Anbieter",
        hero_lead="Diese Seite enthaelt die gesetzlich erforderlichen Anbieterinformationen fuer das Projekt.",
        meta='<span class="meta-chip">Stand: [Datum einsetzen]</span>',
        content=content,
    )


def marketing_kontakt() -> str:
    content = textwrap.dedent(
        """\
        <article class="content-card">
          <h2>So erreichst du uns</h2>
          <p>Bitte sende deine Nachricht an <a href="mailto:support@example.com">support@example.com</a>.</p>
          <p>Wir verwenden diese Adresse fuer allgemeine Rueckfragen und Support-Anliegen.</p>
        </article>

        <article class="content-card">
          <h2>Typische Anliegen</h2>
          <ul>
            <li>Allgemeine Fragen zum Projekt oder zur Nutzung</li>
            <li>Technische Probleme und Fehlerberichte</li>
            <li>Anfragen zu Datenschutz oder Datenloeschung</li>
            <li>Kooperations- oder Presseanfragen</li>
          </ul>
        </article>

        <article class="content-card">
          <h2>Fuer eine schnellere Bearbeitung</h2>
          <ul>
            <li>Kurze Problembeschreibung oder Anliegen</li>
            <li>Optional: Geraet, Betriebssystem oder Browser</li>
            <li>Optional: Screenshot oder genaue Fehlermeldung</li>
          </ul>
        </article>
        """
    )
    return marketing_legal_page(
        page_title="Kontakt",
        eyebrow="Kontakt",
        hero_title="Fragen, Feedback oder Zusammenarbeit?",
        hero_lead="Wir freuen uns ueber Rueckmeldungen und helfen bei offenen Fragen rund um das Projekt.",
        meta='<a class="meta-chip" href="mailto:support@example.com">support@example.com</a>',
        content=content,
    )


def marketing_terms() -> str:
    return textwrap.dedent(
        """\
        <!doctype html>
        <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Nutzungsbedingungen (Vorlage)</title>
        </head>
        <body>
          <h1>Nutzungsbedingungen (Vorlage)</h1>
          <p><strong>Hinweis:</strong> Diese Inhalte sind Platzhalter und keine Rechtsberatung.</p>
          <p>Bitte vor Veroeffentlichung rechtlich pruefen lassen.</p>

          <h2>1. Geltungsbereich</h2>
          <p>Vorlage-Text fuer den Geltungsbereich.</p>

          <h2>2. Nutzung des Dienstes</h2>
          <p>Vorlage-Text fuer erlaubte Nutzung und Pflichten.</p>

          <h2>3. Haftung</h2>
          <p>Vorlage-Text fuer Haftungsregelungen.</p>

          <h2>4. Aenderungen</h2>
          <p>Vorlage-Text fuer Anpassungen der Bedingungen.</p>

          <h2>5. Kontakt</h2>
          <p>[kontakt@example.com]</p>
        </body>
        </html>
        """
    )


def marketing_readme() -> str:
    return textwrap.dedent(
        """\
        # Marketing

        Dieser Ordner enthaelt statische Marketing-Seiten und Platzhalter-Assets.
        Enthaltene Rechts-/Support-Vorlagen:
        - `datenschutz.html`
        - `privacy.html` (Alias zu Datenschutz)
        - `support.html`
        - `impressum.html`
        - `kontakt.html`
        - `terms.html`

        Rechtlicher Hinweis:
        Bitte vor Veroeffentlichung rechtlich pruefen lassen.
        """
    )


def placeholders_readme() -> str:
    return textwrap.dedent(
        """\
        # Placeholders

        Dieser Ordner enthaelt Platzhalterdateien fuer spaetere echte Inhalte.
        """
    )


def scripts_readme() -> str:
    return textwrap.dedent(
        """\
        # Scripts

        Enthalten sind Installations-, Start- und Pruefskripte fuer lokale Entwicklung.
        Zusatzfunktion:
        - `install.sh --IEnvFile <datei.env>` (mehrfach moeglich)
        - `install.bat --IEnvFile <datei.env>` (mehrfach moeglich)
        - Alternativ: ein `--IEnvFile` gefolgt von mehreren Dateien
        Die angegebenen Dateien werden in die passenden Ziel-`.env` Dateien gemerged.

        Installations-Readmes:
        - `scripts/Readme_Installation.sh`
        - `scripts/Readme_Installation.bat`

        Mobile Expo lokal:
        - `scripts/start_mobile_tunnel.sh`
        """
    )


def readme_installation_sh() -> str:
    return textwrap.dedent(
        """\
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
        """
    )


def readme_installation_bat() -> str:
    return textwrap.dedent(
        """\
        @echo off
        rem Readme_Installation.bat
        rem
        rem Verwendung:
        rem   .\\scripts\\install.bat
        rem   .\\scripts\\install.bat --IEnvFile C:\\daten\\backend.env C:\\daten\\mobile.env
        rem   .\\scripts\\install.bat --IEnvFile .\\backend.env --IEnvFile .\\mobile.env
        rem
        rem Ziel-Mapping fuer --IEnvFile:
        rem   root      -> .env
        rem   backend   -> backend/.env
        rem   frontend  -> frontend/.env
        rem   mobile    -> mobile/.env
        rem   deploy    -> deploy/app.env
        """
    )


def install_sh() -> str:
    return textwrap.dedent(
        """\
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
        """
    )


def install_bat() -> str:
    return textwrap.dedent(
        """\
        @echo off
        setlocal EnableExtensions EnableDelayedExpansion

        for %%I in ("%~dp0..") do set "ROOT_DIR=%%~fI"
        set "BACKEND_DIR=%ROOT_DIR%\\backend"
        set "FRONTEND_DIR=%ROOT_DIR%\\frontend"
        set "MOBILE_DIR=%ROOT_DIR%\\mobile"
        set "IENV_ARGS="

        :parse_args
        if "%~1"=="" goto args_done
        if /I "%~1"=="--help" goto show_help
        if /I "%~1"=="-h" goto show_help
        if /I "%~1"=="--IEnvFile" (
            shift
            if "%~1"=="" (
                echo [FEHLER] --IEnvFile benoetigt einen Pfad.
                exit /b 2
            )
            set "NEXT=%~1"
            if "!NEXT:~0,2!"=="--" (
                echo [FEHLER] --IEnvFile benoetigt mindestens einen Pfad.
                exit /b 2
            )
            goto collect_ienv
        )
        set "ARG=%~1"
        if /I "!ARG:~0,11!"=="--IEnvFile=" (
            set "ENV_VAL=!ARG:~11!"
            if "!ENV_VAL!"=="" (
                echo [FEHLER] --IEnvFile= darf nicht leer sein.
                exit /b 2
            )
            set "IENV_ARGS=!IENV_ARGS! --ienvfile ^"!ENV_VAL!^""
            shift
            goto parse_args
        )
        echo [FEHLER] Unbekanntes Argument: %~1
        goto show_help_err

        :collect_ienv
        if "%~1"=="" goto args_done
        set "NEXT=%~1"
        if "!NEXT:~0,2!"=="--" goto parse_args
        set "IENV_ARGS=!IENV_ARGS! --ienvfile ^"%~1^""
        shift
        goto collect_ienv

        :show_help
        echo Usage:
        echo   .\\scripts\\install.bat [--IEnvFile ^<pfad-oder-glob^> [weitere-pfade...]]...
        echo.
        echo Example:
        echo   .\\scripts\\install.bat --IEnvFile C:\\daten\\backend.env C:\\daten\\mobile.env
        echo   .\\scripts\\install.bat --IEnvFile .\\backend.env --IEnvFile .\\mobile.env
        exit /b 0

        :show_help_err
        echo Usage:
        echo   .\\scripts\\install.bat [--IEnvFile ^<pfad-oder-glob^> [weitere-pfade...]]...
        exit /b 2

        :args_done
        where py >nul 2>nul
        if %errorlevel%==0 (
            set "PYTHON=py -3"
        ) else (
            where python >nul 2>nul || (echo [FEHLER] Python 3 nicht gefunden. & exit /b 1)
            set "PYTHON=python"
        )
        where node >nul 2>nul || (echo [FEHLER] Node.js nicht gefunden. & exit /b 1)
        where npm >nul 2>nul || (echo [FEHLER] npm nicht gefunden. & exit /b 1)

        if not exist "%ROOT_DIR%\\.env" copy "%ROOT_DIR%\\.env.example" "%ROOT_DIR%\\.env" >nul
        if not exist "%BACKEND_DIR%\\.env" copy "%BACKEND_DIR%\\.env.example" "%BACKEND_DIR%\\.env" >nul
        if not exist "%FRONTEND_DIR%\\.env" copy "%FRONTEND_DIR%\\.env.example" "%FRONTEND_DIR%\\.env" >nul
        if not exist "%MOBILE_DIR%\\.env" copy "%MOBILE_DIR%\\.env.example" "%MOBILE_DIR%\\.env" >nul
        if not exist "%ROOT_DIR%\\deploy\\app.env" copy "%ROOT_DIR%\\deploy\\app.env.example" "%ROOT_DIR%\\deploy\\app.env" >nul

        if not "!IENV_ARGS!"=="" (
            echo [INFO] Merge von --IEnvFile Dateien...
            call %PYTHON% "%ROOT_DIR%\\scripts\\apply_env_inputs.py" --root "%ROOT_DIR%" !IENV_ARGS! || exit /b 1
        ) else (
            echo [INFO] Kein --IEnvFile uebergeben, Env-Merge wird uebersprungen.
        )

        if exist "%BACKEND_DIR%\\.venv\\Scripts\\python.exe" (
            set "VENV_PYTHON=%BACKEND_DIR%\\.venv\\Scripts\\python.exe"
        ) else if exist "%BACKEND_DIR%\\venv\\Scripts\\python.exe" (
            set "VENV_PYTHON=%BACKEND_DIR%\\venv\\Scripts\\python.exe"
        ) else (
            call %PYTHON% -m venv "%BACKEND_DIR%\\.venv" || (echo [FEHLER] Virtualenv konnte nicht erstellt werden. & exit /b 1)
            set "VENV_PYTHON=%BACKEND_DIR%\\.venv\\Scripts\\python.exe"
        )
        call "%VENV_PYTHON%" -m pip install --upgrade pip || exit /b 1
        call "%VENV_PYTHON%" -m pip install -r "%BACKEND_DIR%\\requirements.txt" || exit /b 1

        pushd "%FRONTEND_DIR%" || exit /b 1
        call npm install --include=dev || (popd & exit /b 1)
        popd

        pushd "%MOBILE_DIR%" || exit /b 1
        call npm install --include=dev || (popd & exit /b 1)
        popd

        call %PYTHON% "%ROOT_DIR%\\scripts\\check_env.py"
        echo [OK] Installation abgeschlossen.
        echo Backend starten:  .\\scripts\\start_win.ps1
        exit /b 0
        """
    )


def apply_env_inputs_py() -> str:
    return textwrap.dedent(
        """\
        #!/usr/bin/env python3
        from __future__ import annotations

        import argparse
        import glob
        import re
        import sys
        from pathlib import Path


        KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
        ASSIGN_RE = re.compile(r"^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=")


        def parse_args() -> argparse.Namespace:
            parser = argparse.ArgumentParser(
                description="Merge user-provided env files into project env targets."
            )
            parser.add_argument("--root", required=True, help="Project root")
            parser.add_argument(
                "--ienvfile",
                action="append",
                default=[],
                help="Input env file path or glob pattern (repeatable)",
            )
            return parser.parse_args()


        def expand_sources(raw_inputs: list[str]) -> list[Path]:
            expanded: list[Path] = []
            for item in raw_inputs:
                matches = [Path(path) for path in glob.glob(item)]
                if matches:
                    expanded.extend(matches)
                else:
                    expanded.append(Path(item))
            return expanded


        def read_env_values(source: Path) -> dict[str, str]:
            values: dict[str, str] = {}
            for line in source.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if not stripped or stripped.startswith("#") or "=" not in stripped:
                    continue
                if stripped.startswith("export "):
                    stripped = stripped[len("export ") :].strip()
                key, value = stripped.split("=", 1)
                key = key.strip()
                if not KEY_RE.match(key):
                    continue
                values[key] = value
            return values


        def target_for_source(root: Path, source: Path, values: dict[str, str]) -> Path:
            name = source.name.lower()
            as_posix = source.as_posix().lower()
            keys = set(values.keys())

            if "backend" in as_posix or name in {"backend.env", ".env.backend"}:
                return root / "backend/.env"
            if "frontend" in as_posix or name in {"frontend.env", ".env.frontend"}:
                return root / "frontend/.env"
            if "mobile" in as_posix or name in {"mobile.env", ".env.mobile"}:
                return root / "mobile/.env"

            if "deploy" in as_posix or name in {
                "app.env",
                ".app.env",
                "deploy.app.env",
                "app.deploy.env",
            }:
                return root / "deploy/app.env"

            backend_prefixes = ("DJANGO_", "POSTGRES_", "GOOGLE_OAUTH_", "SUPERUSER_")
            deploy_prefixes = ("APP_", "DB_")

            if any(key.startswith("VITE_") for key in keys):
                return root / "frontend/.env"
            if any(key.startswith("EXPO_PUBLIC_") for key in keys):
                return root / "mobile/.env"
            if any(key.startswith(prefix) for key in keys for prefix in backend_prefixes):
                return root / "backend/.env"
            if {
                "AUTO_CREATE_SUPERUSER",
                "CORS_ALLOWED_ORIGINS",
                "CSRF_TRUSTED_ORIGINS",
            } & keys:
                return root / "backend/.env"
            if any(key.startswith(prefix) for key in keys for prefix in deploy_prefixes):
                return root / "deploy/app.env"

            if name in {".env", "root.env", "project.env"}:
                return root / ".env"

            return root / ".env"


        def merge_values_into_target(target: Path, updates: dict[str, str]) -> None:
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                lines = target.read_text(encoding="utf-8").splitlines(keepends=True)
            else:
                lines = []
            touched: set[str] = set()
            merged: list[str] = []

            for line in lines:
                match = ASSIGN_RE.match(line)
                if match:
                    key = match.group(1)
                    if key in updates:
                        merged.append(f"{key}={updates[key]}\\n")
                        touched.add(key)
                        continue
                merged.append(line)

            for key, value in updates.items():
                if key not in touched:
                    if merged and not merged[-1].endswith("\\n"):
                        merged[-1] = merged[-1] + "\\n"
                    merged.append(f"{key}={value}\\n")

            target.write_text("".join(merged), encoding="utf-8")


        def main() -> int:
            args = parse_args()
            root = Path(args.root).resolve()
            if not root.exists():
                print(f"[ERROR] Root not found: {root}", file=sys.stderr)
                return 2

            if not args.ienvfile:
                print("[INFO] No --ienvfile entries provided. Nothing to merge.")
                return 0

            merged_any = False
            for source in expand_sources(args.ienvfile):
                if not source.exists() or not source.is_file():
                    print(f"[WARN] Input env file not found: {source}")
                    continue
                values = read_env_values(source)
                if not values:
                    print(f"[WARN] No KEY=VALUE entries in: {source}")
                    continue
                target = target_for_source(root, source, values)
                merge_values_into_target(target, values)
                print(f"[INFO] Merged {source} -> {target}")
                merged_any = True

            if not merged_any:
                print("[WARN] No env files were merged.")
                return 1

            print("[OK] Env merge completed.")
            return 0


        if __name__ == "__main__":
            sys.exit(main())
        """
    )


def start_backend_sh() -> str:
    return textwrap.dedent(
        """\
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
                    (ip ~ /^192\\.168\\./ || ip ~ /^10\\./ ||
                     ip ~ /^172\\.(1[6-9]|2[0-9]|3[01])\\./)) {
                  print ip; exit
                }
              }' || true)"
          fi
          # Linux mit iproute2
          if [ -z "$local_ip" ] && command -v ip >/dev/null 2>&1; then
            local_ip="$(ip -4 -o addr show scope global 2>/dev/null \\
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
          if echo "$configured" | grep -q '\\*'; then
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
        """
    )


def start_frontend_sh() -> str:
    return textwrap.dedent(
        """\
        #!/usr/bin/env bash
        set -euo pipefail

        ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
        cd "$ROOT_DIR/frontend"

        if [ ! -f .env ]; then
          cp .env.example .env
        fi

        npm install --include=dev >/dev/null
        npm run dev
        """
    )


def start_mobile_sh() -> str:
    return textwrap.dedent(
        """\
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
                    (ip ~ /^192\\.168\\./ || ip ~ /^10\\./ ||
                     ip ~ /^172\\.(1[6-9]|2[0-9]|3[01])\\./)) {
                  print ip; exit
                }
              }' || true)"
          fi
          if [ -z "$local_ip" ] && command -v ip >/dev/null 2>&1; then
            local_ip="$(ip -4 -o addr show scope global 2>/dev/null \\
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

        LOCAL_IP="$(resolve_local_ip)"
        API_BASE_URL="$(resolve_api_base_url)"
        export EXPO_PUBLIC_API_BASE_URL="$API_BASE_URL"
        echo "[INFO] EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL"

        # .env.local schreiben: garantiert, dass Expo Metro die aktuelle URL in den Bundle inlined.
        # User-.env bleibt unangetastet; .env.local ueberschreibt nur EXPO_PUBLIC_API_BASE_URL.
        {
          echo "# Auto-generiert von start_mobile.sh bei jedem Start - nicht von Hand editieren."
          echo "EXPO_PUBLIC_API_BASE_URL=$API_BASE_URL"
        } > .env.local
        echo "[INFO] mobile/.env.local aktualisiert."

        # Metro-Bundler an dieselbe LAN-IP binden -> QR-Code im Handy zeigt die richtige Adresse.
        if [ -n "$LOCAL_IP" ]; then
          export REACT_NATIVE_PACKAGER_HOSTNAME="$LOCAL_IP"
          echo "[INFO] REACT_NATIVE_PACKAGER_HOSTNAME=$REACT_NATIVE_PACKAGER_HOSTNAME"
        else
          echo "[WARN] Konnte keine LAN-IP ermitteln. Expo Go erreicht den Mac/PC ggf. nicht."
        fi

        # macOS-Firewall-Hinweis (8081 Metro, 8000 Backend)
        if [ "$(uname)" = "Darwin" ] && [ -x /usr/libexec/ApplicationFirewall/socketfilterfw ]; then
          fw_state="$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || true)"
          if echo "$fw_state" | grep -qi 'enabled'; then
            echo "[HINWEIS] macOS-Firewall ist aktiv. Falls Expo Go timeoutet:"
            echo "          Systemeinstellungen -> Netzwerk -> Firewall -> Optionen -> 'node' eingehende Verbindungen erlauben."
          fi
        fi

        if echo "$EXPO_PUBLIC_API_BASE_URL" | grep -E '^https?://(localhost|127\\.0\\.0\\.1)(:|/|$)' >/dev/null 2>&1; then
          echo "[HINWEIS] localhost zeigt in Expo Go auf das Handy selbst."
          echo "         Setze in mobile/.env EXPO_PUBLIC_API_BASE_URL auf eine LAN-Adresse (z. B. http://192.168.x.x:8000)."
        fi
        if command -v curl >/dev/null 2>&1; then
          if ! curl -fsS "$EXPO_PUBLIC_API_BASE_URL/api/health/" >/dev/null 2>&1; then
            echo "[WARN] Backend unter $EXPO_PUBLIC_API_BASE_URL nicht erreichbar. Starte ggf. ./scripts/start_backend.sh"
          fi
        fi

        npm install --include=dev >/dev/null

        # Bundle-Cache invalidieren - sonst haelt Metro alte EXPO_PUBLIC_*-Werte fest.
        echo "[INFO] Bundle-Cache aufraeumen (.expo, node_modules/.cache, watchman) ..."
        rm -rf .expo node_modules/.cache 2>/dev/null || true
        if command -v watchman >/dev/null 2>&1; then
          watchman watch-del-all >/dev/null 2>&1 || true
        fi

        npx expo start --host lan --clear
        """
    )


def start_mobile_tunnel_sh() -> str:
    return textwrap.dedent(
        """\
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
                    (ip ~ /^192\\.168\\./ || ip ~ /^10\\./ ||
                     ip ~ /^172\\.(1[6-9]|2[0-9]|3[01])\\./)) {
                  print ip; exit
                }
              }' || true)"
          fi
          if [ -z "$local_ip" ] && command -v ip >/dev/null 2>&1; then
            local_ip="$(ip -4 -o addr show scope global 2>/dev/null \\
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

        if echo "$EXPO_PUBLIC_API_BASE_URL" | grep -E '^https?://(localhost|127\\.0\\.0\\.1)(:|/|$)' >/dev/null 2>&1; then
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
        """
    )


def start_mac_sh() -> str:
    return textwrap.dedent(
        """\
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
        """
    )


def start_win_ps1() -> str:
    return textwrap.dedent(
        """\
        Param()

        $Root = Split-Path -Parent $PSScriptRoot

        function Ensure-EnvFile($ExamplePath, $TargetPath) {
          if (-not (Test-Path $TargetPath)) {
            Copy-Item $ExamplePath $TargetPath
          }
        }

        function Resolve-LocalIp() {
          $localIp = $null
          # 1) Default-Route Interface bevorzugen (das eine, das wirklich ins Internet/WLAN geht)
          try {
            $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
                     Sort-Object -Property RouteMetric, InterfaceMetric |
                     Select-Object -First 1
            if ($route) {
              $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                    Where-Object {
                      $_.IPAddress -notlike '169.254.*' -and
                      $_.IPAddress -ne '127.0.0.1'
                    } |
                    Select-Object -First 1 -ExpandProperty IPAddress
              if ($ip) { $localIp = $ip }
            }
          } catch {}
          # 2) Fallback: physischer Adapter mit RFC1918, virtuelle/WSL/Hyper-V/Docker-Adapter ausschliessen
          if (-not $localIp) {
            try {
              $localIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
                Where-Object {
                  $_.IPAddress -notlike '169.254.*' -and
                  $_.IPAddress -ne '127.0.0.1' -and
                  ($_.IPAddress -like '192.168.*' -or
                   $_.IPAddress -like '10.*' -or
                   $_.IPAddress -match '^172\\.(1[6-9]|2[0-9]|3[01])\\.') -and
                  $_.InterfaceAlias -notmatch '(?i)(vEthernet|Hyper-V|WSL|VMware|VirtualBox|Loopback|Bluetooth|Docker|Tailscale|ZeroTier)'
                } |
                Sort-Object -Property InterfaceMetric |
                Select-Object -First 1 -ExpandProperty IPAddress
            } catch {}
          }
          return $localIp
        }

        function Resolve-MobileApiBaseUrl($MobileEnvPath) {
          $configured = ""
          if (Test-Path $MobileEnvPath) {
            $line = Get-Content $MobileEnvPath | Where-Object { $_ -match '^EXPO_PUBLIC_API_BASE_URL=' } | Select-Object -Last 1
            if ($line) {
              $configured = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
            }
          }

          if ($configured -and $configured -ne "auto") {
            return $configured
          }

          $localIp = Resolve-LocalIp

          if ($localIp) {
            return "http://$localIp`:8000"
          }

          return "http://localhost:8000"
        }

        function Resolve-BackendAllowedHosts($BackendEnvPath) {
          $configured = ""
          if (Test-Path $BackendEnvPath) {
            $line = Get-Content $BackendEnvPath | Where-Object { $_ -match '^DJANGO_ALLOWED_HOSTS=' } | Select-Object -Last 1
            if ($line) {
              $configured = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
            }
          }

          if (-not $configured) {
            $configured = "localhost,127.0.0.1"
          }
          if ($configured -match '\\*') {
            return $configured
          }

          $localIp = Resolve-LocalIp

          if ($localIp) {
            $items = $configured.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
            if ($items -notcontains $localIp) {
              $configured = "$configured,$localIp"
            }
          }
          return $configured
        }

        Write-Host "[1/4] Env-Dateien vorbereiten..."
        Ensure-EnvFile "$Root/.env.example" "$Root/.env"
        Ensure-EnvFile "$Root/backend/.env.example" "$Root/backend/.env"
        Ensure-EnvFile "$Root/frontend/.env.example" "$Root/frontend/.env"
        Ensure-EnvFile "$Root/mobile/.env.example" "$Root/mobile/.env"

        if (Get-Command docker -ErrorAction SilentlyContinue) {
          Write-Host "[2/4] Starte PostgreSQL mit docker compose..."
          Push-Location $Root
          docker compose -f deploy/docker-compose.yml up -d postgres
          Pop-Location
        } else {
          Write-Host "[2/4] Docker nicht gefunden, postgres uebersprungen."
        }

        Write-Host "[3/4] Starte Backend in neuem Fenster..."
        $backendAllowedHosts = Resolve-BackendAllowedHosts "$Root/backend/.env"
        Write-Host "[INFO] DJANGO_ALLOWED_HOSTS=$backendAllowedHosts"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/backend'; $env:DJANGO_ALLOWED_HOSTS='$backendAllowedHosts'; if (Test-Path .venv) { $venv='.venv' } elseif (Test-Path venv) { $venv='venv' } else { python -m venv .venv; $venv='.venv' }; . ""$venv/Scripts/Activate.ps1""; pip install -r requirements.txt; python manage.py ensure_database; python manage.py migrate; python manage.py ensure_superuser; python manage.py runserver"

        Write-Host "[4/4] Starte Frontend und Mobile..."
        $mobileApiBaseUrl = Resolve-MobileApiBaseUrl "$Root/mobile/.env"
        $mobileLocalIp = Resolve-LocalIp
        Write-Host "[INFO] EXPO_PUBLIC_API_BASE_URL=$mobileApiBaseUrl"
        if ($mobileLocalIp) {
          Write-Host "[INFO] REACT_NATIVE_PACKAGER_HOSTNAME=$mobileLocalIp"
        } else {
          Write-Host "[WARN] Konnte keine LAN-IP ermitteln. Expo Go erreicht den PC ggf. nicht."
        }
        if ($mobileApiBaseUrl -match '^https?://(localhost|127\\.0\\.0\\.1)(:|/|$)') {
          Write-Host "[HINWEIS] localhost zeigt in Expo Go auf dem Handy auf das Handy selbst."
          Write-Host "         Setze in mobile/.env EXPO_PUBLIC_API_BASE_URL=auto (empfohlen) oder eine explizite LAN-Adresse."
        }
        # Windows-Defender-Firewall blockt Node oft beim ersten Start - Hinweis ausgeben.
        Write-Host "[HINWEIS] Falls Expo Go beim Scan timeoutet: Windows-Firewall fragt beim 1. Start nach 'node' -> 'Privates Netzwerk' erlauben."

        # .env.local schreiben, damit Expo Metro die aktuelle URL garantiert in den Bundle inlined.
        $envLocalPath = "$Root/mobile/.env.local"
        @(
          "# Auto-generiert von start_win.ps1 bei jedem Start - nicht von Hand editieren.",
          "EXPO_PUBLIC_API_BASE_URL=$mobileApiBaseUrl"
        ) | Set-Content -Path $envLocalPath -Encoding UTF8
        Write-Host "[INFO] mobile/.env.local aktualisiert."

        # Bundle-Cache invalidieren - sonst haelt Metro alte EXPO_PUBLIC_*-Werte fest.
        Write-Host "[INFO] Bundle-Cache aufraeumen (.expo, node_modules/.cache) ..."
        Remove-Item -Recurse -Force "$Root/mobile/.expo" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "$Root/mobile/node_modules/.cache" -ErrorAction SilentlyContinue

        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/frontend'; npm install --include=dev; npm run dev"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root/mobile'; `$env:EXPO_PUBLIC_API_BASE_URL='$mobileApiBaseUrl'; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$mobileLocalIp'; npm install --include=dev; npx expo start --host lan --clear"
        """
    )


def check_env_py() -> str:
    return textwrap.dedent(
        """\
        #!/usr/bin/env python3
        # Basic env consistency checks for generated template.

        from pathlib import Path
        import sys


        REQUIRED = [
            ".env.example",
            "deploy/app.env.example",
            "backend/.env.example",
            "frontend/.env.example",
            "mobile/.env.example",
            "mobile/eas.json",
        ]


        def main() -> int:
            root = Path(__file__).resolve().parent.parent
            missing = [item for item in REQUIRED if not (root / item).exists()]
            if missing:
                print("Missing required env templates:")
                for item in missing:
                    print(f"- {item}")
                return 1
            print("All required .env.example files are present.")
            return 0


        if __name__ == "__main__":
            sys.exit(main())
        """
    )


def vscode_launch_json() -> str:
    payload = {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Django Backend",
                "type": "python",
                "request": "launch",
                "program": "${workspaceFolder}/backend/manage.py",
                "args": ["runserver", "0.0.0.0:8000"],
                "django": True,
                "justMyCode": True,
                "envFile": "${workspaceFolder}/backend/.env",
            },
            {
                "name": "React Frontend",
                "type": "chrome",
                "request": "launch",
                "url": "http://localhost:5173",
                "webRoot": "${workspaceFolder}/frontend/src",
            },
            {
                "name": "Mobile / Expo (Hinweis)",
                "type": "node",
                "request": "launch",
                "program": "${workspaceFolder}/mobile/node_modules/.bin/expo",
                "args": ["start"],
                "console": "integratedTerminal",
                "skipFiles": ["<node_internals>/**"],
            },
        ],
        "compounds": [
            {
                "name": "Backend + Frontend",
                "configurations": ["Django Backend", "React Frontend"],
            }
        ],
    }
    return json.dumps(payload, indent=2) + "\n"


def vscode_tasks_json() -> str:
    payload = {
        "version": "2.0.0",
        "tasks": [
            {
                "label": "Install Backend",
                "type": "shell",
                "command": "cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt",
            },
            {
                "label": "Install Frontend",
                "type": "shell",
                "command": "cd frontend && npm install --include=dev",
            },
            {
                "label": "Install Mobile",
                "type": "shell",
                "command": "cd mobile && npm install --include=dev",
            },
            {
                "label": "Start Backend",
                "type": "shell",
                "command": "./scripts/start_backend.sh",
            },
            {
                "label": "Start Frontend",
                "type": "shell",
                "command": "./scripts/start_frontend.sh",
            },
            {
                "label": "Start Mobile",
                "type": "shell",
                "command": "./scripts/start_mobile.sh",
            },
            {
                "label": "Docker Compose Up",
                "type": "shell",
                "command": "docker compose -f deploy/docker-compose.yml up -d",
            },
        ],
    }
    return json.dumps(payload, indent=2) + "\n"


def vscode_settings_json() -> str:
    payload = {
        "editor.formatOnSave": True,
        "files.exclude": {
            "**/__pycache__": True,
            "**/.pytest_cache": True,
        },
    }
    return json.dumps(payload, indent=2) + "\n"


def project_jenkinsfile() -> str:
    return textwrap.dedent(
        """\
        pipeline {
          agent any
          options { skipDefaultCheckout(true) }

          parameters {
            string(name: 'PROJECT_NAME', defaultValue: 'Meine Super App', description: 'Name des Zielprojekts')
            string(name: 'OUTPUT_DIR', defaultValue: '', description: 'Optionales Zielverzeichnis. Leer = WORKSPACE')
            string(name: 'GIT_CREDENTIALS_ID', defaultValue: '', description: 'Optional: Jenkins Credentials ID fuer GitHub Checkout (PAT/Token)')
            booleanParam(name: 'CREATE_BACKEND', defaultValue: true, description: 'Backend generieren')
            booleanParam(name: 'CREATE_FRONTEND', defaultValue: true, description: 'Frontend generieren')
            booleanParam(name: 'CREATE_MOBILE', defaultValue: true, description: 'Mobile generieren')
            booleanParam(name: 'CREATE_MARKETING', defaultValue: true, description: 'Marketing-Seiten generieren')
            booleanParam(name: 'CREATE_ASSETS', defaultValue: true, description: 'Assets-Struktur generieren')
            booleanParam(name: 'USE_POSTGRES', defaultValue: true, description: 'Docker/Postgres-Konfiguration generieren')
            booleanParam(name: 'INIT_GIT', defaultValue: true, description: 'git init ausfuehren')
            booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Nur Simulation')
          }

          environment {
            GENERATOR = 'scripts/generate_project.py'
            GENERATOR_OUTPUT_DIR = ''
          }

          stages {
            stage('Checkout Repository') {
              steps {
                script {
                  def repoUrl = 'https://github.com/aerkilic/Django_Generator.git'
                  def branch = 'main'
                  if (params.GIT_CREDENTIALS_ID?.trim()) {
                    git branch: branch, url: repoUrl, credentialsId: params.GIT_CREDENTIALS_ID.trim()
                  } else {
                    git branch: branch, url: repoUrl
                  }
                }
              }
            }

            stage('Validate Parameters') {
              steps {
                script {
                  if (!params.PROJECT_NAME?.trim()) {
                    error('PROJECT_NAME darf nicht leer sein.')
                  }
                  env.GENERATOR_OUTPUT_DIR = params.OUTPUT_DIR?.trim() ? params.OUTPUT_DIR.trim() : env.WORKSPACE
                }
              }
            }

            stage('Prepare Workspace') {
              steps {
                sh 'python3 --version'
                sh '''
                  if [ ! -f "${GENERATOR}" ]; then
                    echo "[ERROR] ${GENERATOR} not found in workspace: ${WORKSPACE}"
                    echo "[HINT] Ensure the repository is checked out and contains scripts/generate_project.py"
                    ls -la
                    exit 1
                  fi
                '''
                sh 'chmod +x ${GENERATOR}'
              }
            }

            stage('Generate Project Structure') {
              steps {
                sh '''
                  python3 ${GENERATOR} --task structure --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                '''
              }
            }

            stage('Generate Backend') {
              steps {
                script {
                  if (params.CREATE_BACKEND) {
                    sh '''
                      python3 ${GENERATOR} --task backend --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend true --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Frontend') {
              steps {
                script {
                  if (params.CREATE_FRONTEND) {
                    sh '''
                      python3 ${GENERATOR} --task frontend --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend true --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Mobile') {
              steps {
                script {
                  if (params.CREATE_MOBILE) {
                    sh '''
                      python3 ${GENERATOR} --task mobile --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile true --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Marketing Pages') {
              steps {
                script {
                  if (params.CREATE_MARKETING) {
                    sh '''
                      python3 ${GENERATOR} --task marketing --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing true --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Assets Structure') {
              steps {
                script {
                  if (params.CREATE_ASSETS) {
                    sh '''
                      python3 ${GENERATOR} --task assets --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets true --postgres false --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Env Files') {
              steps {
                sh '''
                  python3 ${GENERATOR} --task env --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                '''
              }
            }

            stage('Generate Docker/Postgres Config') {
              steps {
                script {
                  if (params.USE_POSTGRES) {
                    sh '''
                      python3 ${GENERATOR} --task docker --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres true --init-git false --dry-run ${DRY_RUN}
                    '''
                  }
                }
              }
            }

            stage('Generate Git Files') {
              steps {
                sh '''
                  python3 ${GENERATOR} --task git --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git ${INIT_GIT} --dry-run ${DRY_RUN}
                '''
              }
            }

            stage('Generate Install/Start Scripts') {
              steps {
                sh '''
                  python3 ${GENERATOR} --task scripts --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                '''
              }
            }

            stage('Generate VS Code Debug Config') {
              steps {
                sh '''
                  python3 ${GENERATOR} --task vscode --project-name "${PROJECT_NAME}" --output-dir "${GENERATOR_OUTPUT_DIR}" --backend false --frontend false --mobile false --marketing false --assets false --postgres false --init-git false --dry-run ${DRY_RUN}
                '''
              }
            }

            stage('Run Basic Checks') {
              steps {
                sh 'python3 -m py_compile ${GENERATOR}'
                script {
                  if (params.DRY_RUN) {
                    echo 'DRY_RUN=true: no install/git actions executed.'
                  }
                }
              }
            }

            stage('Print Summary') {
              steps {
                echo "PROJECT_NAME=${params.PROJECT_NAME}"
                echo "OUTPUT_DIR=${params.OUTPUT_DIR}"
                echo "GIT_CREDENTIALS_ID=${params.GIT_CREDENTIALS_ID}"
                echo "GENERATOR_OUTPUT_DIR=${env.GENERATOR_OUTPUT_DIR}"
                echo "CREATE_BACKEND=${params.CREATE_BACKEND}"
                echo "CREATE_FRONTEND=${params.CREATE_FRONTEND}"
                echo "CREATE_MOBILE=${params.CREATE_MOBILE}"
                echo "CREATE_MARKETING=${params.CREATE_MARKETING}"
                echo "CREATE_ASSETS=${params.CREATE_ASSETS}"
                echo "USE_POSTGRES=${params.USE_POSTGRES}"
                echo "INIT_GIT=${params.INIT_GIT}"
                echo "DRY_RUN=${params.DRY_RUN}"
              }
            }
          }
        }
        """
    )


def jenkinsfile_mobile_expo() -> str:
    return textwrap.dedent(
        """\
        pipeline {
          agent any

          parameters {
            booleanParam(name: 'RUN_EXPO_DOCTOR', defaultValue: true, description: 'Run expo checks before build')
            string(name: 'EXPO_ENVIRONMENT', defaultValue: 'production', description: 'EAS environment name')
            string(name: 'EXPO_TOKEN_CREDENTIAL_ID', defaultValue: 'EXPO_TOKEN', description: 'Jenkins Secret Text credential id for Expo token')
            string(name: 'EAS_PROFILE', defaultValue: 'production', description: 'EAS build profile from mobile/eas.json')
            choice(name: 'PLATFORM', choices: ['ios', 'android', 'all'], description: 'Platform to build')
          }

          environment {
            MOBILE_DIR = 'mobile'
            EAS_BUILD_NO_EXPO_GO_WARNING = 'true'
            CI = '1'
          }

          stages {
            stage('Checkout') {
              steps {
                checkout scm
              }
            }

            stage('Validate Project Structure') {
              steps {
                sh '''
                  test -f "${MOBILE_DIR}/package.json" || { echo "Missing file: ${MOBILE_DIR}/package.json"; exit 1; }
                  test -f "${MOBILE_DIR}/app.json" || { echo "Missing file: ${MOBILE_DIR}/app.json"; exit 1; }
                  test -f "${MOBILE_DIR}/eas.json" || { echo "Missing file: ${MOBILE_DIR}/eas.json"; exit 1; }
                '''
              }
            }

            stage('Install Node Dependencies') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  sh '''
                    node --version
                    npm --version

                    if [ -f package-lock.json ]; then
                      npm ci
                    else
                      npm install
                    fi
                  '''
                }
              }
            }

            stage('Install EAS CLI') {
              steps {
                sh '''
                  npm install -g eas-cli
                  eas --version
                '''
              }
            }

            stage('Validate EXPO_TOKEN') {
              steps {
                script {
                  if (!params.EXPO_TOKEN_CREDENTIAL_ID?.trim()) {
                    error('EXPO_TOKEN_CREDENTIAL_ID is empty. Please provide a Jenkins Secret Text credential id (for example: EXPO_TOKEN).')
                  }
                  withCredentials([string(credentialsId: params.EXPO_TOKEN_CREDENTIAL_ID.trim(), variable: 'EXPO_TOKEN')]) {
                    sh '''
                      if [ -z "$EXPO_TOKEN" ]; then
                        echo "EXPO_TOKEN is missing. Aborting build."
                        exit 1
                      fi
                      echo "EXPO_TOKEN credential loaded."
                    '''
                  }
                }
              }
            }

            stage('Expo Checks (optional)') {
              when {
                expression { return params.RUN_EXPO_DOCTOR }
              }
              steps {
                dir("${env.MOBILE_DIR}") {
                  script {
                    withCredentials([string(credentialsId: params.EXPO_TOKEN_CREDENTIAL_ID.trim(), variable: 'EXPO_TOKEN')]) {
                      sh '''
                        set +e
                        npx expo install --check
                        EXPO_INSTALL_CHECK_EXIT=$?
                        npx expo-doctor
                        EXPO_DOCTOR_EXIT=$?
                        set -e

                        if [ "$EXPO_INSTALL_CHECK_EXIT" -ne 0 ] || [ "$EXPO_DOCTOR_EXIT" -ne 0 ]; then
                          echo "Expo checks reported issues (install-check=$EXPO_INSTALL_CHECK_EXIT, doctor=$EXPO_DOCTOR_EXIT)."
                          echo "Continuing pipeline because expo checks are non-blocking in this pipeline."
                        else
                          echo "Expo checks passed."
                        fi
                      '''
                    }
                  }
                }
              }
            }

            stage('EAS Build') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  script {
                    withCredentials([string(credentialsId: params.EXPO_TOKEN_CREDENTIAL_ID.trim(), variable: 'EXPO_TOKEN')]) {
                      sh '''
                        EAS_ENV_SUPPORTED=0
                        if eas build --help 2>/dev/null | grep -q -- "--environment"; then
                          EAS_ENV_SUPPORTED=1
                          echo "eas-cli supports --environment. Using EXPO_ENVIRONMENT=${EXPO_ENVIRONMENT}."
                        else
                          echo "eas-cli does not support --environment. Building without this flag."
                        fi

                        if [ "$PLATFORM" = "ios" ]; then
                          if [ "$EAS_ENV_SUPPORTED" -eq 1 ]; then
                            eas build --platform ios --profile "${EAS_PROFILE}" --environment "${EXPO_ENVIRONMENT}" --non-interactive --wait
                          else
                            eas build --platform ios --profile "${EAS_PROFILE}" --non-interactive --wait
                          fi
                        elif [ "$PLATFORM" = "android" ]; then
                          if [ "$EAS_ENV_SUPPORTED" -eq 1 ]; then
                            eas build --platform android --profile "${EAS_PROFILE}" --environment "${EXPO_ENVIRONMENT}" --non-interactive --wait
                          else
                            eas build --platform android --profile "${EAS_PROFILE}" --non-interactive --wait
                          fi
                        elif [ "$PLATFORM" = "all" ]; then
                          if [ "$EAS_ENV_SUPPORTED" -eq 1 ]; then
                            eas build --platform ios --profile "${EAS_PROFILE}" --environment "${EXPO_ENVIRONMENT}" --non-interactive --wait
                            eas build --platform android --profile "${EAS_PROFILE}" --environment "${EXPO_ENVIRONMENT}" --non-interactive --wait
                          else
                            eas build --platform ios --profile "${EAS_PROFILE}" --non-interactive --wait
                            eas build --platform android --profile "${EAS_PROFILE}" --non-interactive --wait
                          fi
                        else
                          echo "Unsupported PLATFORM: $PLATFORM"
                          exit 1
                        fi
                      '''
                    }
                  }
                }
              }
            }
          }

          post {
            success {
              echo 'EAS build pipeline finished successfully.'
            }
            failure {
              echo 'EAS build pipeline failed. Check Jenkins logs.'
            }
            always {
              sh '''
                rm -rf ~/.npm/_cacache/tmp || true
              '''
            }
          }
        }
        """
    )


def jenkinsfile_mobile_submit_ios() -> str:
    return textwrap.dedent(
        """\
        pipeline {
          agent any

          parameters {
            string(name: 'EXPO_TOKEN_CREDENTIAL_ID', defaultValue: 'EXPO_TOKEN', description: 'Jenkins Secret Text credential id for Expo token')
            string(name: 'ASC_APP_ID', defaultValue: '', description: 'Optional App Store Connect app id. If set, it is injected into mobile/eas.json for this run.')
            string(name: 'EAS_PROFILE', defaultValue: 'production', description: 'EAS submit profile from mobile/eas.json')
          }

          environment {
            MOBILE_DIR = 'mobile'
            CI = '1'
          }

          stages {
            stage('Checkout') {
              steps {
                checkout scm
              }
            }

            stage('Validate Project Structure') {
              steps {
                sh '''
                  test -f "${MOBILE_DIR}/package.json" || { echo "Missing file: ${MOBILE_DIR}/package.json"; exit 1; }
                  test -f "${MOBILE_DIR}/app.json" || { echo "Missing file: ${MOBILE_DIR}/app.json"; exit 1; }
                  test -f "${MOBILE_DIR}/eas.json" || { echo "Missing file: ${MOBILE_DIR}/eas.json"; exit 1; }
                '''
              }
            }

            stage('Install Node Dependencies') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  sh '''
                    node --version
                    npm --version

                    if [ -f package-lock.json ]; then
                      npm ci
                    else
                      npm install
                    fi
                  '''
                }
              }
            }

            stage('Install EAS CLI') {
              steps {
                sh '''
                  npm install -g eas-cli
                  eas --version
                '''
              }
            }

            stage('Prepare Submit Profile') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  script {
                    sh '''
                      node -e "const fs=require('fs');const profile=(process.env.EAS_PROFILE||'production').trim();const p='eas.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.submit=j.submit||{};j.submit[profile]=j.submit[profile]||{};j.submit[profile].ios=j.submit[profile].ios||{};const fromParam=(process.env.ASC_APP_ID||'').trim();if(fromParam){j.submit[profile].ios.ascAppId=fromParam;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\\\\n');console.log('ascAppId injected from Jenkins parameter for profile:', profile)}const id=(j.submit[profile].ios.ascAppId||'').trim();if(!id||id==='HIER_ASC_APP_ID_EINTRAGEN'){console.error('Missing ascAppId for profile '+profile+'. Set ASC_APP_ID parameter or mobile/eas.json -> submit.'+profile+'.ios.ascAppId.');process.exit(1)}console.log('ascAppId is configured for profile:', profile)"
                    '''
                  }
                }
              }
            }

            stage('EAS Submit iOS') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  script {
                    if (!params.EXPO_TOKEN_CREDENTIAL_ID?.trim()) {
                      error('EXPO_TOKEN_CREDENTIAL_ID is empty.')
                    }
                    withCredentials([string(credentialsId: params.EXPO_TOKEN_CREDENTIAL_ID.trim(), variable: 'EXPO_TOKEN')]) {
                      sh '''
                        if [ -z "$EXPO_TOKEN" ]; then
                          echo "EXPO_TOKEN is missing."
                          exit 1
                        fi

                        echo "Submitting latest successful iOS build using Expo/EAS-managed credentials..."
                        eas submit --platform ios --profile "${EAS_PROFILE}" --latest --non-interactive
                      '''
                    }
                  }
                }
              }
            }
          }

          post {
            success {
              echo 'iOS submit pipeline finished successfully.'
            }
            failure {
              echo 'iOS submit pipeline failed. Check Jenkins logs.'
            }
            always {
              sh '''
                rm -rf ~/.npm/_cacache/tmp || true
              '''
            }
          }
        }
        """
    )


def jenkinsfile_mobile_submit_android() -> str:
    return textwrap.dedent(
        """\
        pipeline {
          agent any

          parameters {
            string(name: 'EXPO_TOKEN_CREDENTIAL_ID', defaultValue: 'EXPO_TOKEN', description: 'Jenkins Secret Text credential id for Expo token')
            string(name: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_CREDENTIAL_ID', defaultValue: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FILE', description: 'Jenkins Secret File credential id for the Google Play service account JSON key')
            string(name: 'EAS_PROFILE', defaultValue: 'production', description: 'Android submit profile from mobile/eas.json')
          }

          environment {
            MOBILE_DIR = 'mobile'
            GOOGLE_SERVICE_ACCOUNT_DEST = '.secrets/google-service-account.json'
            CI = '1'
          }

          stages {
            stage('Checkout') {
              steps {
                checkout scm
              }
            }

            stage('Validate Project Structure') {
              steps {
                sh '''
                  test -f "${MOBILE_DIR}/package.json" || { echo "Missing file: ${MOBILE_DIR}/package.json"; exit 1; }
                  test -f "${MOBILE_DIR}/app.json" || { echo "Missing file: ${MOBILE_DIR}/app.json"; exit 1; }
                  test -f "${MOBILE_DIR}/eas.json" || { echo "Missing file: ${MOBILE_DIR}/eas.json"; exit 1; }
                '''
              }
            }

            stage('Install Node Dependencies') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  sh '''
                    node --version
                    npm --version

                    if [ -f package-lock.json ]; then
                      npm ci
                    else
                      npm install
                    fi
                  '''
                }
              }
            }

            stage('Install EAS CLI') {
              steps {
                sh '''
                  npm install -g eas-cli
                  eas --version
                '''
              }
            }

            stage('Materialize Google Service Account Key') {
              steps {
                script {
                  if (!params.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_CREDENTIAL_ID?.trim()) {
                    error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_CREDENTIAL_ID is empty.')
                  }
                  withCredentials([file(credentialsId: params.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_CREDENTIAL_ID.trim(), variable: 'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FILE')]) {
                    dir("${env.MOBILE_DIR}") {
                      sh '''
                        if [ ! -f "$GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FILE" ]; then
                          echo "Google Play service account JSON file is missing."
                          exit 1
                        fi

                        mkdir -p .secrets
                        cp "$GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FILE" "${GOOGLE_SERVICE_ACCOUNT_DEST}"
                        chmod 600 "${GOOGLE_SERVICE_ACCOUNT_DEST}" || true
                        test -f "${GOOGLE_SERVICE_ACCOUNT_DEST}" || { echo "Failed to materialize ${GOOGLE_SERVICE_ACCOUNT_DEST}"; exit 1; }
                        echo "Google Play service account JSON prepared at ${GOOGLE_SERVICE_ACCOUNT_DEST}."
                      '''
                    }
                  }
                }
              }
            }

            stage('Validate Android Submit Profile') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  sh '''
                    node -e "const fs=require('fs');const profile=(process.env.EAS_PROFILE||'production').trim();const p='eas.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));const submit=j?.submit?.[profile]?.android;if(!submit){console.error('Missing Android submit profile: '+profile);process.exit(1)}const keyPath=(submit.serviceAccountKeyPath||'').trim();if(keyPath!=='./.secrets/google-service-account.json'){console.error('Unexpected serviceAccountKeyPath for profile '+profile+': '+keyPath);process.exit(1)}console.log('Android submit profile is configured for profile:', profile, 'track:', submit.track || '<default>');"
                  '''
                }
              }
            }

            stage('EAS Submit Android') {
              steps {
                dir("${env.MOBILE_DIR}") {
                  script {
                    if (!params.EXPO_TOKEN_CREDENTIAL_ID?.trim()) {
                      error('EXPO_TOKEN_CREDENTIAL_ID is empty.')
                    }
                    withCredentials([string(credentialsId: params.EXPO_TOKEN_CREDENTIAL_ID.trim(), variable: 'EXPO_TOKEN')]) {
                      sh '''
                        if [ -z "$EXPO_TOKEN" ]; then
                          echo "EXPO_TOKEN is missing."
                          exit 1
                        fi

                        echo "Submitting latest successful Android build using Expo/EAS-managed credentials..."
                        eas submit --platform android --profile "${EAS_PROFILE}" --latest --non-interactive
                      '''
                    }
                  }
                }
              }
            }
          }

          post {
            success {
              echo 'Android submit pipeline finished successfully.'
            }
            failure {
              echo 'Android submit pipeline failed. Check Jenkins logs.'
            }
            always {
              sh '''
                rm -rf ~/.npm/_cacache/tmp || true
              '''
            }
          }
        }
        """
    )


def generate_structure(writer: Writer, names: ProjectNames) -> None:
    dirs = [
        "backend",
        "frontend",
        "mobile",
        "marketing",
        "assets",
        "deploy",
        "scripts",
        ".vscode",
    ]
    for path in dirs:
        writer.ensure_dir(path)

    writer.write_text("README.md", root_readme(names))
    writer.write_text("CHANGELOG.md", changelog_content())
    writer.write_text(".gitignore", gitignore_content())
    writer.write_text(".dockerignore", dockerignore_content())
    writer.write_text(".env.example", root_env_example(names))
    writer.write_text("deploy/app.env.example", app_env_example(names))
    writer.write_text("deploy/docker-compose.yml", docker_compose_content())
    writer.write_text("Jenkinsfile", project_jenkinsfile())
    writer.write_text("Jenkinsfile.mobile_expo", jenkinsfile_mobile_expo())
    writer.write_text("Jenkinsfile.mobile.submit-android", jenkinsfile_mobile_submit_android())
    writer.write_text("Jenkinsfile.mobile.submit-ios", jenkinsfile_mobile_submit_ios())
    writer.write_text("PLAYSTORE_TESTING_GUIDE.md", playstore_testing_guide(names))


def generate_envs(writer: Writer, names: ProjectNames) -> None:
    writer.write_text(".env.example", root_env_example(names))
    writer.write_text("deploy/app.env.example", app_env_example(names))
    writer.write_text("backend/.env.example", backend_env_example(names))
    writer.write_text("frontend/.env.example", frontend_env_example(names))
    writer.write_text("mobile/.env.example", mobile_env_example(names))


def generate_backend(writer: Writer, names: ProjectNames) -> None:
    dirs = [
        "backend/config",
        "backend/core",
        "backend/core/migrations",
        "backend/core/management",
        "backend/core/management/commands",
    ]
    for path in dirs:
        writer.ensure_dir(path)

    writer.write_text("backend/manage.py", backend_manage_py())
    writer.write_text("backend/requirements.txt", backend_requirements())
    writer.write_text("backend/config/__init__.py", "")
    writer.write_text("backend/config/settings.py", backend_settings(names))
    writer.write_text("backend/config/urls.py", backend_urls())
    writer.write_text("backend/config/wsgi.py", backend_wsgi())
    writer.write_text("backend/config/asgi.py", backend_asgi())
    writer.write_text("backend/core/__init__.py", "")
    writer.write_text("backend/core/apps.py", backend_core_apps())
    writer.write_text("backend/core/bootstrap_superuser.py", backend_core_bootstrap_superuser())
    writer.write_text("backend/core/views.py", backend_core_views())
    writer.write_text("backend/core/urls.py", backend_core_urls())
    writer.write_text("backend/core/migrations/__init__.py", "")
    writer.write_text("backend/core/management/__init__.py", "")
    writer.write_text("backend/core/management/commands/__init__.py", "")
    writer.write_text(
        "backend/core/management/commands/ensure_database.py",
        backend_ensure_database_command(),
    )
    writer.write_text(
        "backend/core/management/commands/ensure_superuser.py",
        backend_ensure_superuser_command(),
    )


def generate_frontend(writer: Writer, names: ProjectNames) -> None:
    dirs = [
        "frontend/src",
        "frontend/src/api",
        "frontend/src/assets",
        "frontend/src/components",
        "frontend/src/pages",
    ]
    for path in dirs:
        writer.ensure_dir(path)

    writer.write_text("frontend/package.json", frontend_package_json(names))
    writer.write_text("frontend/index.html", frontend_index_html(names))
    writer.write_text("frontend/vite.config.ts", frontend_vite_config())
    writer.write_text("frontend/tsconfig.json", frontend_tsconfig())
    writer.write_text("frontend/tsconfig.app.json", frontend_tsconfig_app())
    writer.write_text("frontend/tsconfig.node.json", frontend_tsconfig_node())
    writer.write_text("frontend/src/main.tsx", frontend_main_tsx())
    writer.write_text("frontend/src/App.tsx", frontend_app_tsx())
    writer.write_text("frontend/src/api/client.ts", frontend_client_ts())
    writer.write_text("frontend/src/pages/LoginPage.tsx", frontend_login_page())
    writer.write_text("frontend/src/pages/HomePage.tsx", frontend_home_page())
    writer.write_text("frontend/src/styles.css", frontend_styles())
    writer.write_text("frontend/src/components/README.md", "Komponenten fuer das Frontend.\n")
    writer.write_text("frontend/src/assets/README.md", "Lege hier frontend-spezifische Assets ab.\n")


def _png_bytes() -> bytes:
    return base64.b64decode(PNG_PLACEHOLDER_BASE64)


def generate_mobile(writer: Writer, names: ProjectNames) -> None:
    writer.ensure_dir("mobile/assets")

    writer.write_text("mobile/package.json", mobile_package_json(names))
    writer.write_text("mobile/app.json", mobile_app_json(names))
    writer.write_text("mobile/index.js", mobile_index_js())
    writer.write_text("mobile/App.tsx", mobile_app_tsx())
    writer.write_text("mobile/tsconfig.json", mobile_tsconfig())
    writer.write_text("mobile/babel.config.js", mobile_babel())
    writer.write_text("mobile/eas.json", mobile_eas_json())
    writer.write_text("mobile/README.md", mobile_readme())
    writer.write_text(
        "mobile/assets/README.md",
        "Neutrale Platzhalter-Assets fuer mobile App.\nLege hier dein Intro-Video als intro.mp4 ab.\n",
    )
    writer.write_binary("mobile/assets/icon.png", _png_bytes())
    writer.write_binary("mobile/assets/adaptive-icon.png", _png_bytes())
    writer.write_binary("mobile/assets/splash-icon.png", _png_bytes())


def generate_marketing(writer: Writer, _names: ProjectNames) -> None:
    dirs = ["marketing/assets", "marketing/assets/screenshots"]
    for path in dirs:
        writer.ensure_dir(path)

    writer.write_text("marketing/index.html", marketing_index(_names))
    writer.write_text("marketing/privacy.html", marketing_privacy())
    writer.write_text("marketing/datenschutz.html", marketing_datenschutz())
    writer.write_text("marketing/support.html", marketing_support())
    writer.write_text("marketing/impressum.html", marketing_impressum())
    writer.write_text("marketing/kontakt.html", marketing_kontakt())
    writer.write_text("marketing/terms.html", marketing_terms())
    writer.write_text("marketing/README.md", marketing_readme())
    writer.write_binary("marketing/assets/logo.png", _png_bytes())
    writer.write_binary("marketing/assets/app-preview.png", _png_bytes())
    writer.write_binary("marketing/assets/screenshots/screenshot-01.png", _png_bytes())
    writer.write_text("marketing/assets/README.md", intro_readme())


def generate_assets(writer: Writer) -> None:
    dirs = [
        "assets/logo",
        "assets/icons",
        "assets/screenshots",
        "assets/videos",
        "assets/placeholders",
    ]
    for path in dirs:
        writer.ensure_dir(path)

    writer.write_binary("assets/logo/logo-placeholder.png", _png_bytes())
    writer.write_binary("assets/icons/icon-placeholder.png", _png_bytes())
    writer.write_binary("assets/icons/adaptive-icon-placeholder.png", _png_bytes())
    writer.write_binary("assets/icons/splash-icon-placeholder.png", _png_bytes())
    writer.write_binary("assets/screenshots/dashboard-placeholder.png", _png_bytes())
    writer.write_binary("assets/screenshots/mobile-home-placeholder.png", _png_bytes())
    writer.write_binary("assets/screenshots/web-home-placeholder.png", _png_bytes())
    writer.write_text("assets/videos/README.md", intro_readme())
    writer.write_text("assets/placeholders/README.md", placeholders_readme())


def generate_docker(writer: Writer) -> None:
    writer.ensure_dir("deploy")
    writer.write_text("deploy/README.md", docker_readme())
    writer.write_text("deploy/Dockerfile", dockerfile_backend())


def generate_scripts(writer: Writer) -> None:
    writer.ensure_dir("scripts")
    writer.write_text("scripts/README.md", scripts_readme())
    writer.write_text("scripts/Readme_Installation.sh", readme_installation_sh())
    writer.write_text("scripts/Readme_Installation.bat", readme_installation_bat())
    writer.write_text("scripts/install.sh", install_sh())
    writer.write_text("scripts/install.bat", install_bat())
    writer.write_text("scripts/start_mac.sh", start_mac_sh())
    writer.write_text("scripts/start_win.ps1", start_win_ps1())
    writer.write_text("scripts/start_backend.sh", start_backend_sh())
    writer.write_text("scripts/start_frontend.sh", start_frontend_sh())
    writer.write_text("scripts/start_mobile.sh", start_mobile_sh())
    writer.write_text("scripts/start_mobile_tunnel.sh", start_mobile_tunnel_sh())
    writer.write_text("scripts/apply_env_inputs.py", apply_env_inputs_py())
    writer.write_text("scripts/check_env.py", check_env_py())
    writer.write_text("scripts/generate_project.py", Path(__file__).read_text(encoding="utf-8"))


def generate_vscode(writer: Writer) -> None:
    writer.ensure_dir(".vscode")
    writer.write_text(".vscode/launch.json", vscode_launch_json())
    writer.write_text(".vscode/tasks.json", vscode_tasks_json())
    writer.write_text(".vscode/settings.json", vscode_settings_json())


def chmod_generated_scripts(root: Path, dry_run: bool) -> None:
    if dry_run:
        return
    script_paths = [
        "scripts/install.sh",
        "scripts/apply_env_inputs.py",
        "scripts/start_mac.sh",
        "scripts/start_backend.sh",
        "scripts/start_frontend.sh",
        "scripts/start_mobile.sh",
        "scripts/start_mobile_tunnel.sh",
        "scripts/check_env.py",
        "scripts/generate_project.py",
        "backend/manage.py",
    ]
    for rel in script_paths:
        target = root / rel
        if target.exists():
            mode = target.stat().st_mode
            target.chmod(mode | 0o111)


def run_generation(args: argparse.Namespace) -> int:
    names = derive_names(args.project_name)
    target_root = Path(args.output_dir).resolve() / names.project_slug
    writer = Writer(target_root, args.dry_run)

    if not target_root.exists():
        writer.ensure_dir(".")

    # Always provide a gitignore baseline, even for partial task runs.
    writer.write_text(".gitignore", gitignore_content())
    writer.write_text(".dockerignore", dockerignore_content())

    task = args.task

    if task in {"all", "structure"}:
        generate_structure(writer, names)

    if task in {"all", "backend"} and args.backend:
        generate_backend(writer, names)
    if task in {"all", "frontend"} and args.frontend:
        generate_frontend(writer, names)
    if task in {"all", "mobile"} and args.mobile:
        generate_mobile(writer, names)
    if task in {"all", "marketing"} and args.marketing:
        generate_marketing(writer, names)
    if task in {"all", "assets"} and args.assets:
        generate_assets(writer)
    if task in {"all", "docker"} and args.postgres:
        generate_docker(writer)
    if task in {"all", "env"}:
        generate_envs(writer, names)
    if task in {"all", "scripts"}:
        generate_scripts(writer)
    if task in {"all", "vscode"}:
        generate_vscode(writer)
    if task in {"all", "git"}:
        writer.write_text(".gitignore", gitignore_content())
        writer.write_text("CHANGELOG.md", changelog_content())
        if args.init_git:
            writer.maybe_git_init()

    chmod_generated_scripts(target_root, args.dry_run)

    print("=" * 76)
    print("Generic template generation summary")
    print("=" * 76)
    print(f"Target directory : {target_root}")
    print(f"Dry run          : {args.dry_run}")
    print()
    print("Derived names")
    print(f"- PROJECT_DISPLAY_NAME : {names.project_display_name}")
    print(f"- PROJECT_SLUG         : {names.project_slug}")
    print(f"- PYTHON_PACKAGE_NAME  : {names.python_package_name}")
    print(f"- NPM_PACKAGE_NAME     : {names.npm_package_name}")
    print(f"- MOBILE_APP_NAME      : {names.mobile_app_name}")
    print(f"- DATABASE_NAME        : {names.database_name}")
    print(f"- DATABASE_USER        : {names.database_user}")
    print(f"- BUNDLE_IDENTIFIER    : {names.bundle_identifier}")
    print(f"- ANDROID_PACKAGE_NAME : {names.android_package_name}")
    print()

    if writer.summary.created_dirs:
        print(f"Created directories ({len(writer.summary.created_dirs)}):")
        for entry in writer.summary.created_dirs:
            print(f"  + {entry}")

    if writer.summary.created_files:
        print(f"Created files ({len(writer.summary.created_files)}):")
        for entry in writer.summary.created_files:
            print(f"  + {entry}")

    if writer.summary.skipped_dirs:
        print(f"Skipped directories ({len(writer.summary.skipped_dirs)}):")
        for entry in writer.summary.skipped_dirs:
            print(f"  = {entry}")

    if writer.summary.skipped_files:
        print(f"Skipped files ({len(writer.summary.skipped_files)}):")
        for entry in writer.summary.skipped_files:
            print(f"  = {entry}")

    if writer.summary.notes:
        print("Notes:")
        for entry in writer.summary.notes:
            print(f"  - {entry}")

    if writer.summary.git_initialized:
        print("Git repository initialized and main branch selected.")

    print("=" * 76)
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate a generic fullstack template project.")
    p.add_argument("--project-name", required=True, help="Display name for the project.")
    p.add_argument("--output-dir", default=".", help="Output directory (default: current folder).")
    p.add_argument("--backend", type=parse_bool, default=True)
    p.add_argument("--frontend", type=parse_bool, default=True)
    p.add_argument("--mobile", type=parse_bool, default=True)
    p.add_argument("--marketing", type=parse_bool, default=True)
    p.add_argument("--assets", type=parse_bool, default=True)
    p.add_argument("--postgres", type=parse_bool, default=True)
    p.add_argument("--init-git", type=parse_bool, default=False)
    p.add_argument("--dry-run", type=parse_bool, default=False)
    p.add_argument(
        "--task",
        choices=[
            "all",
            "structure",
            "backend",
            "frontend",
            "mobile",
            "marketing",
            "assets",
            "docker",
            "env",
            "git",
            "scripts",
            "vscode",
        ],
        default="all",
    )
    return p


def main() -> int:
    args = parser().parse_args()
    try:
        return run_generation(args)
    except ValueError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    except subprocess.CalledProcessError as error:
        print(f"ERROR: command failed: {error}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
