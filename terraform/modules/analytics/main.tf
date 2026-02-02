# ==============================================================================
# PlainLedger - Analytics Module (Azure AD + Power BI)
# ==============================================================================

terraform {
  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85"
    }
  }
}

data "azurerm_client_config" "current" {}

# ------------------------------------------------------------------------------
# Azure AD Application Registration
# ------------------------------------------------------------------------------
resource "azuread_application" "powerbi" {
  display_name = "${var.project}-${var.environment}-powerbi"
  description  = "Power BI Embedded service principal for PlainLedger"

  required_resource_access {
    resource_app_id = "00000009-0000-0000-c000-000000000000" # Microsoft Graph

    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d" # User.Read
      type = "Scope"
    }
  }

  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Power BI Service

    resource_access {
      id   = "4ae9db30-8c11-4b1e-8a39-5a8e4e5b3b3a" # Dataset.ReadWrite.All
      type = "Role"
    }
    resource_access {
      id   = "b0c3b4d0-8c11-4b1e-8a39-5a8e4e5b3b3a" # Report.Read.All
      type = "Role"
    }
    resource_access {
      id   = "b0c3b4d0-8c11-4b1e-8a39-5a8e4e5b3b3a" # Workspace.Read.All
      type = "Role"
    }
  }

  web {
    redirect_uris = []
  }

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "azuread_service_principal" "powerbi" {
  application_id = azuread_application.powerbi.application_id
  description    = "Service principal for Power BI Embedded"

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "azuread_service_principal_password" "powerbi" {
  service_principal_id = azuread_service_principal.powerbi.id
  display_name         = "${var.project}-${var.environment}-powerbi-secret"
  end_date_relative    = "8760h" # 1 year
}

# ------------------------------------------------------------------------------
# Azure Resource Group
# ------------------------------------------------------------------------------
resource "azurerm_resource_group" "analytics" {
  name     = "${var.project}-${var.environment}-analytics"
  location = var.azure_location

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
