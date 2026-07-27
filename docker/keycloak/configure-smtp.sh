#!/bin/sh
# ============================================================
# Weight Tracker — Keycloak SMTP configuration
#
# Sets the SMTP server on the weight-tracker realm so that the
# emails Keycloak owns actually leave: "Forgot password?" (the realm
# has resetPasswordAllowed=true) and, if verifyEmail is ever turned
# on, the address-verification mail. Idempotent: safe to re-run on
# every deploy.
#
# Why a script rather than realm-export.json:
#   - realm-export.json is only read on FIRST boot (--import-realm).
#     Editing it does nothing to a realm that already exists, which
#     is the case for both the local volume and the prod database.
#   - The SMTP key must not be committed. Here it is read from the
#     environment at run time and never written to disk.
#
# Provider: Brevo SMTP relay (free tier, 300 mails/day).
#   host  smtp-relay.brevo.com
#   port  587 + STARTTLS
#   user  the SMTP login from Brevo → SMTP & API → SMTP tab
#   pass  an SMTP key generated on that same page — NOT the account
#         password and NOT the v3 API key
# Nothing here is Brevo-specific beyond those values, so switching
# provider is a change of environment variables only.
#
# The SMTP_FROM domain must be authenticated in Brevo (brevo-code TXT
# + DKIM + DMARC). It cannot be weighttracker.bawada.fr: that name is
# a CNAME to the Container Apps ingress, and a CNAME cannot coexist
# with the TXT record Brevo needs.
#
# Usage (local, from the repo root):
#   docker compose exec keycloak /opt/keycloak/bin/configure-smtp.sh
#
# Usage (prod — the Keycloak ingress is public, so drive it from the
# local container pointed at the prod URL):
#   docker compose exec \
#     -e KEYCLOAK_URL=https://weighttracker-auth.bawada.fr \
#     -e KEYCLOAK_ADMIN_PASSWORD='<prod-admin-password>' \
#     keycloak /opt/keycloak/bin/configure-smtp.sh
# ============================================================
set -eu

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-weight-tracker}"
KCADM="${KCADM:-/opt/keycloak/bin/kcadm.sh}"

SMTP_PORT="${SMTP_PORT:-587}"
SMTP_FROM_DISPLAY_NAME="${SMTP_FROM_DISPLAY_NAME:-Weight Tracker}"
SMTP_REPLY_TO="${SMTP_REPLY_TO:-}"

for var in SMTP_HOST SMTP_USER SMTP_PASSWORD SMTP_FROM KEYCLOAK_ADMIN KEYCLOAK_ADMIN_PASSWORD; do
  eval "value=\${$var:-}"
  if [ -z "$value" ]; then
    echo "[smtp] ERROR: $var is not set." >&2
    exit 1
  fi
done

echo "[smtp] Authenticating against $KEYCLOAK_URL as $KEYCLOAK_ADMIN..."
"$KCADM" config credentials \
  --server "$KEYCLOAK_URL" \
  --realm master \
  --user "$KEYCLOAK_ADMIN" \
  --password "$KEYCLOAK_ADMIN_PASSWORD"

# starttls=true on port 587 is Brevo's documented relay setup. `ssl`
# (implicit TLS, port 465) must stay false — setting both makes the
# send fail with a handshake error that Keycloak only logs server-side.
# envelopeFrom is left unset: Brevo rewrites the return-path to its own
# bounce domain regardless.
set -- \
  -s "smtpServer.host=$SMTP_HOST" \
  -s "smtpServer.port=$SMTP_PORT" \
  -s "smtpServer.from=$SMTP_FROM" \
  -s "smtpServer.fromDisplayName=$SMTP_FROM_DISPLAY_NAME" \
  -s "smtpServer.starttls=true" \
  -s "smtpServer.ssl=false" \
  -s "smtpServer.auth=true" \
  -s "smtpServer.user=$SMTP_USER" \
  -s "smtpServer.password=$SMTP_PASSWORD"

if [ -n "$SMTP_REPLY_TO" ]; then
  set -- "$@" -s "smtpServer.replyTo=$SMTP_REPLY_TO"
fi

echo "[smtp] Configuring realm '$REALM' — $SMTP_HOST:$SMTP_PORT, from $SMTP_FROM..."
"$KCADM" update "realms/$REALM" "$@"

# Echo back what actually landed. Keycloak masks the password in GET
# responses, so this is safe to leave in a deploy log.
echo "[smtp] Realm SMTP config is now:"
"$KCADM" get "realms/$REALM" --fields smtpServer

echo "[smtp] Done. Verify with a real 'Forgot password?' from the login page."
