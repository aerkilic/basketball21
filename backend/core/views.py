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
