# Storybook Deployment Guide

## Overview

Storybook is deployed as a static site on S3 with CloudFront CDN, secured by Keycloak authentication and database authorization.

## Architecture

```
GitHub Actions → Build Storybook → S3 Bucket → CloudFront → storybook.plainledger.ca
                                                              ↓
                                                         Keycloak Auth
                                                              ↓
                                                         Database Permission Check
```

## Prerequisites

1. Terraform infrastructure deployed
2. GitHub repository variables configured
3. AWS credentials with appropriate permissions

## Initial Infrastructure Deployment

### Option 1: Using Terraform (Recommended)

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply infrastructure
terraform apply

# Get outputs
terraform output storybook_s3_bucket
terraform output storybook_cloudfront_id
terraform output storybook_url
```

### Option 2: Manual Deployment Script

```bash
# Set AWS credentials (temporary session)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_SESSION_TOKEN="your-session-token"  # If using temporary credentials

# Deploy infrastructure and Storybook
./scripts/deploy-storybook.sh prod
```

## GitHub Variables Setup

Configure these variables in GitHub repository settings:

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Description | Example |
|----------|-------------|---------|
| `STORYBOOK_BUCKET_PROD` | S3 bucket name (prod) | `plainledger-prod-storybook` |
| `STORYBOOK_CF_ID_PROD` | CloudFront distribution ID (prod) | `E1234567890ABC` |
| `STORYBOOK_BUCKET_DEV` | S3 bucket name (dev) | `plainledger-dev-storybook` |
| `STORYBOOK_CF_ID_DEV` | CloudFront distribution ID (dev) | `E0987654321XYZ` |

### Repository Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC | `arn:aws:iam::123456789012:role/github-actions` |

Get the role ARN from Terraform:
```bash
terraform output github_actions_role_arn
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/storybook.yml`) automatically:

1. **Triggers on:**
   - Push to `main` branch when components change
   - Manual workflow dispatch

2. **Builds Storybook** with production environment variables

3. **Deploys to S3** with proper cache headers:
   - Static assets: `max-age=3600`
   - HTML/JSON: `no-cache` (for auth)

4. **Invalidates CloudFront** cache

## Manual Deployment

### Using Deployment Script

```bash
# Production
./scripts/deploy-storybook.sh prod

# Development
./scripts/deploy-storybook.sh dev
```

### Using AWS CLI Directly

```bash
# Build Storybook
cd apps/web
pnpm build-storybook

# Deploy to S3
aws s3 sync storybook-static s3://plainledger-prod-storybook \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "*.html" \
  --exclude "*.json"

# HTML/JSON with no-cache
aws s3 sync storybook-static s3://plainledger-prod-storybook \
  --cache-control "no-cache, no-store, must-revalidate" \
  --include "*.html" \
  --include "*.json"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Security

### Authentication Flow

1. User visits `storybook.plainledger.ca`
2. CloudFront serves static Storybook from S3
3. Storybook checks Keycloak authentication
4. If authenticated, calls `/api/permissions/storybook`
5. API checks:
   - Database: `featureFlags.storybook:access = true`
   - Keycloak roles: `storybook-viewer`, `plainledger-staff`, `admin`
6. Access granted/denied based on check

### Access Control

**Grant access via database:**
```sql
UPDATE accounting.user_profiles
SET feature_flags = jsonb_set(
  COALESCE(feature_flags, '{}'::jsonb),
  '{storybook:access}',
  'true'::jsonb
)
WHERE id = 'user-keycloak-id';
```

**Grant access via Keycloak:**
1. Log into Keycloak Admin Console
2. Realm → Roles → Add Role
3. Name: `storybook-viewer`
4. Assign to users

### IAM Permissions

The GitHub Actions role needs:
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` on Storybook bucket
- `cloudfront:CreateInvalidation`, `cloudfront:GetInvalidation` on CloudFront distribution

## Monitoring

### CloudWatch Metrics

- CloudFront: Requests, 4xx/5xx errors, cache hit ratio
- S3: Request metrics, storage metrics

### Logs

- CloudFront access logs (if enabled)
- API logs: `/api/permissions/storybook` endpoint

## Troubleshooting

### Storybook not accessible

1. Check CloudFront distribution status: `aws cloudfront get-distribution --id <ID>`
2. Verify DNS: `dig storybook.plainledger.ca`
3. Check S3 bucket: `aws s3 ls s3://plainledger-prod-storybook/`
4. Verify certificate: Check ACM certificate validation

### Authentication issues

1. Check Keycloak is accessible: `curl https://auth.plainledger.ca/health`
2. Verify API endpoint: `curl https://api.plainledger.ca/api/permissions/storybook`
3. Check user permissions in database

### Deployment failures

1. Check GitHub Actions logs
2. Verify AWS credentials/permissions
3. Ensure Terraform outputs are correct
4. Check S3 bucket exists and is accessible

## Rollback

```bash
# Restore previous version from S3 versioning
aws s3api list-object-versions \
  --bucket plainledger-prod-storybook \
  --prefix index.html

# Restore specific version
aws s3api restore-object \
  --bucket plainledger-prod-storybook \
  --key index.html \
  --version-id <VERSION_ID>

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <CF_ID> \
  --paths "/*"
```

## Cost Optimization

- CloudFront caching reduces S3 requests
- S3 versioning can be disabled after testing
- Consider S3 lifecycle policies for old versions
- Monitor CloudFront data transfer costs
