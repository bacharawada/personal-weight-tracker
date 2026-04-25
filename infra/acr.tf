# ============================================================
# Azure Container Registry — stores the production Docker image
# ============================================================

resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"

  # Admin credentials are needed so Container Apps can pull images.
  admin_enabled = true
}
