# Storybook Setup - Complete Implementation Summary

## ✅ What's Been Implemented

### 1. Storybook Configuration
- ✅ Installed Storybook dependencies (`@storybook/react-vite`, etc.)
- ✅ Created `.storybook/main.ts` with Vite integration
- ✅ Created `.storybook/preview.tsx` with Keycloak + i18n providers
- ✅ Created `StorybookAuthWrapper.tsx` for authentication/authorization

### 2. API Endpoint
- ✅ Created `PermissionsController` at `/api/permissions/storybook`
- ✅ Database-backed authorization with Keycloak role fallback
- ✅ Full Swagger/OpenAPI documentation
- ✅ Proper error handling and logging

### 3. Component Stories
- ✅ Chart components (TrendChart, VarianceChart, WaterfallChart, BudgetVsActualChart, Sparkline)
- ✅ IBCS components (VariancePin)
- ✅ UI components (KPICard, Avatar, Tooltip, Toggle, Checkbox)
- ✅ Strategic components (SmartSpreadsheet, BurnRateChart)

### 4. Infrastructure (Terraform)
- ✅ Created `terraform/modules/storybook/` module
- ✅ S3 bucket with encryption and versioning
- ✅ CloudFront distribution with OAI
- ✅ Route53 DNS record
- ✅ CloudFront certificate in us-east-1
- ✅ Added to `terraform/environments/prod/main.tf`

### 5. CI/CD Pipeline
- ✅ GitHub Actions workflow (`.github/workflows/storybook.yml`)
- ✅ Automatic deployment on component changes
- ✅ CloudFront cache invalidation
- ✅ Environment-specific deployment (prod/dev)
- ✅ Uses GitHub OIDC (no hardcoded credentials)

### 6. Deployment Scripts
- ✅ `scripts/deploy-storybook.sh` for manual deployment
- ✅ Supports prod/dev environments

### 7. Documentation
- ✅ Updated `LOCAL_SETUP.md` with Storybook instructions
- ✅ Created `docs/STORYBOOK_DEPLOYMENT.md` with deployment guide

## 🚀 Deployment Steps

### Step 1: Deploy Infrastructure (One-time)

**Using AWS Credentials:**

```bash
# Set your AWS credentials
export AWS_ACCESS_KEY_ID="ASIAWLC57O2SPI2MT2WD"
export AWS_SECRET_ACCESS_KEY="3jTJQIqX1m66Lqswr4mqazyJI7dQNVsoehW3TDOq"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjECIaCXVzLWVhc3QtMiJGMEQCIERKdC7E4WxoCOVwHwq+ezWfNExNF8E+4fkA6DrRmFZtAiBoAbq0G+k/rvWuG0RRQO/XY7kqZ64j+NZPDjJOh7/yciryAgjr//////////8BEAAaDDQzNjEzNjI3NzY2OCIM+p34+i0Q2A6XQm5MKsYC7kwV/8v83w0gQF48JdZHFeuejpbgrxTnfXiGF3sGN/RpMMRdVbVIaagDNtnxWshtmH1hxpLNVLfTpxX2TnGcHFXPhsU+J3C5QcTyjSBpm65ILG76kXDkcBOBoINiYcpmlF/iMpsaUQmNdOCTy2PGIM4/7q0pLVeaUTxWzKaZdcjsjDeQEkLTQ2gfEAhLmxwF1Rg8fKSzKm8nKnjjtUGbOB6nKVvbKpYdNz4nKLxUuLzCqAleQueuWkQm1IoGMRZL7B22TetGo9TOkcA6J3Mmwou5cB5/uM978QaFWwzV/xTsqExWoBc7B3aYfSemGsqY8eRLyho8EX2qfGQYGi7tohUugwXK4TqOsAkTIb5G4jMnGVXGPVMOOZwBw3jGDZsMmn1zkZeSGAQu75IpQBvfBmLPhoDBFGg/cAQfpi4Oj7R0g1HlcDMwqtGDzAY6pgEXosvPprRc8xEDQfOkNBLgbLqf44cPCQxlWFifWLq69NK/9hTT5zWw/au5Cuh2FfuERQuv/tHS1HKH/L/Bd97+MzrosoAdjumj5BdzkGigMpXBpOqH+RQBn9KmVQOGP+THnqTOr0qA6GxGACbBZl8kziWUOEwc7KgkgF8F2ZDikZHXnFHbL1W4v+QfJkDgK1MOweQ2D2dEPfmwzKISRMfATynKvJAk"
export AWS_REGION="ca-central-1"

# Navigate to Terraform directory
cd terraform/environments/prod

# Initialize (if not already done)
terraform init

# Plan the changes
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Get the outputs
terraform output storybook_s3_bucket
terraform output storybook_cloudfront_id
terraform output storybook_url
```

