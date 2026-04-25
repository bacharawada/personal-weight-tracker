# ============================================================
# Azure Storage — hosts Keycloak realm config and custom theme
#
# Files are uploaded as Terraform resources so any change to
# realm-export.json or theme files is detected on `terraform plan`
# and re-uploaded on `terraform apply`.
# ============================================================

resource "azurerm_storage_account" "keycloak" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  # Disable public blob access — files are accessed via SMB (Azure Files)
  allow_nested_items_to_be_public = false
}

resource "azurerm_storage_share" "keycloak_config" {
  name                 = "keycloak-config"
  storage_account_name = azurerm_storage_account.keycloak.name
  quota                = 1 # GB — more than enough for config files
}

# ------------------------------------------------------------
# Realm config — uploaded from the repo
# ------------------------------------------------------------

resource "azurerm_storage_share_directory" "import" {
  name             = "import"
  storage_share_id = azurerm_storage_share.keycloak_config.id
}

resource "azurerm_storage_share_file" "realm_export" {
  name             = "realm-export.json"
  storage_share_id = azurerm_storage_share.keycloak_config.id
  path             = azurerm_storage_share_directory.import.name
  source           = "${path.module}/../docker/keycloak/realm-export.json"

  # Re-upload whenever the file content changes
  content_md5 = filemd5("${path.module}/../docker/keycloak/realm-export.json")
}

# ------------------------------------------------------------
# Custom Keycloak theme — uploaded recursively
# Terraform requires one resource per file; we use a for_each
# over all files found in the theme directory.
# ------------------------------------------------------------

locals {
  theme_dir = "${path.module}/../docker/keycloak/theme"

  # Collect all files under the theme directory.
  # fileset returns paths relative to theme_dir.
  theme_files = fileset(local.theme_dir, "**")
}

resource "azurerm_storage_share_directory" "theme_root" {
  name             = "themes"
  storage_share_id = azurerm_storage_share.keycloak_config.id
}

resource "azurerm_storage_share_directory" "theme_weight_tracker" {
  name             = "themes/weight-tracker"
  storage_share_id = azurerm_storage_share.keycloak_config.id

  depends_on = [azurerm_storage_share_directory.theme_root]
}

# Create intermediate subdirectories for nested theme files
resource "azurerm_storage_share_directory" "theme_subdirs" {
  for_each = toset([
    for f in local.theme_files :
    "themes/weight-tracker/${dirname(f)}"
    if dirname(f) != "."
  ])

  name             = each.value
  storage_share_id = azurerm_storage_share.keycloak_config.id

  depends_on = [azurerm_storage_share_directory.theme_weight_tracker]
}

resource "azurerm_storage_share_file" "theme_files" {
  for_each = { for f in local.theme_files : f => f }

  name             = basename(each.value)
  storage_share_id = azurerm_storage_share.keycloak_config.id
  path = (
    dirname(each.value) == "."
    ? "themes/weight-tracker"
    : "themes/weight-tracker/${dirname(each.value)}"
  )
  source      = "${local.theme_dir}/${each.value}"
  content_md5 = filemd5("${local.theme_dir}/${each.value}")

  depends_on = [azurerm_storage_share_directory.theme_subdirs]
}
