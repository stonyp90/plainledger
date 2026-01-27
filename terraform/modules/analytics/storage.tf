# ==============================================================================
# Azure Blob Storage for Power BI Data Source
# ==============================================================================

resource "azurerm_storage_account" "powerbi" {
  name                     = "${replace(var.project, "-", "")}${replace(var.environment, "-", "")}pbi${substr(md5(var.azure_location), 0, 4)}"
  resource_group_name      = azurerm_resource_group.analytics.name
  location                 = var.azure_location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  # Enable hierarchical namespace for Data Lake Gen2 features
  is_hns_enabled = true

  # Enable blob versioning
  blob_properties {
    versioning_enabled = true
    delete_retention_policy {
      days = 90
    }
  }

  # Network rules - allow access from AWS DataSync
  network_rules {
    default_action             = "Allow"
    bypass                     = ["AzureServices"]
    ip_rules                   = var.allowed_ip_ranges
    virtual_network_subnet_ids = []
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    Purpose     = "PowerBI Data Source"
  }
}

resource "azurerm_storage_container" "gold" {
  name                  = "gold"
  storage_account_name  = azurerm_storage_account.powerbi.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "powerbi-reports" {
  name                  = "powerbi-reports"
  storage_account_name  = azurerm_storage_account.powerbi.name
  container_access_type = "private"
}

# Data source to retrieve storage account details
data "azurerm_storage_account" "powerbi" {
  name                = azurerm_storage_account.powerbi.name
  resource_group_name = azurerm_resource_group.analytics.name
  depends_on          = [azurerm_storage_account.powerbi]
}

# Output connection details (sensitive)
output "storage_account_name" {
  value       = azurerm_storage_account.powerbi.name
  description = "Azure Storage Account name for Power BI data"
}

output "storage_account_key" {
  value       = data.azurerm_storage_account.powerbi.primary_access_key
  sensitive   = true
  description = "Azure Storage Account access key (for DataSync)"
}

output "storage_account_url" {
  value       = azurerm_storage_account.powerbi.primary_blob_endpoint
  description = "Azure Blob Storage endpoint URL"
}
