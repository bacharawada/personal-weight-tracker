#!/usr/bin/env bash
# ============================================================
# dev.sh — single-command full-stack dev launcher
#
# Usage: ./dev.sh
#
# What it does:
#   1. Starts Postgres + Keycloak via podman-compose (detached)
#   2. Polls until Postgres healthcheck passes
#   3. Polls until Keycloak /health/ready responds
#   4. Runs Alembic migrations
#   5. Hands off to overmind (api + frontend in one terminal)
#
# Requirements:
#   - podman + podman-compose   (sudo apt install podman && pip install podman-compose)
#   - overmind + tmux           (~/.local/bin/overmind, tmux 3.2+)
#   - .venv/bin/uvicorn         (pip install -r requirements.txt)
#   - frontend/node_modules     (cd frontend && npm install)
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colour helpers
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[dev]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev]${NC} $*"; }
err()  { echo -e "${RED}[dev]${NC} $*" >&2; }

# ── 1. Start infra containers ────────────────────────────────
log "Starting Postgres + Keycloak via podman-compose..."
podman-compose up postgres keycloak -d

# ── 2. Wait for Postgres ─────────────────────────────────────
log "Waiting for Postgres to be healthy..."
RETRIES=30
until podman healthcheck run "$(podman ps -qf name=_postgres)" 2>/dev/null | grep -q "healthy" || [ "$RETRIES" -eq 0 ]; do
  sleep 2
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -eq 0 ]; then
  err "Postgres did not become healthy in time. Check: podman-compose logs postgres"
  exit 1
fi
log "Postgres is healthy."

# ── 3. Wait for Keycloak ─────────────────────────────────────
log "Waiting for Keycloak to be healthy (this takes ~30s on first boot)..."
RETRIES=40
until curl -sf http://localhost:8080/health/ready > /dev/null 2>&1 || [ "$RETRIES" -eq 0 ]; do
  sleep 3
  RETRIES=$((RETRIES - 1))
done

if [ "$RETRIES" -eq 0 ]; then
  warn "Keycloak did not respond in time — continuing anyway. Check: podman-compose logs keycloak"
else
  log "Keycloak is healthy."
fi

# ── 4. Run Alembic migrations ────────────────────────────────
log "Running Alembic migrations..."
PYTHONPATH="$SCRIPT_DIR/backend" .venv/bin/alembic -c backend/alembic.ini upgrade head
log "Migrations complete."

# ── 5. Hand off to overmind ──────────────────────────────────
log "Starting API + frontend via overmind..."
echo ""
exec overmind start
