#!/bin/bash
# ============================================================
# Weight Tracker — Azure infrastructure provisioning
#
# Provisions all Azure resources needed to run the app in
# production. Safe to re-run (idempotent).
#
# Prerequisites:
#   - Azure CLI installed and logged in (`az login`)
#   - jq installed (for JSON parsing)
#   - Run from the repo root: bash infra/provision.sh
#
# What this creates:
#   - Resource group
#   - Azure Container Registry (Basic)
#   - Azure Storage Account + File Share (Keycloak config)
#   - Container Apps Environment
#   - Keycloak Container App
#   - Weight Tracker app Container App
#
# After running, follow the printed instructions to:
#   1. Set your DNS records
#   2. Bind custom domains in Azure (triggers TLS cert)
#   3. Set GitHub Actions secrets
# ============================================================
set -euo pipefail

# ------------------------------------------------------------
# Configuration — edit these if you change regions or names
# ------------------------------------------------------------
RESOURCE_GROUP="weight-tracker-rg"
LOCATION="francecentral"
ACR_NAME="weighttrackercr"
STORAGE_ACCOUNT="weighttrackerstorage"
FILE_SHARE="keycloak-config"
CONTAINERAPP_ENV="weight-tracker-env"
APP_NAME="weight-tracker"
KEYCLOAK_APP_NAME="weight-tracker-keycloak"
APP_DOMAIN="weighttracker.bawada.fr"
KEYCLOAK_DOMAIN="weighttracker-auth.bawada.fr"
KEYCLOAK_IMAGE="quay.io/keycloak/keycloak:24.0"

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
info()    { echo ""; echo "===> $*"; }
success() { echo "  [ok] $*"; }
warn()    { echo "  [!]  $*"; }

# ------------------------------------------------------------
# 0. Validate required environment variables
# ------------------------------------------------------------
info "Validating required environment variables..."

required_vars=(
  DATABASE_URL
  KEYCLOAK_ADMIN
  KEYCLOAK_ADMIN_PASSWORD
  POSTGRES_USER_KC
  POSTGRES_PASSWORD_KC
  KC_DB_URL
)

missing=0
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    warn "Missing required env var: $var"
    missing=1
  fi
done

if [[ $missing -eq 1 ]]; then
  echo ""
  echo "Set the missing variables and re-run. See .env.production.example for details."
  exit 1
fi

success "All required env vars present."

# ------------------------------------------------------------
# 1. Resource group
# ------------------------------------------------------------
info "Creating resource group: $RESOURCE_GROUP ($LOCATION)..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
success "Resource group ready."

# ------------------------------------------------------------
# 2. Azure Container Registry
# ------------------------------------------------------------
info "Creating Container Registry: $ACR_NAME..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none
success "ACR ready: ${ACR_NAME}.azurecr.io"

# Retrieve ACR credentials for Container Apps
ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# ------------------------------------------------------------
# 3. Azure Storage Account + File Share (Keycloak config)
# ------------------------------------------------------------
info "Creating Storage Account: $STORAGE_ACCOUNT..."
az storage account create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --output none
success "Storage account ready."

