# ==============================================================================
# PlainLedger - Analytics Module Outputs
# ==============================================================================

output "azure_ad_application_id" {
  value       = azuread_application.powerbi.application_id
  description = "Azure AD Application ID (Client ID)"
}

output "azure_ad_service_principal_id" {
  value       = azuread_service_principal.powerbi.id
  description = "Azure AD Service Principal ID"
}

output "azure_ad_client_secret" {
  value       = azuread_service_principal_password.powerbi.value
  sensitive   = true
  description = "Azure AD Client Secret"
}

output "azure_ad_tenant_id" {
  value       = data.azurerm_client_config.current.tenant_id
  description = "Azure AD Tenant ID"
}

# Power BI Workspace ID will be configured manually after capacity creation

output "storage_account_name" {
  value       = azurerm_storage_account.powerbi.name
  description = "Azure Storage Account name"
}

output "storage_account_url" {
  value       = azurerm_storage_account.powerbi.primary_blob_endpoint
  description = "Azure Blob Storage endpoint URL"
}

output "glue_job_name" {
  value       = aws_glue_job.gold_to_azure.name
  description = "AWS Glue job name for delta sync"
}
