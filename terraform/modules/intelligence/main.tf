# ==============================================================================
# PlainLedger - Intelligence Module
# AWS Bedrock Knowledge Base + OpenSearch Serverless for Context Intelligence
# ==============================================================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ------------------------------------------------------------------------------
# OpenSearch Serverless Collection for Vector Storage
# ------------------------------------------------------------------------------
resource "aws_opensearchserverless_collection" "industry_patterns" {
  name = "${var.project}-${var.environment}-industry-patterns"
  type = "VECTORSEARCH"

  tags = {
    Name        = "${var.project}-${var.environment}-industry-patterns"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# OpenSearch Serverless Access Policy
# ------------------------------------------------------------------------------
resource "aws_opensearchserverless_access_policy" "bedrock_access" {
  name        = "${var.project}-${var.environment}-bedrock-access"
  type        = "data"
  description = "Allow Bedrock to access OpenSearch Serverless collection"

  policy = jsonencode([
    {
      Rules = [
        {
          ResourceType = "collection"
          Resource     = ["collection/${aws_opensearchserverless_collection.industry_patterns.name}"]
          Permission    = [
            "aoss:CreateCollectionItems",
            "aoss:DeleteCollectionItems",
            "aoss:UpdateCollectionItems",
            "aoss:DescribeCollectionItems"
          ]
        },
        {
          ResourceType = "index"
          Resource     = ["index/${aws_opensearchserverless_collection.industry_patterns.name}/*"]
          Permission    = [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
            "aoss:ReadDocument",
            "aoss:WriteDocument"
          ]
        }
      ]
      Principal = [aws_iam_role.bedrock_kb.arn]
    }
  ])
}

# ------------------------------------------------------------------------------
# IAM Role for Bedrock Knowledge Base
# ------------------------------------------------------------------------------
resource "aws_iam_role" "bedrock_kb" {
  name = "${var.project}-${var.environment}-bedrock-kb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-bedrock-kb-role"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "bedrock_kb_s3" {
  name = "${var.project}-${var.environment}-bedrock-kb-s3"
  role = aws_iam_role.bedrock_kb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
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

resource "aws_iam_role_policy" "bedrock_kb_opensearch" {
  name = "${var.project}-${var.environment}-bedrock-kb-opensearch"
  role = aws_iam_role.bedrock_kb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "aoss:APIAccessAll"
        ]
        Resource = aws_opensearchserverless_collection.industry_patterns.arn
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Bedrock Knowledge Base
# ------------------------------------------------------------------------------
resource "aws_bedrockagent_knowledge_base" "industry_patterns" {
  name        = "${var.project}-${var.environment}-industry-kb"
  description = "Industry decision patterns for Context Intelligence Platform"
  role_arn    = aws_iam_role.bedrock_kb.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/amazon.titan-embed-text-v1"
    }
  }

  storage_configuration {
    type = "OPENSEARCH_SERVERLESS"
    opensearch_serverless_configuration {
      collection_arn    = aws_opensearchserverless_collection.industry_patterns.arn
      vector_index_name = "industry-patterns"
      field_mapping {
        vector_field   = "embedding"
        text_field     = "text"
        metadata_field = "metadata"
      }
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-industry-kb"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Bedrock Data Source (S3 Gold Layer)
# ------------------------------------------------------------------------------
resource "aws_bedrockagent_data_source" "gold_patterns" {
  knowledge_base_id = aws_bedrockagent_knowledge_base.industry_patterns.id
  name              = "gold-layer-patterns"
  description       = "Industry patterns from Gold layer S3 bucket"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn = var.gold_bucket_arn
      inclusion_prefixes = [
        "fact_industry_patterns/"
      ]
    }
  }

  server_side_encryption_configuration {
    kms_key_id = var.kms_key_id
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens = 512
        overlap_percentage = 20
      }
    }
  }
}
