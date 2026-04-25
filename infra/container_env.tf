# ============================================================
# Container Apps Environment — shared runtime for all containers
# ============================================================

resource "azurerm_container_app_environment" "main" {
  name                = "cae-baw-weighttracker-prd"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

# Attach the Azure Files share so Container Apps can mount it.
resource "azurerm_container_app_environment_storage" "keycloak_files" {
  name                         = "keycloak-files"
  container_app_environment_id = azurerm_container_app_environment.main.id
  account_name                 = azurerm_storage_account.keycloak.name
  share_name                   = azurerm_storage_share.keycloak_config.name
  access_key                   = azurerm_storage_account.keycloak.primary_access_key
  access_mode                  = "ReadOnly"
}
