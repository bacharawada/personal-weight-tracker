#!/bin/sh
# ============================================================
# Weight Tracker — Google identity provider configuration
#
# Creates (or updates) the "google" identity provider in the
# weight-tracker realm. Idempotent: safe to re-run on every
# deploy, and safe to run against a realm that already exists.
#
# Why a script rather than realm-export.json:
#   - realm-export.json is only read on FIRST boot (--import-realm).
#     Editing it does nothing to a realm that already exists, which
#     is the case for both the local volume and the prod database.
#   - The client secret must not be committed. Here it is read from
#     the environment at run time and never written to disk.
#
# The alias MUST stay "google": the frontend sends
# kc_idp_hint=google (see frontend/src/context/AuthContext.tsx),
# and Google's authorised redirect URI is derived from it:
#   <KEYCLOAK_URL>/realms/<REALM>/broker/google/endpoint
#
# Usage (local, from the repo root):
#   docker compose exec keycloak /opt/keycloak/bin/configure-google-idp.sh
#
# Usage (prod, from a shell inside the Container App):
#   KEYCLOAK_URL=http://localhost:8080 ./configure-google-idp.sh
#   (localhost from inside the container — avoids the public edge)
# ============================================================
set -eu

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-weight-tracker}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"
ALIAS="google"

for var in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    echo "[google-idp] ERROR: $var is not set." >&2
    exit 1
  fi
done

echo "[google-idp] Authenticating against $KEYCLOAK_URL as $KEYCLOAK_ADMIN..."
"$KCADM" config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"

# trustEmail: Google verifies addresses itself, so we accept the email
#   claim without a second round of verification.
# updateProfileFirstLoginMode=off: skip the "review your profile" form —
#   name and email already come from the Google token.
set -- \
  -s "alias=$ALIAS" \
  -s "providerId=google" \
  -s "enabled=true" \
  -s "trustEmail=true" \
  -s "storeToken=false" \
  -s "addReadTokenRoleOnCreate=false" \
  -s "linkOnly=false" \
  -s "config.clientId=$GOOGLE_CLIENT_ID" \
  -s "config.clientSecret=$GOOGLE_CLIENT_SECRET" \
  -s "config.defaultScope=openid email profile" \
  -s "config.syncMode=IMPORT" \
  -s "config.useJwksUrl=true" \
  -s "config.updateProfileFirstLoginMode=off"

if "$KCADM" get "identity-provider/instances/$ALIAS" -r "$REALM" >/dev/null 2>&1; then
  echo "[google-idp] Provider '$ALIAS' exists — updating..."
  "$KCADM" update "identity-provider/instances/$ALIAS" -r "$REALM" "$@"
else
  echo "[google-idp] Provider '$ALIAS' not found — creating..."
  "$KCADM" create identity-provider/instances -r "$REALM" "$@"
fi

echo "[google-idp] Done. Redirect URI to declare in Google Cloud Console:"
echo "[google-idp]   $KEYCLOAK_URL/realms/$REALM/broker/$ALIAS/endpoint"
