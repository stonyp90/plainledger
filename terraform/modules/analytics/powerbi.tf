# ==============================================================================
# Power BI Embedded Capacity
# ==============================================================================

# Note: Power BI Embedded capacity must be created manually via Azure Portal
# or Azure CLI, as Terraform provider doesn't fully support it yet.
# This file documents the required configuration.

# Power BI Embedded A1 SKU Configuration:
# - SKU: A1
# - V-Cores: 1
# - RAM: 3 GB
# - Monthly Cost: ~$740 USD (pausable)
# - Location: Same as resource group

# To create manually:
# az powerbi embedded-capacity create \
#   --resource-group <resource-group-name> \
#   --name <capacity-name> \
#   --sku-name A1 \
#   --location <location> \
#   --administration-members <admin-email>

# Output the service principal details for manual workspace assignment
locals {
  powerbi_capacity_name = "${var.project}-${var.environment}-pbi-capacity"
}

# Store capacity configuration in output (to be created manually)
output "powerbi_capacity_config" {
  value = {
    name         = local.powerbi_capacity_name
    sku          = "A1"
    v_cores      = 1
    ram_gb       = 3
    monthly_cost = "~$740 USD"
    location     = var.azure_location
    note         = "Create manually via Azure Portal or CLI"
  }
}
