#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting Gunicorn server..."
exec gunicorn app.main:app \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-4} \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout ${GUNICORN_TIMEOUT:-120} \
    --keep-alive ${GUNICORN_KEEP_ALIVE:-5} \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --enable-stdio-inheritance
