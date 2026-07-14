# ============================================================
# PostgreSQL Flexible Server — private, VNet-integrated
#
# Hosts two databases on a single server:
#   - weighttracker  (the FastAPI app)
#   - keycloak       (the Keycloak auth server)
#
# public_network_access_enabled = false: the server is only
# reachable over the private IP inside the VNet. The admin
# password is generated and kept in Terraform state — never
# entered by hand.
#
# Connection strings are computed from these resources and
# injected into the containers (see app.tf / keycloak.tf).
# ============================================================

resource "random_password" "postgres_admin" {
  length  = 32
  special = true
  # Exclude characters that need escaping in connection strings / JDBC URLs.
  override_special = "-_"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-baw-weighttracker-prd"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  version = "16"

  administrator_login    = var.postgres_admin_username
  administrator_password = random_password.postgres_admin.result

  # Private VNet integration — no public endpoint.
  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false

  # Burstable tier — cheapest option, adequate for low traffic.
  sku_name   = "B_Standard_B1ms"
  storage_mb = 32768 # 32 GB (minimum)

  # No high-availability / zone redundancy for a personal deployment.
  zone = "1"

  # The DNS link must exist before the server so the private
  # zone is populated at creation time.
  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# ------------------------------------------------------------
# Databases
# ------------------------------------------------------------

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = "weighttracker"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_database" "keycloak" {
  name      = "keycloak"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# ------------------------------------------------------------
# Computed connection strings
# ------------------------------------------------------------

locals {
  postgres_fqdn = azurerm_postgresql_flexible_server.main.fqdn

  # SQLAlchemy DSN for the FastAPI app.
  app_database_url = format(
    "postgresql+psycopg2://%s:%s@%s/%s?sslmode=require",
    var.postgres_admin_username,
    random_password.postgres_admin.result,
    local.postgres_fqdn,
    azurerm_postgresql_flexible_server_database.app.name,
  )

  # JDBC URL for Keycloak (credentials passed separately as env vars).
  keycloak_jdbc_url = format(
    "jdbc:postgresql://%s/%s?sslmode=require",
    local.postgres_fqdn,
    azurerm_postgresql_flexible_server_database.keycloak.name,
  )
}
