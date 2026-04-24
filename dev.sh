#!/usr/bin/env bash
# ============================================================
# dev.sh — single-command full-stack dev launcher
#
# Usage: ./dev.sh
#
# What it does:
#   1. Starts Postgres + Keycloak via podman-compose (detached)
#   2. Polls until Postgres accepts connections
#   3. Polls until Keycloak /health/ready responds (animated spinner)
#   4. Runs Alembic migrations
#   5. Hands off to overmind (api + frontend in one multiplexed terminal)
#
# Requirements:
#   - podman + podman-compose   sudo apt install podman && pip install podman-compose
#   - overmind + tmux           ~/.local/bin/overmind, tmux 3.2+
#   - venv at VENV path         python3 -m venv ~/.local/share/weight-analysis/venv
#                               pip install -r requirements.txt
#   - frontend/node_modules     cd frontend && npm install
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

# ── Colours ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()    { echo -e "${GREEN}${BOLD}  ✓${NC}  $*"; }
info()   { echo -e "${CYAN}${BOLD}  ·${NC}  $*"; }
warn()   { echo -e "${YELLOW}${BOLD}  !${NC}  $*"; }
err()    { echo -e "${RED}${BOLD}  ✗${NC}  $*" >&2; }
header() { echo -e "\n${BOLD}$*${NC}"; }

# Animated spinner — runs in background, killed when the wait is done.
# Usage: spinner_start "message"; ...; spinner_stop
_SPINNER_PID=""
spinner_start() {
  local msg="$1"
  local frames=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
  (
    local i=0
    while true; do
      printf "\r  ${CYAN}${frames[$((i % 10))]}${NC}  %s" "$msg"
      sleep 0.1
      i=$((i + 1))
    done
  ) &
  _SPINNER_PID=$!
}

spinner_stop() {
  if [[ -n "$_SPINNER_PID" ]]; then
    kill "$_SPINNER_PID" 2>/dev/null
    wait "$_SPINNER_PID" 2>/dev/null || true
    _SPINNER_PID=""
    printf "\r\033[K"  # clear the spinner line
  fi
}

# Suppress noisy podman/podman-compose stderr (CNI warnings, systemd warnings).
# Errors that actually matter surface via exit codes.
suppress() {
  "$@" 2>&1 | grep -v \
    -e "Error validating CNI" \
    -e "cgroup_manager" \
    -e "cgroupv2 manager" \
    -e "systemd user session" \
    -e "loginctl enable-linger" \
    -e "Falling back to" \
    -e "Ignored postgres condition" \
    -e "doesn't support healthy" \
    -e "Failed to start transient timer" \
    -e "already exists" \
    || true
}

# ── Header ───────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ╔══════════════════════════════════╗"
echo "  ║     Weight Tracker — Dev         ║"
echo "  ╚══════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Fix stale CNI config if needed ───────────────────────
# podman 4.x + older podman-compose can leave a cniVersion "1.0.0" conflist
# that causes warnings. Delete it so podman recreates it with 0.4.0.
CNI_CONF="$HOME/.config/cni/net.d/weight_analysis_default.conflist"
if [[ -f "$CNI_CONF" ]] && grep -q '"cniVersion": "1.0.0"' "$CNI_CONF" 2>/dev/null; then
  rm -f "$CNI_CONF"
fi

# ── 2. Start infra containers ────────────────────────────────
info "Starting Postgres + Keycloak..."
suppress podman-compose up postgres keycloak -d
log "Containers started."

# ── 3. Wait for Postgres ─────────────────────────────────────
PG_CONTAINER=$(podman ps --format "{{.Names}}" 2>/dev/null | grep "postgres" | head -1)
if [[ -z "$PG_CONTAINER" ]]; then
  err "Postgres container not found. Run: podman ps"
  exit 1
fi

spinner_start "Waiting for Postgres..."
RETRIES=30
until podman exec "$PG_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q 2>/dev/null; do
  sleep 2
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -eq 0 ]]; then
    spinner_stop
    err "Postgres did not become ready. Check: podman-compose logs postgres"
    exit 1
  fi
done
spinner_stop
log "Postgres is ready."

# ── 4. Wait for Keycloak ─────────────────────────────────────
spinner_start "Waiting for Keycloak..."
RETRIES=15
until curl -sf http://localhost:8080/health/ready > /dev/null 2>&1; do
  sleep 3
  RETRIES=$((RETRIES - 1))
  if [[ "$RETRIES" -eq 0 ]]; then
    spinner_stop
    warn "Keycloak did not respond in time — continuing anyway."
    warn "Check: podman-compose logs keycloak"
    break
  fi
done
spinner_stop
log "Keycloak is ready."

# ── 5. Run Alembic migrations ────────────────────────────────
spinner_start "Running Alembic migrations..."
PYTHONPATH="$SCRIPT_DIR/backend" "$VENV/bin/alembic" \
  -c backend/alembic.ini upgrade head > /dev/null
spinner_stop
log "Migrations complete."

# ── 6. Hand off to overmind ──────────────────────────────────
echo ""
info "Launching api + frontend via overmind  (Ctrl+C to stop all)"
info "Attach to a single process:  overmind connect api"
echo ""

VENV="$VENV" exec overmind start
