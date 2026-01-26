# PlainLedger Infrastructure

Enterprise-grade AWS infrastructure using Terraform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PlainLedger Infrastructure                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐    │
│  │   Route53   │────▶│              Application Load Balancer           │    │
│  │ plainledger │     │         (HTTP/HTTPS with ACM Certificate)        │    │
│  │    .ca      │     └─────────────────────────────────────────────────┘    │
│  └─────────────┘                          │                                  │
│                                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         ECS Fargate Cluster                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │  Web App    │  │  NestJS API │  │  Keycloak   │                  │    │
│  │  │  (React)    │  │  (Node.js)  │  │  (Auth)     │                  │    │
│  │  │  Port 80    │  │  Port 3000  │  │  Port 8080  │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                           │                                  │
│                    ┌──────────────────────┼──────────────────────┐          │
│                    ▼                      ▼                      ▼          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   RDS PostgreSQL    │  │   ElastiCache Redis │  │   S3 Data Lake      │  │
│  │   (Multi-AZ, KMS)   │  │   (Encrypted, Auth) │  │   (Bronze/Silver/   │  │
│  │                     │  │                     │  │    Gold layers)     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | Purpose | Estimated Cost |
|-------------|---------|----------------|
| **prod** | Production workloads | ~$200-400/month |
| **dev** | Development/testing | ~$50-80/month |

## Modules

| Module | Description |
|--------|-------------|
| `networking` | VPC, subnets, NAT, security groups, VPC endpoints |
| `database` | RDS PostgreSQL, ElastiCache Redis, Secrets Manager |
| `datalake` | S3 buckets for Bronze/Silver/Gold data layers |
| `ecs` | ECS Fargate cluster, ALB, auto-scaling |
| `cicd` | GitHub OIDC, IAM roles for CI/CD |

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **S3 bucket** for Terraform state: `plainledger-terraform-state`
4. **DynamoDB table** for state locking: `plainledger-terraform-lock`

## Usage

### Deploy Production

```bash
cd environments/prod

# Create terraform.tfvars
cat > terraform.tfvars << EOF
project     = "plainledger"
environment = "prod"
github_org  = "stonyp90"
github_repo = "plainledger"
EOF

# Initialize and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Deploy Development (optional)

```bash
cd environments/dev

# Create terraform.tfvars
cat > terraform.tfvars << EOF
project     = "plainledger"
environment = "dev"
github_org  = "stonyp90"
github_repo = "plainledger"
EOF

# Initialize and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Production Configuration

### Database
- **RDS PostgreSQL 16**: db.t3.medium, Multi-AZ, encrypted
- **ElastiCache Redis 7**: cache.t3.micro, 2 nodes, encrypted

### Compute
- **ECS Fargate**: Auto-scaling (2-10 instances)
- **ALB**: Application Load Balancer with TLS 1.3

### Security
- **KMS**: Customer-managed encryption keys
- **Secrets Manager**: Database credentials, Redis auth
- **VPC Endpoints**: Private access to AWS services
- **WAF**: Web Application Firewall (optional)

## DNS Configuration

After deployment, update your domain registrar with the Route53 nameservers:

```bash
terraform output route53_name_servers
```

## Outputs

| Output | Description |
|--------|-------------|
| `app_url` | Application URL |
| `alb_dns_name` | Load balancer DNS |
| `route53_name_servers` | NS records for domain |
| `github_actions_role_arn` | IAM role for CI/CD |
| `ecs_cluster_name` | ECS cluster name |
