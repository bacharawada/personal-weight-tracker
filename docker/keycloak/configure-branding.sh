#!/bin/sh
# ============================================================
# Weight Tracker — Keycloak realm branding & i18n
#
# Points the realm at the custom themes and turns on the two locales
# the app itself supports:
#   loginTheme  weight-tracker  (already set on prod)
#   emailTheme  weight-tracker  (this is what this script adds)
#   locales     en, fr — default en
#
# Idempotent: safe to re-run on every deploy.
#
# Why a script rather than realm-export.json:
#   - realm-export.json is only read on FIRST boot (--import-realm).
#     Editing it does nothing to a realm that already exists, which is
#     the case for both the local volume and the prod database. It is
#     still kept in sync so a fresh realm starts out correct.
#
# What this does NOT do: ship the theme. The templates live in the
# Keycloak image (see Dockerfile), so a theme change needs an image
# rebuild — this script only flips the realm pointers.
#
# Locale resolution, in Keycloak's order: kc_locale query param, the
# user's `locale` attribute, the locale cookie, ui_locales, the browser
# Accept-Language header, then defaultLocale. The frontend does not send
# ui_locales, so in practice a reset mail follows the language of the
# browser that opened the "Forgot password?" page.
#
# Usage (local, from the repo root):
#   docker compose exec keycloak /opt/keycloak/bin/configure-branding.sh
#
# For prod, this container path does not work from the current
# workstation (no Docker, and the podman WSL machine has no egress to
# the prod ingress on 443) — use the admin REST recipe in
# infra/DEPLOYMENT.md, "Realm branding & i18n".
# ============================================================
set -eu

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-weight-tracker}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

LOGIN_THEME="${LOGIN_THEME:-weight-tracker}"
EMAIL_THEME="${EMAIL_THEME:-weight-tracker}"
DEFAULT_LOCALE="${DEFAULT_LOCALE:-en}"

for var in KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    echo "[branding] ERROR: $var is not set." >&2
    exit 1
  fi
done

echo "[branding] Authenticating against $KEYCLOAK_URL as $KEYCLOAK_ADMIN..."
"$KCADM" config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"

echo "[branding] Configuring realm '$REALM' — themes and locales..."
"$KCADM" update "realms/$REALM" \
  -s "loginTheme=$LOGIN_THEME" \
  -s "emailTheme=$EMAIL_THEME" \
  -s "internationalizationEnabled=true" \
  -s 'supportedLocales=["en","fr"]' \
  -s "defaultLocale=$DEFAULT_LOCALE"

echo "[branding] Realm branding is now:"
"$KCADM" get "realms/$REALM" \
  --fields loginTheme,emailTheme,internationalizationEnabled,supportedLocales,defaultLocale

echo "[branding] Done. Verify with a real 'Forgot password?' from the login page,"
echo "[branding] once with an English browser and once with a French one."
