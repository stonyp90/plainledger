# ==============================================================================
# SageMaker Training & Inference for Context Intelligence Platform
# ==============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ------------------------------------------------------------------------------
# IAM Role for SageMaker
# ------------------------------------------------------------------------------
resource "aws_iam_role" "sagemaker" {
  name = "${var.project}-${var.environment}-sagemaker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-sagemaker-role"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3" {
  name = "${var.project}-${var.environment}-sagemaker-s3"
  role = aws_iam_role.sagemaker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${var.gold_bucket_arn}",
          "${var.gold_bucket_arn}/*"
        ]
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# SageMaker Training Job
# ------------------------------------------------------------------------------
resource "aws_sagemaker_training_job" "decision_model" {
  training_job_name = "${var.project}-${var.environment}-decision-model-${formatdate("YYYYMMDD", timestamp())}"
  role_arn          = aws_iam_role.sagemaker.arn

  algorithm_specification {
    training_image = "763104351884.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/huggingface-pytorch-training:2.0.0-transformers4.28.1-gpu-py310-cu118-ubuntu20.04"
    training_input_mode = "File"
  }

  resource_config {
    instance_type   = "ml.g5.2xlarge"
    instance_count  = 1
    volume_size_gb  = 100
  }

  input_data_config {
    channel_name = "training"
    data_source {
      s3_data_source {
        s3_data_type = "S3Prefix"
        s3_uri       = "s3://${var.gold_bucket_name}/training_data/"
      }
    }
  }

  output_data_config {
    s3_output_path = "s3://${var.gold_bucket_name}/models/"
  }

  hyper_parameters = {
    "model_name"              = "mistralai/Mistral-7B-Instruct-v0.2"
    "num_train_epochs"        = "3"
    "per_device_train_batch_size" = "4"
    "gradient_accumulation_steps" = "4"
    "learning_rate"          = "2e-4"
    "lora_r"                 = "16"
    "lora_alpha"             = "32"
    "lora_dropout"           = "0.05"
  }

  stopping_condition {
    max_runtime_in_seconds = 7200 # 2 hours
  }

  tags = {
    Name        = "${var.project}-${var.environment}-decision-model-training"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# SageMaker Model
# ------------------------------------------------------------------------------
resource "aws_sagemaker_model" "decision" {
  name               = "${var.project}-${var.environment}-decision-model"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image = "763104351884.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.28.1-gpu-py310-cu118-ubuntu20.04"
    
    model_data_url = "s3://${var.gold_bucket_name}/models/${aws_sagemaker_training_job.decision_model.training_job_name}/output/model.tar.gz"
    
    environment = {
      "HF_MODEL_ID" = "mistralai/Mistral-7B-Instruct-v0.2"
      "HF_TASK"     = "text-generation"
      "MAX_INPUT_LENGTH" = "2048"
      "MAX_TOTAL_TOKENS" = "4096"
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-decision-model"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# SageMaker Endpoint Configuration (Serverless)
# ------------------------------------------------------------------------------
resource "aws_sagemaker_endpoint_configuration" "serverless" {
  name = "${var.project}-${var.environment}-serverless-config"

  production_variants {
    variant_name           = "AllTraffic"
    model_name             = aws_sagemaker_model.decision.name
    serverless_config {
      memory_size_in_mb = 4096
      max_concurrency   = 50
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-serverless-config"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# SageMaker Endpoint
# ------------------------------------------------------------------------------
resource "aws_sagemaker_endpoint" "decision_inference" {
  name                 = "${var.project}-${var.environment}-decision-endpoint"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.serverless.name

  tags = {
    Name        = "${var.project}-${var.environment}-decision-endpoint"
    Project     = var.project
    Environment = var.environment
  }
}
