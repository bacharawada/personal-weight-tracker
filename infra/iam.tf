# ============================================================
# IAM — Service principal for GitHub Actions (OIDC)
#
# Creates an Azure AD application + service principal and
# assigns it the minimum required roles:
#   - Contributor on the resource group  (deploy Container Apps)
#   - AcrPush on the Container Registry  (push Docker images)
#
# GitHub Actions authenticates via OIDC federated credentials —
# no client secret is stored anywhere.
# ============================================================

data "azurerm_subscription" "current" {}

# ------------------------------------------------------------
# Azure AD application
# ------------------------------------------------------------

resource "azuread_application" "github_actions" {
  display_name = "weight-tracker-github-actions"
}

resource "azuread_service_principal" "github_actions" {
  client_id = azuread_application.github_actions.client_id
}

# ------------------------------------------------------------
# OIDC federated credential
# Tells Azure to trust GitHub Actions tokens for the main branch.
# Replace <YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO> in terraform.tfvars.
# ------------------------------------------------------------

resource "azuread_application_federated_identity_credential" "github_actions" {
  application_id = azuread_application.github_actions.id
  display_name   = "github-actions-main"
  description    = "GitHub Actions OIDC for pushes to main"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://token.actions.githubusercontent.com"
  subject        = "repo:${var.github_repo}:ref:refs/heads/main"
}

# ------------------------------------------------------------
# Role assignments
# ------------------------------------------------------------

# Contributor on the resource group — allows deploying Container Apps
resource "azurerm_role_assignment" "github_actions_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azuread_service_principal.github_actions.object_id
}

# AcrPush on the Container Registry — allows pushing Docker images
resource "azurerm_role_assignment" "github_actions_acr_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.github_actions.object_id
}
