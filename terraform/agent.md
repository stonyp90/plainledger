# Terraform Agent Guide

This is a specialized agent guide for PlainLedger infrastructure (Terraform). For general project guidance, see the [main agent.md](../agent.md).

## 🤖 Using Skills and Sub-Agents

**ALWAYS** check for available skills and use sub-agents when appropriate:

- Use skills for infrastructure tasks (AWS, Terraform patterns)
- Reference this file for infrastructure-specific patterns
- Delegate to module-specific knowledge when working on complex infrastructure
- Update this file when discovering better patterns

## Quick Reference

- **Main Agent Guide:** [`../agent.md`](../agent.md)
- **Infrastructure:** AWS (Canada Central)
- **IaC Tool:** Terraform
- **State:** S3 backend with DynamoDB locking
- **Environments:** `dev`, `prod`
- **Documentation:** [`README.md`](README.md) - Detailed infrastructure docs

**Token Optimization:** Read `README.md` for detailed documentation, use this `agent.md` for patterns only.

## Module Structure

```
terraform/
├── modules/
│   ├── datalake/     # S3 Bronze/Silver/Gold, Glue, Athena
│   ├── ecs/          # Container orchestration
│   ├── database/     # RDS PostgreSQL
│   ├── networking/   # VPC, subnets, security groups
│   ├── analytics/    # Athena, Power BI integration
│   └── cicd/         # Deployment pipeline
└── environments/
    ├── dev/          # Development environment
    └── prod/         # Production environment
```

## Terraform Patterns

### Module Pattern

**Module Structure:**

```
modules/your-module/
├── main.tf          # Main resources
├── variables.tf      # Input variables
├── outputs.tf       # Output values
└── README.md        # Module documentation
```

**Module Usage:**

```hcl
module "your_module" {
  source = "../modules/your-module"

  project     = var.project
  environment = var.environment
  # ... other variables
}
```

### Variable Pattern

```hcl
variable "project" {
  description = "Project name"
  type        = string
  default     = "plainledger"
}

variable "environment" {
  description = "Environment (dev, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be dev or prod"
  }
}
```

### Output Pattern

```hcl
output "resource_arn" {
  description = "ARN of the created resource"
  value       = aws_resource.example.arn
}
```

### Tagging Pattern

**ALWAYS tag resources:**

```hcl
tags = {
  Name        = "${var.project}-${var.environment}-resource-name"
  Project     = var.project
  Environment = var.environment
  ManagedBy   = "terraform"
}
```

### Security Patterns

**Encryption:**

- Always enable encryption at rest
- Use KMS keys for sensitive data
- Enable encryption in transit (TLS)

**Access Control:**

- Use least privilege IAM policies
- Enable VPC endpoints for AWS services
- Use security groups restrictively

**Example:**

```hcl
resource "aws_s3_bucket" "example" {
  bucket = "${var.project}-${var.environment}-example"

  encryption {
    sse_algorithm = "aws:kms"
    kms_key_id    = aws_kms_key.example.arn
  }
}
```

## Common Tasks

### Adding a New Module

1. **Create module directory** in `modules/`
2. **Define variables** in `variables.tf`
3. **Create resources** in `main.tf`
4. **Define outputs** in `outputs.tf`
5. **Add documentation** in `README.md`
6. **Use module** in environment `main.tf`

### Adding a New Environment

1. **Create environment directory** in `environments/`
2. **Copy from existing environment** (dev or prod)
3. **Update variables** in `variables.tf`
4. **Create `terraform.tfvars`** with environment-specific values
5. **Update state backend** configuration

### State Management (CRITICAL)

**⚠️ ALL state MUST be stored in S3. NEVER use local state.**

**Backend Configuration (REQUIRED for every environment):**

```hcl
terraform {
  backend "s3" {
    bucket         = "plainledger-terraform-state"
    key            = "prod/terraform.tfstate"  # Use environment name: prod/, dev/
    region         = "ca-central-1"
    encrypt        = true
    dynamodb_table = "plainledger-terraform-lock"
  }
}
```

