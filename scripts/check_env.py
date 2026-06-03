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
