from django.urls import path

from .views import google_login_start_view, health_view, login_view, register_view

urlpatterns = [
    path("health/", health_view, name="health"),
    path("auth/login/", login_view, name="auth-login"),
    path("auth/register/", register_view, name="auth-register"),
    path("auth/google/start/", google_login_start_view, name="auth-google-start"),
]
