from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        from .bootstrap_superuser import ensure_superuser_from_env

        ensure_superuser_from_env()
