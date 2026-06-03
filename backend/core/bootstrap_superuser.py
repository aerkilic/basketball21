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
