#!/bin/sh
# ============================================================
# Weight Tracker — Keycloak client URL configuration
#
# Points the `weight-tracker-frontend` client at the environment's real
# app URL by setting its Root URL and Base URL. Idempotent: safe to
# re-run on every deploy.
#
# Why this matters beyond cosmetics:
#   The login theme's "← Back to application" button on the info and
#   error pages links to ${client.baseUrl} (see theme/weight-tracker/
#   login/info.ftl and error.ftl), and Keycloak also derives
#   pageRedirectUri from the same Root/Base URL pair. realm-export.json
#   ships rootUrl/baseUrl = http://localhost:5173 (correct for dev), and
#   the prod realm was created from that export on first boot — so in
#   prod those buttons sent the user to localhost.
#
# Why a script rather than realm-export.json:
#   realm-export.json is only read on FIRST boot (--import-realm).
#   Editing it does nothing to a realm that already exists, which is the
#   case for both the local volume and the prod database. It also has to
#   keep the localhost values for dev, so the per-environment URL cannot
#   live there.
#
# Scope: rootUrl and baseUrl only. redirectUris and webOrigins already
# list every environment in realm-export.json, and a kcadm `-s` on those
# would REPLACE the whole list (dropping the localhost entries), so they
# are deliberately left untouched.
#
# Usage (local, from the repo root — no-op, the default is already the
# dev URL):
#   docker compose exec keycloak /opt/keycloak/bin/configure-client-urls.sh
#
# Usage (prod — the Keycloak ingress is public, so drive it from the
# local container pointed at the prod URL):
#   docker compose exec \
#     -e KEYCLOAK_URL=https://weighttracker-auth.bawada.fr \
#     -e KEYCLOAK_ADMIN_PASSWORD='<prod-admin-password>' \
#     -e APP_BASE_URL=https://weighttracker.bawada.fr \
#     keycloak /opt/keycloak/bin/configure-client-urls.sh
#
# If the workstation cannot reach the prod ingress from inside the
# container, use the admin REST fallback documented in
# infra/DEPLOYMENT.md.
# ============================================================
set -eu

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-weight-tracker}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-weight-tracker-frontend}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

# Default is the Vite dev server, i.e. what realm-export.json already
# contains — running this locally without APP_BASE_URL changes nothing.
APP_BASE_URL="${APP_BASE_URL:-http://localhost:5173}"

# A trailing slash would produce double slashes once Keycloak appends a
# path to the base URL.
APP_BASE_URL="${APP_BASE_URL%/}"

for var in KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    echo "[client-urls] ERROR: $var is not set." >&2
    exit 1
  fi
done

case "$APP_BASE_URL" in
  http://*|https://*) ;;
  *)
    echo "[client-urls] ERROR: APP_BASE_URL must be absolute (http:// or https://), got '$APP_BASE_URL'." >&2
    exit 1
    ;;
esac

echo "[client-urls] Authenticating against $KEYCLOAK_URL as $KEYCLOAK_ADMIN..."
"$KCADM" config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"

# kcadm updates clients by internal UUID, not by clientId.
CLIENT_UUID="$("$KCADM" get clients -r "$REALM" -q "clientId=$CLIENT_ID" \
  --fields id --format csv --noquotes)"

if [ -z "$CLIENT_UUID" ]; then
  echo "[client-urls] ERROR: client '$CLIENT_ID' not found in realm '$REALM'." >&2
  exit 1
fi

echo "[client-urls] Setting rootUrl/baseUrl of '$CLIENT_ID' to $APP_BASE_URL..."
"$KCADM" update "clients/$CLIENT_UUID" -r "$REALM" \
  -s "rootUrl=$APP_BASE_URL" \
  -s "baseUrl=$APP_BASE_URL"

# Echo back what actually landed — safe to leave in a deploy log.
echo "[client-urls] Client '$CLIENT_ID' URLs are now:"
"$KCADM" get "clients/$CLIENT_UUID" -r "$REALM" \
  --fields clientId,rootUrl,baseUrl,redirectUris,webOrigins

echo "[client-urls] Done. Verify with a 'Forgot password?' from the login page:"
echo "[client-urls]   the '← Back to application' button must point at $APP_BASE_URL"
