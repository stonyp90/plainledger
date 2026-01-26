# PlainLedger - Infrastructure Terraform

## Prérequis

- Terraform >= 1.5.0
- AWS CLI configuré
- Domaine plainledger.ca enregistré

## Structure

```
terraform/
├── environments/
│   └── prod/           # Configuration production
├── modules/
│   ├── networking/     # VPC, subnets, security groups
│   ├── database/       # RDS PostgreSQL, ElastiCache Redis
│   ├── ecs/           # ECS Fargate, ALB, Auto Scaling
│   ├── datalake/      # S3 Bronze/Silver/Gold, Glue, Athena
│   └── cicd/          # ECR, GitHub OIDC
└── README.md
```

## Déploiement Initial

### 1. Créer le bucket S3 pour le state (une seule fois)

```bash
aws s3 mb s3://plainledger-terraform-state --region ca-central-1
aws s3api put-bucket-versioning --bucket plainledger-terraform-state --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name plainledger-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ca-central-1
```

### 2. Initialiser et appliquer

```bash
cd terraform/environments/prod

# Initialiser
terraform init

# Voir le plan
terraform plan

# Appliquer
terraform apply
```

## Après le déploiement

### Configurer les NS chez le registrar

Après `terraform apply`, récupérez les name servers:

```bash
terraform output route53_name_servers
```

Configurez ces NS chez votre registrar de domaine (ex: GoDaddy, Namecheap).

### Pousser les images Docker

```bash
# Login ECR
aws ecr get-login-password --region ca-central-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_web_repository | cut -d'/' -f1)

# Build et push
docker build -t $(terraform output -raw ecr_web_repository):latest ./apps/web
docker push $(terraform output -raw ecr_web_repository):latest
```

## Coûts Estimés

| Service | Coût mensuel |
|---------|--------------|
| ECS Fargate | ~$150 |
| RDS PostgreSQL | ~$100 |
| ElastiCache | ~$25 |
| ALB + NAT | ~$50 |
| S3 + Glue | ~$20 |
| **Total** | **~$350** |

## Destroy

```bash
terraform destroy
```

⚠️ Cela supprimera TOUTES les ressources, y compris les données.