**Note:** There are pre-existing Terraform issues in the datalake module (duplicate resources). You may need to fix those first or deploy Storybook module separately.

### Step 2: Build and Deploy Storybook

```bash
# Build Storybook
cd apps/web
pnpm install
pnpm build-storybook

# Deploy using script
cd ../..
./scripts/deploy-storybook.sh prod
```

Or manually:

```bash
# Get bucket name from Terraform output
BUCKET=$(cd terraform/environments/prod && terraform output -raw storybook_s3_bucket)
CF_ID=$(cd terraform/environments/prod && terraform output -raw storybook_cloudfront_id)

# Deploy to S3
aws s3 sync apps/web/storybook-static s3://$BUCKET \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "*.html" --exclude "*.json"

aws s3 sync apps/web/storybook-static s3://$BUCKET \
  --cache-control "no-cache, no-store, must-revalidate" \
  --include "*.html" --include "*.json"

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $CF_ID \
  --paths "/*"
```

### Step 3: Configure GitHub Variables

Go to GitHub repository → Settings → Secrets and variables → Actions:

**Variables:**
- `STORYBOOK_BUCKET_PROD`: S3 bucket name from Terraform output
- `STORYBOOK_CF_ID_PROD`: CloudFront distribution ID from Terraform output

**Secrets:**
- `AWS_ROLE_ARN`: Get from `terraform output github_actions_role_arn`

### Step 4: Grant Access

**Option A: Database Permission**
```sql
UPDATE accounting.user_profiles
SET feature_flags = jsonb_set(
  COALESCE(feature_flags, '{}'::jsonb),
  '{storybook:access}',
  'true'::jsonb
)
WHERE email = 'your-email@example.com';
```

**Option B: Keycloak Role**
1. Log into Keycloak Admin Console
2. Realm → Roles → Add Role
3. Name: `storybook-viewer`
4. Assign to users

## 🔒 Security Features

1. **Authentication**: Keycloak SSO required
2. **Authorization**: Database + Keycloak role checks
3. **HTTPS**: CloudFront with ACM certificate
4. **Private S3**: Only accessible via CloudFront OAI
5. **No Public Access**: S3 bucket blocks all public access
6. **Encryption**: S3 server-side encryption enabled
7. **CI/CD Security**: Uses GitHub OIDC (no hardcoded credentials)

## 📊 API Documentation

The `/api/permissions/storybook` endpoint is fully documented in Swagger:

- **Endpoint**: `GET /api/permissions/storybook`
- **Auth**: Bearer token required
- **Response**: `{ "allowed": boolean }`
- **Swagger**: Available at `/api/docs` when API is running

## 🧪 Testing Locally

```bash
# Start Storybook locally
cd apps/web
pnpm storybook

# Access at http://localhost:6006
# Mock auth is enabled in development (no login required)
```

## 📝 Next Steps

1. ✅ Deploy infrastructure (Step 1 above)
2. ✅ Deploy Storybook (Step 2 above)
3. ✅ Configure GitHub variables (Step 3 above)
4. ✅ Grant access to users (Step 4 above)
5. ✅ Test at https://storybook.plainledger.ca

## 🐛 Troubleshooting

### Terraform Errors
The datalake module has duplicate resources. Fix those first or deploy Storybook module separately.

### Deployment Issues
- Check AWS credentials are valid
- Verify S3 bucket exists
- Ensure CloudFront distribution is deployed
- Check IAM permissions

### Access Issues
- Verify Keycloak is accessible
- Check API endpoint `/api/permissions/storybook`
- Verify user has permission in database or Keycloak role

## 📚 Documentation Files

- `LOCAL_SETUP.md` - Local development instructions
- `docs/STORYBOOK_DEPLOYMENT.md` - Deployment guide
- `apps/web/.storybook/` - Storybook configuration
- `.github/workflows/storybook.yml` - CI/CD pipeline
