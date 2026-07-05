# ============================================================
# Networking — VNet for private PostgreSQL access
#
# The PostgreSQL Flexible Server is injected into a delegated
# subnet and never exposed publicly. The Container Apps
# environment is injected into its own delegated subnet in the
# same VNet, so the app and Keycloak reach the database over a
# private IP. A private DNS zone resolves the server FQDN to
# that private IP from inside the VNet.
#
# This uses subnet delegation (not a private endpoint), which
# gives the same isolation without the per-hour private-endpoint
# cost.
# ============================================================

resource "azurerm_virtual_network" "main" {
  name                = "vnet-baw-weighttracker-prd"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
}

# ------------------------------------------------------------
# Container Apps subnet
# Consumption-only environments require a dedicated /23 subnet
# delegated to Microsoft.App/environments.
# ------------------------------------------------------------
resource "azurerm_subnet" "containerapps" {
  name                 = "snet-containerapps"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.0.0/23"]

  delegation {
    name = "containerapps-delegation"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# ------------------------------------------------------------
# PostgreSQL subnet
# Flexible Server VNet integration requires a dedicated subnet
# delegated to Microsoft.DBforPostgreSQL/flexibleServers.
# ------------------------------------------------------------
resource "azurerm_subnet" "postgres" {
  name                 = "snet-postgres"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/28"]

  delegation {
    name = "postgres-delegation"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# ------------------------------------------------------------
# Private DNS zone — resolves the PostgreSQL FQDN to its
# private IP for clients inside the VNet.
# ------------------------------------------------------------
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
