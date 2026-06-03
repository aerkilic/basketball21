FROM python:3.12-slim

WORKDIR /app/backend

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app/backend

EXPOSE 8000
CMD ["sh", "-c", "python manage.py ensure_database && python manage.py migrate && python manage.py ensure_superuser && python manage.py runserver 0.0.0.0:8000"]
