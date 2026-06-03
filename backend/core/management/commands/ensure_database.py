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
