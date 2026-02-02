# 🚀 Deploy Storybook Now - Quick Start Guide

## Prerequisites Check

- ✅ Storybook code is ready
- ✅ Terraform module created
- ✅ CI/CD pipeline configured
- ✅ API endpoint implemented
- ✅ Swagger documentation added

## Quick Deployment (Using Your AWS Credentials)

### 1. Set AWS Credentials

```bash
export AWS_ACCESS_KEY_ID="ASIAWLC57O2SPI2MT2WD"
export AWS_SECRET_ACCESS_KEY="3jTJQIqX1m66Lqswr4mqazyJI7dQNVsoehW3TDOq"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjECIaCXVzLWVhc3QtMiJGMEQCIERKdC7E4WxoCOVwHwq+ezWfNExNF8E+4fkA6DrRmFZtAiBoAbq0G+k/rvWuG0RRQO/XY7kqZ64j+NZPDjJOh7/yciryAgjr//////////8BEAAaDDQzNjEzNjI3NzY2OCIM+p34+i0Q2A6XQm5MKsYC7kwV/8v83w0gQF48JdZHFeuejpbgrxTnfXiGF3sGN/RpMMRdVbVIaagDNtnxWshtmH1hxpLNVLfTpxX2TnGcHFXPhsU+J3C5QcTyjSBpm65ILG76kXDkcBOBoINiYcpmlF/iMpsaUQmNdOCTy2PGIM4/7q0pLVeaUTxWzKaZdcjsjDeQEkLTQ2gfEAhLmxwF1Rg8fKSzKm8nKnjjtUGbOB6nKVvbKpYdNz4nKLxUuLzCqAleQueuWkQm1IoGMRZL7B22TetGo9TOkcA6J3Mmwou5cB5/uM978QaFWwzV/xTsqExWoBc7B3aYfSemGsqY8eRLyho8EX2qfGQYGi7tohUugwXK4TqOsAkTIb5G4jMnGVXGPVMOOZwBw3jGDZsMmn1zkZeSGAQu75IpQBvfBmLPhoDBFGg/cAQfpi4Oj7R0g1HlcDMwqtGDzAY6pgEXosvPprRc8xEDQfOkNBLgbLqf44cPCQxlWFifWLq69NK/9hTT5zWw/au5Cuh2FfuERQuv/tHS1HKH/L/Bd97+MzrosoAdjumj5BdzkGigMpXBpOqH+RQBn9KmVQOGP+THnqTOr0qA6GxGACbBZl8kziWUOEwc7KgkgF8F2ZDikZHXnFHbL1W4v+QfJkDgK1MOweQ2D2dEPfmwzKISRMfATynKvJAk"
export AWS_REGION="ca-central-1"
```

### 2. Deploy Infrastructure (Terraform)

**Note:** There are pre-existing Terraform issues in the datalake module. You can either:
- Fix the duplicate resources first, OR
- Deploy Storybook module separately

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Plan (review changes)
terraform plan -target=module.storybook

# Apply Storybook module only
terraform apply -target=module.storybook

# Get outputs
terraform output storybook_s3_bucket
terraform output storybook_cloudfront_id
```

### 3. Build Storybook

```bash
# Install dependencies (if not done)
cd apps/web
npm install  # or pnpm install if pnpm is available

# Build Storybook
npm run build-storybook  # or pnpm build-storybook
```

### 4. Deploy to S3

```bash
# Get bucket name from Terraform
BUCKET=$(cd ../../terraform/environments/prod && terraform output -raw storybook_s3_bucket)
CF_ID=$(cd ../../terraform/environments/prod && terraform output -raw storybook_cloudfront_id)

# Deploy static assets
aws s3 sync storybook-static s3://$BUCKET \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "*.html" \
  --exclude "*.json" \
  --region ca-central-1

# Deploy HTML/JSON (no-cache for auth)
aws s3 sync storybook-static s3://$BUCKET \
  --cache-control "no-cache, no-store, must-revalidate" \
  --include "*.html" \
  --include "*.json" \
  --region ca-central-1

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $CF_ID \
  --paths "/*" \
  --region ca-central-1
```

### 5. Configure GitHub Variables

Go to: https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions

**Add Variables:**
- `STORYBOOK_BUCKET_PROD` = (value from `terraform output storybook_s3_bucket`)
- `STORYBOOK_CF_ID_PROD` = (value from `terraform output storybook_cloudfront_id`)

**Add Secret:**
- `AWS_ROLE_ARN` = (value from `terraform output github_actions_role_arn`)

### 6. Grant Access to Users

**Via Database:**
```sql
UPDATE accounting.user_profiles
SET feature_flags = jsonb_set(
  COALESCE(feature_flags, '{}'::jsonb),
  '{storybook:access}',
  'true'::jsonb
)
WHERE email = 'your-email@example.com';
```

**Via Keycloak:**
1. Log into Keycloak Admin Console
2. Realm → Roles → Add Role → Name: `storybook-viewer`
3. Assign role to users

## ✅ Verification

1. **Check S3**: `aws s3 ls s3://plainledger-prod-storybook/`
2. **Check CloudFront**: `aws cloudfront get-distribution --id <CF_ID>`
3. **Test URL**: https://storybook.plainledger.ca
4. **Check API**: `curl https://api.plainledger.ca/api/permissions/storybook` (with auth token)

## 🔒 Security Checklist

- ✅ S3 bucket blocks public access
- ✅ CloudFront OAI restricts S3 access
- ✅ HTTPS enforced via CloudFront
- ✅ Keycloak authentication required
- ✅ Database authorization check
- ✅ CI/CD uses GitHub OIDC (no hardcoded creds)
- ✅ Swagger docs include auth requirements

## 📊 API Documentation

The permissions endpoint is documented in Swagger:

- **URL**: `GET /api/permissions/storybook`
- **Auth**: Bearer token (Keycloak JWT)
- **Response**: `{ "allowed": boolean }`
- **Swagger UI**: Available at `/api/docs` when API is running

## 🎯 What's Ready

1. ✅ Storybook configuration and stories
2. ✅ Authentication wrapper (Keycloak)
3. ✅ Authorization endpoint (database + roles)
4. ✅ Terraform infrastructure module
5. ✅ CI/CD pipeline (GitHub Actions)
6. ✅ Deployment scripts
7. ✅ Swagger/OpenAPI documentation
8. ✅ Security best practices

## 🚨 Important Notes

1. **AWS Credentials**: The credentials you provided are temporary (session token). They will expire. For production, use:
   - GitHub OIDC (already configured in CI/CD)
   - IAM roles for EC2/ECS
   - AWS SSO for manual deployments

2. **Terraform Issues**: The datalake module has duplicate resources. Fix those or deploy Storybook separately.

3. **Certificate**: CloudFront certificate must be in us-east-1. Already configured in Terraform.

4. **DNS**: Route53 record will be created automatically. DNS propagation may take a few minutes.

## 📚 Documentation

- `docs/STORYBOOK_DEPLOYMENT.md` - Full deployment guide
- `docs/STORYBOOK_SETUP_COMPLETE.md` - Implementation summary
- `LOCAL_SETUP.md` - Local development guide

## 🎉 Success!

Once deployed, Storybook will be available at:
**https://storybook.plainledger.ca**

Protected by Keycloak authentication and database authorization!
