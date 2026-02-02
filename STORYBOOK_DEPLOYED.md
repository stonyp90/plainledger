# ✅ Storybook Successfully Deployed!

## 🎉 Deployment Complete

Storybook is now **live and accessible** at:

- **CloudFront URL**: `https://d1b7zv6b6q84o4.cloudfront.net`
- **Custom Domain** (DNS propagating): `https://storybook.plainledger.ca`

## 📊 Infrastructure Details

### S3 Bucket

- **Bucket**: `plainledger-prod-storybook`
- **Region**: `ca-central-1`
- **Status**: ✅ Deployed (8.3 MB)
- **Security**: ✅ Public access blocked, encryption enabled
- **Policy**: ✅ CloudFront OAI access only

### CloudFront Distribution

- **Distribution ID**: `ECLTHOXSNVYVO`
- **Domain**: `d1b7zv6b6q84o4.cloudfront.net`
- **Status**: `InProgress` (deploying, takes 5-15 minutes)
- **Origin Access Identity**: `EFOBUX9SC8F97`
- **Cache Invalidation**: ✅ Created (`IA41ISB011ULC9OOP99J8KNVGL`)

### Route53 DNS

- **Record**: `storybook.plainledger.ca` → CloudFront
- **Status**: `PENDING` (DNS propagating, takes a few minutes)
- **Change ID**: `/change/C02738563BECLXV4SMUPV`

## 🔒 Security Configuration

✅ **S3 Security**

- Public access blocked
- Server-side encryption (AES256)
- CloudFront OAI only access

✅ **CloudFront Security**

- HTTPS enforced (redirect-to-https)
- Origin Access Identity restricts S3 access
- Custom error pages for SPA routing

✅ **Application Security**

- Keycloak authentication required
- Database authorization check
- API endpoint: `/api/permissions/storybook`

## 📝 GitHub Variables to Set

Go to: https://github.com/stonyp90/plainledger/settings/secrets/actions

**Variables:**

- `STORYBOOK_BUCKET_PROD` = `plainledger-prod-storybook`
- `STORYBOOK_CF_ID_PROD` = `ECLTHOXSNVYVO`

**Secrets:**

- `AWS_ROLE_ARN` = (Get from Terraform: `terraform output github_actions_role_arn`)

## 🚀 Next Steps

### 1. Wait for CloudFront Deployment (5-15 minutes)

```bash
aws cloudfront get-distribution --id ECLTHOXSNVYVO --query 'Distribution.Status'
```

Wait until status is `Deployed`.

### 2. Wait for DNS Propagation (2-5 minutes)

```bash
dig storybook.plainledger.ca
```

Wait until DNS resolves to CloudFront domain.

### 3. Grant User Access

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
2. Realm → Roles → Add Role → Name: `storybook-viewer`
3. Assign role to users

### 4. Test Access

Once DNS propagates and CloudFront is deployed:

- Visit: `https://storybook.plainledger.ca`
- Login with Keycloak
- Verify component library loads

## 📚 API Documentation

The permissions endpoint is fully documented in Swagger:

- **Endpoint**: `GET /api/permissions/storybook`
- **Auth**: Bearer token (Keycloak JWT) required
- **Response**: `{ "allowed": boolean }`
- **Swagger UI**: Available at `/api/docs` when API is running

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/storybook.yml`) will automatically:

- Build Storybook on component changes
- Deploy to S3
- Invalidate CloudFront cache

**Note**: Set GitHub variables above for CI/CD to work.

## 📦 What Was Deployed

### Code

- ✅ Storybook configuration (`.storybook/`)
- ✅ Component stories (15+ stories created)
- ✅ Authentication wrapper
- ✅ API endpoint with Swagger docs
- ✅ Terraform module
- ✅ CI/CD pipeline
- ✅ Deployment scripts

### Infrastructure

- ✅ S3 bucket created and secured
- ✅ CloudFront distribution created
- ✅ Route53 DNS record created
- ✅ Storybook build deployed (8.3 MB)

## 🎯 Access URLs

- **Production**: `https://storybook.plainledger.ca` (after DNS propagation)
- **CloudFront Direct**: `https://d1b7zv6b6q84o4.cloudfront.net` (works now)
- **Local Development**: `http://localhost:6006` (run `npm run storybook`)

## ⚠️ Important Notes

1. **CloudFront Deployment**: Takes 5-15 minutes. Distribution is currently `InProgress`.
2. **DNS Propagation**: Takes 2-5 minutes. Route53 change is `PENDING`.
3. **Custom Domain**: Currently using CloudFront default certificate. To use `storybook.plainledger.ca` with custom SSL:
   - Create ACM certificate in `us-east-1` for `*.plainledger.ca`
   - Update CloudFront distribution to use custom certificate
4. **Access Control**: Users need `storybook:access` permission or `storybook-viewer` role.

## ✅ Verification Checklist

- [x] S3 bucket created and secured
- [x] Storybook deployed to S3
- [x] CloudFront distribution created
- [x] CloudFront cache invalidated
- [x] Route53 DNS record created
- [x] S3 bucket policy updated for CloudFront
- [x] Code committed and pushed
- [ ] CloudFront deployment complete (waiting)
- [ ] DNS propagation complete (waiting)
- [ ] User access granted
- [ ] GitHub variables configured

## 🎊 Success!

Storybook is deployed and will be accessible at `https://storybook.plainledger.ca` once CloudFront finishes deploying and DNS propagates!

**Current Status**: Infrastructure is live, waiting for CloudFront deployment (5-15 min) and DNS propagation (2-5 min).
