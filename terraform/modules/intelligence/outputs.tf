# ==============================================================================
# Intelligence Module Outputs
# ==============================================================================

output "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID"
  value       = aws_bedrockagent_knowledge_base.industry_patterns.id
}

output "knowledge_base_arn" {
  description = "Bedrock Knowledge Base ARN"
  value       = aws_bedrockagent_knowledge_base.industry_patterns.arn
}

output "data_source_id" {
  description = "Bedrock Data Source ID"
  value       = aws_bedrockagent_data_source.gold_patterns.id
}

output "opensearch_collection_arn" {
  description = "OpenSearch Serverless Collection ARN"
  value       = aws_opensearchserverless_collection.industry_patterns.arn
}

output "opensearch_collection_endpoint" {
  description = "OpenSearch Serverless Collection Endpoint"
  value       = aws_opensearchserverless_collection.industry_patterns.collection_endpoint
}

output "bedrock_kb_role_arn" {
  description = "IAM Role ARN for Bedrock Knowledge Base"
  value       = aws_iam_role.bedrock_kb.arn
}

output "sagemaker_endpoint_name" {
  description = "SageMaker Endpoint Name"
  value       = aws_sagemaker_endpoint.decision_inference.name
}

output "sagemaker_endpoint_arn" {
  description = "SageMaker Endpoint ARN"
  value       = aws_sagemaker_endpoint.decision_inference.arn
}

output "sagemaker_training_job_name" {
  description = "SageMaker Training Job Name"
  value       = aws_sagemaker_training_job.decision_model.training_job_name
}

output "sagemaker_role_arn" {
  description = "IAM Role ARN for SageMaker"
  value       = aws_iam_role.sagemaker.arn
}
