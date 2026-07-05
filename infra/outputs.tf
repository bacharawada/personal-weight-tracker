# ============================================================
# Outputs — printed after `terraform apply`
#
# These values are needed to complete the deployment:
#   1. Set DNS CNAME records at your registrar
#   2. Bind custom domains in Azure (triggers TLS cert)
#   3. Set GitHub Actions secrets
# ============================================================

# ------------------------------------------------------------
# Azure-assigned FQDNs (before custom domain binding)
# ------------------------------------------------------------

output "app_fqdn" {
  description = "Azure-assigned FQDN for the weight tracker app"
  value       = azurerm_container_app.app.latest_revision_fqdn
}

output "keycloak_fqdn" {
  description = "Azure-assigned FQDN for the Keycloak auth server"
  value       = azurerm_container_app.keycloak.latest_revision_fqdn
}

# ------------------------------------------------------------
# DNS records to set at your registrar
# ------------------------------------------------------------

output "dns_instructions" {
  description = "DNS CNAME records to set at your bawada.fr registrar"
  value       = <<-EOT

    ================================================================
    STEP 1 — Set these DNS records at your registrar for bawada.fr
    ================================================================
    Type   Host                   Value
    CNAME  weighttracker          ${azurerm_container_app.app.latest_revision_fqdn}
    CNAME  weighttracker-auth     ${azurerm_container_app.keycloak.latest_revision_fqdn}

    Wait for DNS propagation (~2–30 min) before binding custom domains.

    ================================================================
    STEP 2 — Bind custom domains (run after DNS has propagated)
    ================================================================
    az containerapp hostname bind \
      --name ca-baw-weighttracker-prd \
      --resource-group ${var.resource_group_name} \
      --hostname ${var.app_domain} \
      --validation-method CNAME

    az containerapp hostname bind \
      --name ca-baw-weighttracker-keycloak-prd \
      --resource-group ${var.resource_group_name} \
      --hostname ${var.keycloak_domain} \
      --validation-method CNAME

  EOT
}

# ------------------------------------------------------------
# GitHub Actions secrets
# ------------------------------------------------------------

output "github_actions_secrets" {
  description = "Values to set as GitHub Actions secrets"
  value       = <<-EOT

    ================================================================
    STEP 3 — Set these GitHub Actions secrets
    Settings → Secrets and variables → Actions → New repository secret
    ================================================================
    AZURE_CLIENT_ID          = ${azuread_application.github_actions.client_id}
    AZURE_TENANT_ID          = ${data.azurerm_subscription.current.tenant_id}
    AZURE_SUBSCRIPTION_ID    = ${data.azurerm_subscription.current.subscription_id}
    ACR_LOGIN_SERVER         = ${azurerm_container_registry.main.login_server}
    VITE_KEYCLOAK_URL        = https://${var.keycloak_domain}
    VITE_KEYCLOAK_REALM      = weight-tracker
    VITE_KEYCLOAK_CLIENT_ID  = weight-tracker-frontend

    ================================================================
    STEP 4 — Push to main to trigger first real deployment
    ================================================================
    git push origin main

  EOT
}

# ------------------------------------------------------------
# ACR login server (used in CI/CD references)
# ------------------------------------------------------------

output "acr_login_server" {
  description = "ACR login server hostname"
  value       = azurerm_container_registry.main.login_server
}
