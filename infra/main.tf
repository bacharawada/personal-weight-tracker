# ============================================================
# Weight Tracker — Terraform root configuration
#
# Providers:
#   azurerm  — Azure Resource Manager (infrastructure)
#   azuread  — Azure Active Directory (service principal)
#
# State: local (terraform.tfstate in this directory)
#        Add to .gitignore — never commit state files.
# ============================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.50"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

provider "azuread" {}
