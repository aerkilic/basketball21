#!/usr/bin/env python3
from __future__ import annotations

import argparse
import glob
import re
import sys
from pathlib import Path


KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
ASSIGN_RE = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")


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
                merged.append(f"{key}={updates[key]}\n")
                touched.add(key)
                continue
        merged.append(line)

    for key, value in updates.items():
        if key not in touched:
            if merged and not merged[-1].endswith("\n"):
                merged[-1] = merged[-1] + "\n"
            merged.append(f"{key}={value}\n")

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
