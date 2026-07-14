# ============================================================
# Keycloak Container App
#
# Runs Keycloak 24.0 with:
#   - Azure PostgreSQL Flexible Server (private) as its backend database
#   - Realm config auto-imported from Azure Files on first boot
#   - Custom theme mounted from Azure Files
#   - KC_PROXY=edge so Keycloak trusts the TLS termination done
#     by Container Apps ingress
# ============================================================

resource "azurerm_container_app" "keycloak" {
  name                         = "ca-baw-weighttracker-kc-prd"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  # Pull the custom Keycloak image (weight-tracker theme baked in) from ACR
  # using admin credentials — mirrors the app Container App.
  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  # ------------------------------------------------------------
  # Secrets — referenced by env vars below via secretRef
  # ------------------------------------------------------------
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "kc-db-password"
    value = random_password.postgres_admin.result
  }

  secret {
    name  = "kc-admin-password"
    value = var.keycloak_admin_password
  }

  # ------------------------------------------------------------
  # Ingress — external HTTPS, port 8080
  # ------------------------------------------------------------
  ingress {
    external_enabled = true
    target_port      = 8080
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
    max_replicas = 1

    # Mount the Azure Files share
    volume {
      name         = "keycloak-config"
      storage_type = "AzureFile"
      storage_name = azurerm_container_app_environment_storage.keycloak_files.name
    }

    container {
      name   = "keycloak"
      # Custom image built from docker/keycloak/Dockerfile (stock Keycloak 24.0
      # + baked-in weight-tracker theme). The tag is set by the manual ACR
      # deploy; ignore_changes below keeps Terraform from reverting it.
      image  = "${azurerm_container_registry.main.login_server}/keycloak-weighttracker:latest"
      cpu    = 0.5
      memory = "1Gi"

      # Keycloak start command:
      # - `start` (production mode, not start-dev)
      # - `--import-realm` auto-imports realm-export.json from
      #   /opt/keycloak/data/import/ on first boot if realm absent
      # - `--health-enabled=true` for readiness probes
      args = ["start", "--import-realm", "--health-enabled=true"]

      # -- Database --
      env {
        name  = "KC_DB"
        value = "postgres"
      }
      env {
        name  = "KC_DB_URL"
        value = local.keycloak_jdbc_url
      }
      env {
        name  = "KC_DB_USERNAME"
        value = var.postgres_admin_username
      }
      env {
        name        = "KC_DB_PASSWORD"
        secret_name = "kc-db-password"
      }

      # -- Admin --
      env {
        name  = "KEYCLOAK_ADMIN"
        value = var.keycloak_admin
      }
      env {
        name        = "KEYCLOAK_ADMIN_PASSWORD"
        secret_name = "kc-admin-password"
      }

      # -- Hostname / proxy --
      env {
        name  = "KC_HOSTNAME"
        value = var.keycloak_domain
      }
      env {
        name  = "KC_HOSTNAME_STRICT"
        value = "false"
      }
      env {
        name  = "KC_HTTP_ENABLED"
        value = "true"
      }
      # Container Apps terminates TLS; tell Keycloak to trust the
      # X-Forwarded-* headers passed through by the ingress.
      env {
        name  = "KC_PROXY"
        value = "edge"
      }

      # -- Volume mounts --
      # Keycloak reads *.json from /opt/keycloak/data/import when started
      # with --import-realm. The Azure Files share root holds realm-export.json.
      volume_mounts {
        name = "keycloak-config"
        path = "/opt/keycloak/data/import"
      }

      # Liveness probe — Keycloak health endpoint
      liveness_probe {
        transport = "HTTP"
        path      = "/health/live"
        port      = 8080

        initial_delay           = 60
        interval_seconds        = 15
        timeout                 = 10
        failure_count_threshold = 5
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        path      = "/health/ready"
        port      = 8080

        interval_seconds        = 10
        timeout                 = 5
        failure_count_threshold = 10
        success_count_threshold = 1
      }
    }
  }

  depends_on = [azurerm_container_app_environment_storage.keycloak_files]

  # The image tag is set out-of-band by the manual ACR deploy
  # (az containerapp update); don't let Terraform revert it on infra
  # applies. Mirrors the app Container App.
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
    ]
  }
}
