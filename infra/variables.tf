# ============================================================
# Weight Tracker — Input variable declarations
#
# Sensitive values are marked sensitive = true so Terraform
# redacts them from plan/apply output.
# Set all values in terraform.tfvars (gitignored).
# ============================================================

# ------------------------------------------------------------
# Azure identity
# ------------------------------------------------------------

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

# ------------------------------------------------------------
# Naming & location
# ------------------------------------------------------------

variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "rg-baw-weighttracker-prd"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "francecentral"
}

variable "acr_name" {
  description = "Azure Container Registry name (globally unique, alphanumeric only — hyphens not allowed by Azure)"
  type        = string
  default     = "crbawweighttrackerprd"
}

variable "storage_account_name" {
  description = "Storage account name for Keycloak config files (globally unique, 3-24 lowercase alphanumeric — hyphens not allowed by Azure)"
  type        = string
  default     = "stbawweighttrackerprd"
}

# ------------------------------------------------------------
# App — database (Neon)
# ------------------------------------------------------------

variable "database_url" {
  description = "SQLAlchemy connection string for the app (Neon PostgreSQL). Format: postgresql+psycopg2://user:password@host/dbname?sslmode=require"
  type        = string
  sensitive   = true
}

# ------------------------------------------------------------
# Keycloak — database (Neon)
# ------------------------------------------------------------

variable "kc_db_url" {
  description = "JDBC connection string for Keycloak (Neon PostgreSQL). Format: jdbc:postgresql://host/dbname?user=...&password=...&sslmode=require"
  type        = string
  sensitive   = true
}

variable "kc_db_username" {
  description = "Database username for Keycloak (from Neon)"
  type        = string
  sensitive   = true
}

variable "kc_db_password" {
  description = "Database password for Keycloak (from Neon)"
  type        = string
  sensitive   = true
}

# ------------------------------------------------------------
# Keycloak — admin credentials
# ------------------------------------------------------------

variable "keycloak_admin" {
  description = "Keycloak admin username"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak admin password"
  type        = string
  sensitive   = true
}

# ------------------------------------------------------------
# GitHub — for OIDC federated credential
# ------------------------------------------------------------

variable "github_repo" {
  description = "GitHub repository in org/repo format (e.g. bawada/weight_analysis)"
  type        = string
}

# ------------------------------------------------------------
# Domains (fixed for this project — override if needed)
# ------------------------------------------------------------

variable "app_domain" {
  description = "Custom domain for the weight tracker app"
  type        = string
  default     = "weighttracker.bawada.fr"
}

variable "keycloak_domain" {
  description = "Custom domain for the Keycloak auth server"
  type        = string
  default     = "weighttracker-auth.bawada.fr"
}