**State Resources:**
| Resource | Value | Purpose |
|----------|-------|---------|
| S3 Bucket | `plainledger-terraform-state` | State storage |
| DynamoDB Table | `plainledger-terraform-lock` | State locking |
| Region | `ca-central-1` | Canada (Montreal) |

**State Commands:**

```bash
# Initialize backend (ALWAYS run first)
cd terraform/environments/prod
terraform init

# Plan changes (review before apply)
terraform plan -out=tfplan

# Apply changes (use saved plan)
terraform apply tfplan

# List resources in state
terraform state list

# Show specific resource
terraform state show aws_ecs_service.web

# Get outputs
terraform output
terraform output -json
```

**NEVER:**

- ❌ Use local state files
- ❌ Commit `terraform.tfstate` to git
- ❌ Run without `terraform init`
- ❌ Skip the plan step

**ALWAYS:**

- ✅ Use S3 backend
- ✅ Enable encryption
- ✅ Use DynamoDB locking
- ✅ Plan before apply

## Module-Specific Patterns

### Data Lake Module

**Patterns:**

- Bronze (raw), Silver (cleansed), Gold (curated) layers
- Glue for schema discovery
- Athena for querying
- Lake Formation for access control

**Reference:** [`modules/datalake/main.tf`](modules/datalake/main.tf)

### ECS Module

**Patterns:**

- Fargate tasks (no EC2 management)
- Application Load Balancer
- Auto-scaling based on CPU/memory
- CloudWatch logging

**Reference:** [`modules/ecs/main.tf`](modules/ecs/main.tf)

### Database Module

**Patterns:**

- Multi-AZ for production
- Automated backups
- Read replicas for scaling
- Performance Insights enabled

**Reference:** [`modules/database/main.tf`](modules/database/main.tf)

## Best Practices

### 1. Version Control

- **ALWAYS** commit Terraform files
- Use `.tfvars.example` for sensitive variables
- Document changes in commit messages

### 2. State Management

- **NEVER** commit state files
- Use remote state (S3 + DynamoDB)
- Enable state locking

### 3. Security

- Use least privilege IAM policies
- Enable encryption everywhere
- Use secrets manager for sensitive data

### 4. Cost Optimization

- Use appropriate instance sizes
- Enable auto-scaling
- Use spot instances where possible (dev only)

### 5. Documentation

- Document all modules
- Include examples in README
- Document variable descriptions

## Infrastructure Deployment Workflow

### Manual Apply (Local)

For infrastructure changes that require manual review:

```bash
# 1. Set AWS credentials (SSO or env vars)
aws sso login --profile plainledger-prod

# 2. Navigate to environment
cd terraform/environments/prod

# 3. Initialize (downloads providers, connects to S3)
terraform init

# 4. Plan and review
terraform plan -out=tfplan

# 5. Apply after review
terraform apply tfplan

# 6. Verify outputs
terraform output
```

### Getting Outputs

```bash
# All outputs
terraform output

# Specific output
terraform output github_actions_role_arn
terraform output storybook_url

# JSON format (for scripting)
terraform output -json | jq '.alb_dns_name.value'
```

### Key Outputs

| Output                    | Description                                   |
| ------------------------- | --------------------------------------------- |
| `app_url`                 | Main application URL (https://plainledger.ca) |
| `alb_dns_name`            | ALB DNS for CNAME records                     |
| `github_actions_role_arn` | IAM role for CI/CD                            |
| `storybook_url`           | Storybook URL                                 |
| `storybook_cloudfront_id` | CloudFront distribution ID                    |
| `route53_name_servers`    | NS records for domain                         |

## Self-Improvement

**Update this file when:**

- Discovering better Terraform patterns
- Fixing recurring infrastructure issues
- Adding new modules or patterns
- Improving security or cost optimization

**Pattern to Follow:**

1. Implement infrastructure change
2. Document pattern if reusable
3. Update this agent.md
4. Share learnings with main agent.md if applicable

---

**Last Updated:** February 2026  
**Related:** [`../agent.md`](../agent.md)
