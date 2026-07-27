# ============================================================
# Custom Keycloak image — stock Keycloak 24.0 with the
# weight-tracker theme baked in (login + email).
#
# Why bake it in rather than mount from Azure Files:
#   - Azure Container Apps has no writable themes volume, and the
#     recursive theme upload to Azure Files was unreliable (nested-dir
#     race). Baking the theme into the image is immutable and
#     deterministic.
#   - Keycloak discovers themes under /opt/keycloak/themes at runtime,
#     so no `kc.sh build` step is needed for login or email themes.
#
# Consequence: any theme change — including a one-word copy fix in an
# email template — needs an image rebuild and a container app revision.
# The realm-level pointers (loginTheme / emailTheme / i18n) live in
# Keycloak's database instead and are set by configure-branding.sh.
#
# Build context is this directory (docker/keycloak):
#   az acr build --registry crbawweighttrackerprd \
#     --image keycloak-weighttracker:<tag> --file Dockerfile .
# ============================================================
FROM quay.io/keycloak/keycloak:24.0

COPY theme/weight-tracker /opt/keycloak/themes/weight-tracker
