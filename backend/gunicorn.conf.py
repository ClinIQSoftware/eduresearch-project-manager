"""Gunicorn configuration for production deployment."""
import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))
keepalive = int(os.getenv("GUNICORN_KEEP_ALIVE", 5))
max_requests = 1000
max_requests_jitter = 50

# Restart workers gracefully after this many seconds
graceful_timeout = 30

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
errorlog = "-"
accesslog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
capture_output = True
enable_stdio_inheritance = True

# Process naming
proc_name = "eduresearch-api"

# SSL (if needed, configure externally via reverse proxy)
# keyfile = None
# certfile = None
