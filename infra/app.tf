# ============================================================
# Weight Tracker app Container App
#
# On first `terraform apply` a placeholder image is deployed
# so the Container App resource and custom domain binding exist.
# GitHub Actions updates the image on every push to main.
#
# lifecycle.ignore_changes on the image prevents Terraform from
# rolling back CI-deployed revisions when re-running `terraform
# apply` for infrastructure changes.
# ============================================================

resource "azurerm_container_app" "app" {
  name                         = "weight-tracker"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  # Pull images from ACR using admin credentials
  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  # ------------------------------------------------------------
  # Secrets
  # ------------------------------------------------------------
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "database-url"
    value = var.database_url
  }

  # ------------------------------------------------------------
  # Ingress — external HTTPS, port 8000
  # ------------------------------------------------------------
  ingress {
    external_enabled = true
    target_port      = 8000
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  # ------------------------------------------------------------
  # Container spec
  # ------------------------------------------------------------
  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name = "weight-tracker"

      # Placeholder image — GitHub Actions replaces this on first push to main.
      # ignore_changes below ensures Terraform never reverts it.
      image  = "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name  = "KEYCLOAK_URL"
        value = "https://${var.keycloak_domain}"
      }
      env {
        name  = "KEYCLOAK_REALM"
        value = "weight-tracker"
      }
      env {
        name  = "KEYCLOAK_CLIENT_ID"
        value = "weight-tracker-frontend"
      }
      env {
        name  = "CORS_ORIGINS"
        value = "https://${var.app_domain}"
      }
    }
  }

  # Do not let Terraform overwrite the image deployed by GitHub Actions.
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }
}
