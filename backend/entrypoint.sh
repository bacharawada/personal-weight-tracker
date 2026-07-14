#!/bin/sh
# ============================================================
# Weight Tracker — Production entrypoint
#
# 1. Runs Alembic migrations (idempotent — safe on every start)
# 2. Starts the FastAPI server via uvicorn
#
# Uses `exec` so uvicorn is PID 1 and receives OS signals
# (SIGTERM on container stop) cleanly.
# ============================================================
set -e

echo "[entrypoint] Running database migrations..."
alembic -c backend/alembic.ini upgrade head

echo "[entrypoint] Starting uvicorn..."
exec uvicorn api:create_app --factory --host 0.0.0.0 --port 8000