STORAGE_KEY=$(az storage account keys list \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$STORAGE_ACCOUNT" \
  --query "[0].value" -o tsv)

info "Creating file share: $FILE_SHARE..."
az storage share create \
  --name "$FILE_SHARE" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none
success "File share ready."

# ------------------------------------------------------------
# 4. Upload Keycloak realm config and theme to Azure Files
# ------------------------------------------------------------
info "Uploading Keycloak realm config to Azure Files..."

# Upload realm-export.json into an 'import' directory
az storage directory create \
  --share-name "$FILE_SHARE" \
  --name "import" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none 2>/dev/null || true

az storage file upload \
  --share-name "$FILE_SHARE" \
  --path "import/realm-export.json" \
  --source "docker/keycloak/realm-export.json" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none
success "realm-export.json uploaded."

# Upload theme directory recursively
info "Uploading Keycloak custom theme to Azure Files..."
az storage directory create \
  --share-name "$FILE_SHARE" \
  --name "themes" \
  --account-name "$STORAGE_ACCOUNT" \
  --account-key "$STORAGE_KEY" \
  --output none 2>/dev/null || true

# Upload theme files (find all files under docker/keycloak/theme/)
while IFS= read -r -d '' file; do
  # Relative path inside theme/
  rel="${file#docker/keycloak/theme/}"
  dir=$(dirname "$rel")

  # Create parent directory in Azure Files if needed
  if [[ "$dir" != "." ]]; then
    az storage directory create \
      --share-name "$FILE_SHARE" \
      --name "themes/weight-tracker/$dir" \
      --account-name "$STORAGE_ACCOUNT" \
      --account-key "$STORAGE_KEY" \
      --output none 2>/dev/null || true
  fi

  az storage file upload \
    --share-name "$FILE_SHARE" \
    --path "themes/weight-tracker/$rel" \
    --source "$file" \
    --account-name "$STORAGE_ACCOUNT" \
    --account-key "$STORAGE_KEY" \
    --output none
done < <(find docker/keycloak/theme -type f -print0)
success "Theme files uploaded."

# ------------------------------------------------------------
# 5. Container Apps Environment
# ------------------------------------------------------------
info "Creating Container Apps Environment: $CONTAINERAPP_ENV..."
az containerapp env create \
  --name "$CONTAINERAPP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
success "Container Apps Environment ready."

# Mount Azure Files into the environment so containers can use it
info "Attaching Azure Files storage to Container Apps environment..."
az containerapp env storage set \
  --name "$CONTAINERAPP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-name "keycloak-files" \
  --azure-file-account-name "$STORAGE_ACCOUNT" \
  --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$FILE_SHARE" \
  --access-mode ReadOnly \
  --output none
success "Azure Files storage attached."

# ------------------------------------------------------------
# 6. Keycloak Container App
# ------------------------------------------------------------
info "Deploying Keycloak Container App: $KEYCLOAK_APP_NAME..."
az containerapp create \
  --name "$KEYCLOAK_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINERAPP_ENV" \
  --image "$KEYCLOAK_IMAGE" \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 1 \
  --ingress external \
  --target-port 8080 \
  --transport http \
  --args "start" "--import-realm" "--health-enabled=true" \
  --env-vars \
    "KC_DB=postgres" \
    "KC_DB_URL=${KC_DB_URL}" \
    "KC_DB_USERNAME=${POSTGRES_USER_KC}" \
    "KC_DB_PASSWORD=secretref:kc-db-password" \
    "KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN}" \
    "KEYCLOAK_ADMIN_PASSWORD=secretref:kc-admin-password" \
    "KC_HOSTNAME=${KEYCLOAK_DOMAIN}" \
    "KC_HOSTNAME_STRICT=false" \
    "KC_HTTP_ENABLED=true" \
    "KC_PROXY=edge" \
  --secrets \
    "kc-db-password=${POSTGRES_PASSWORD_KC}" \
    "kc-admin-password=${KEYCLOAK_ADMIN_PASSWORD}" \
  --volume-mount "keycloak-files:/opt/keycloak/config-mount" \
  --output none
success "Keycloak Container App deployed."

KEYCLOAK_FQDN=$(az containerapp show \
  --name "$KEYCLOAK_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
success "Keycloak FQDN: $KEYCLOAK_FQDN"

# ------------------------------------------------------------
# 7. App Container App (placeholder image — CI will update it)
# ------------------------------------------------------------
# We deploy with the ACR image tag :latest. On first run this
# won't exist yet; GitHub Actions will push and update it after
# the first push to main. We use a public placeholder image so
# the Container App resource exists for domain binding now.
info "Deploying app Container App: $APP_NAME..."
az containerapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINERAPP_ENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --ingress external \
  --target-port 8000 \
  --transport http \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --env-vars \
    "DATABASE_URL=secretref:database-url" \
    "KEYCLOAK_URL=https://${KEYCLOAK_DOMAIN}" \
    "KEYCLOAK_REALM=weight-tracker" \
    "KEYCLOAK_CLIENT_ID=weight-tracker-frontend" \
    "CORS_ORIGINS=https://${APP_DOMAIN}" \
  --secrets \
    "database-url=${DATABASE_URL}" \
  --output none
success "App Container App deployed (placeholder image)."

APP_FQDN=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
success "App FQDN: $APP_FQDN"

# ------------------------------------------------------------
# 8. GitHub Actions service principal (OIDC federated creds)
# ------------------------------------------------------------
info "Creating service principal for GitHub Actions (OIDC)..."

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

SP_NAME="weight-tracker-github-actions"

# Create SP with Contributor role scoped to the resource group
SP_APP_ID=$(az ad sp create-for-rbac \
  --name "$SP_NAME" \
  --role Contributor \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}" \
  --query appId -o tsv 2>/dev/null || \
  az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv)

# Also grant AcrPush role so the SP can push images to ACR
az role assignment create \
  --assignee "$SP_APP_ID" \
  --role AcrPush \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ContainerRegistry/registries/${ACR_NAME}" \
  --output none 2>/dev/null || true

success "Service principal ready: $SP_NAME (appId: $SP_APP_ID)"

# ------------------------------------------------------------
# 9. Summary + next steps
# ------------------------------------------------------------
echo ""
echo "================================================================"
echo "  PROVISIONING COMPLETE"
echo "================================================================"
echo ""
echo "Azure FQDNs (Azure-assigned, before custom domain binding):"
echo "  App:      https://$APP_FQDN"
echo "  Keycloak: https://$KEYCLOAK_FQDN"
echo ""
echo "----------------------------------------------------------------"
echo "  STEP 1 — Set DNS records at your registrar for bawada.fr"
echo "----------------------------------------------------------------"
echo "  Type   Host                        Value"
echo "  CNAME  weighttracker               $APP_FQDN"
echo "  CNAME  weighttracker-auth          $KEYCLOAK_FQDN"
echo ""
echo "  Wait for DNS propagation (~2-30 min) before step 2."
echo ""
echo "----------------------------------------------------------------"
echo "  STEP 2 — Bind custom domains (triggers free TLS cert)"
echo "----------------------------------------------------------------"
echo "  Run these AFTER DNS has propagated:"
echo ""
echo "  az containerapp hostname bind \\"
echo "    --name $APP_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --hostname $APP_DOMAIN \\"
echo "    --validation-method CNAME"
echo ""
echo "  az containerapp hostname bind \\"
echo "    --name $KEYCLOAK_APP_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --hostname $KEYCLOAK_DOMAIN \\"
echo "    --validation-method CNAME"
echo ""
echo "----------------------------------------------------------------"
echo "  STEP 3 — Create Neon database"
echo "----------------------------------------------------------------"
echo "  1. Go to https://neon.tech and create a free account"
echo "  2. Create a new project (region: EU Frankfurt is closest)"
echo "  3. Create a database named: weight_tracker"
echo "  4. Copy the connection string (postgresql+psycopg2://...)"
echo "  5. Re-run this script with DATABASE_URL set to the Neon URL"
echo "     (or update the Container App secret directly via az CLI)"
echo ""
echo "----------------------------------------------------------------"
echo "  STEP 4 — Set GitHub Actions secrets"
echo "----------------------------------------------------------------"
echo "  In your GitHub repo → Settings → Secrets and variables → Actions:"
echo ""
echo "  Secret name               Value"
echo "  AZURE_CLIENT_ID           $SP_APP_ID"
echo "  AZURE_TENANT_ID           $TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID     $SUBSCRIPTION_ID"
echo "  ACR_LOGIN_SERVER          $ACR_SERVER"
echo "  VITE_KEYCLOAK_URL         https://$KEYCLOAK_DOMAIN"
echo "  VITE_KEYCLOAK_REALM       weight-tracker"
echo "  VITE_KEYCLOAK_CLIENT_ID   weight-tracker-frontend"
echo ""
echo "  Then configure OIDC federated credentials for the SP:"
echo "  https://docs.microsoft.com/azure/active-directory/develop/workload-identity-federation"
echo "  Entity: GitHub Actions, repo: <your-org>/<your-repo>, branch: main"
echo ""
echo "----------------------------------------------------------------"
echo "  STEP 5 — Push to main to trigger first real deployment"
echo "----------------------------------------------------------------"
echo "  git push origin main"
echo "  GitHub Actions will build and push the image, then update"
echo "  the Container App to use it."
echo ""
echo "================================================================"
