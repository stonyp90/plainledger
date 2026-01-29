# Terraform tests for SageMaker infrastructure
# Part of the Context Intelligence Platform

run "sagemaker_endpoint_creation" {
  command = plan

  assert {
    condition     = aws_sagemaker_endpoint.decision_inference.name != ""
    error_message = "SageMaker endpoint name must be set"
  }

  assert {
    condition     = aws_sagemaker_endpoint_configuration.serverless.production_variants[0].serverless_config.memory_size_in_mb == 4096
    error_message = "Serverless config must have 4GB memory"
  }

  assert {
    condition     = aws_sagemaker_endpoint_configuration.serverless.production_variants[0].serverless_config.max_concurrency == 50
    error_message = "Serverless config must have max concurrency of 50"
  }
}

run "training_job_configuration" {
  command = plan

  assert {
    condition     = aws_sagemaker_training_job.decision_model.resource_config.instance_type == "ml.g5.2xlarge"
    error_message = "Training job must use GPU instance"
  }

  assert {
    condition     = aws_sagemaker_training_job.decision_model.resource_config.instance_count == 1
    error_message = "Training job must use single instance"
  }

  assert {
    condition     = aws_sagemaker_training_job.decision_model.resource_config.volume_size_gb == 100
    error_message = "Training job must have 100GB volume"
  }

  assert {
    condition     = aws_sagemaker_training_job.decision_model.stopping_condition.max_runtime_in_seconds == 7200
    error_message = "Training job must have 2 hour timeout"
  }
}

run "sagemaker_iam_role" {
  command = plan

  assert {
    condition     = aws_iam_role.sagemaker.name != ""
    error_message = "SageMaker IAM role name must be set"
  }

  assert {
    condition     = length(aws_iam_role_policy.sagemaker_s3.policy) > 0
    error_message = "SageMaker IAM role must have S3 policy"
  }
}
