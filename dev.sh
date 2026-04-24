#!/usr/bin/env bash
# ============================================================
# dev.sh — single-command full-stack dev launcher
#
# Usage: ./dev.sh
#
# What it does:
#   1. Starts Postgres + Keycloak via podman-compose (detached)
#   2. Polls until Postgres accepts connections (pg_isready via podman exec)
#   3. Polls until Keycloak /health/ready responds
#   4. Runs Alembic migrations
#   5. Hands off to overmind (api + frontend in one multiplexed terminal)
#
# Requirements:
#   - podman 4.x + podman-compose   sudo apt install podman (Kubic repo)
#                                   pip install podman-compose
#   - overmind + tmux               ~/.local/bin/overmind, tmux 3.2+
#   - .venv/                        pip install -r requirements.txt
#   - frontend/node_modules         cd frontend && npm install
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Venv lives on the Linux filesystem to avoid NTFS permission/symlink issues.
VENV="${VENV:-$HOME/.local/share/weight-analysis/venv}"

# Load .env so POSTGRES_USER / POSTGRES_DB are available for pg_isready
set -o allexport
# shellcheck disable=SC1091
[[ -f .env ]] && source .env
set +o allexport

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

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
log "Waiting for Postgres to accept connections..."
RETRIES=30
# Resolve the container name — podman-compose names it <project>_postgres_1
PG_CONTAINER=$(podman ps --format "{{.Names}}" | grep -E "postgres" | head -1)

if [[ -z "$PG_CONTAINER" ]]; then
  err "Postgres container not found. Run: podman ps"
  exit 1
fi

until podman exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q 2>/dev/null; do
  sleep 2
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -eq 0 ]]; then
    err "Postgres did not become ready. Check: podman-compose logs postgres"
    exit 1
  fi
done
log "Postgres is ready."

# ── 3. Wait for Keycloak ─────────────────────────────────────
log "Waiting for Keycloak (this takes ~60s on first boot)..."
RETRIES=60
until curl -sf http://localhost:8080/health/ready > /dev/null 2>&1; do
  sleep 3
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -eq 0 ]]; then
    warn "Keycloak did not respond in time — continuing anyway."
    warn "Check: podman-compose logs keycloak"
    break
  fi
done
log "Keycloak is healthy."

# ── 4. Run Alembic migrations ────────────────────────────────
log "Running Alembic migrations..."
PYTHONPATH="$SCRIPT_DIR/backend" "$VENV/bin/alembic" -c backend/alembic.ini upgrade head
log "Migrations complete."

# ── 5. Hand off to overmind ──────────────────────────────────
log "Starting API + frontend via overmind..."
echo ""
VENV="$VENV" exec overmind start
