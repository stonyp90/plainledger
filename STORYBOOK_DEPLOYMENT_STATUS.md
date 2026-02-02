# Storybook Deployment Status

## ✅ Completed

### Code Implementation

- ✅ Storybook installed and configured
- ✅ Authentication wrapper with Keycloak
- ✅ API endpoint `/api/permissions/storybook` with Swagger docs
- ✅ Component stories created
- ✅ Terraform module created
- ✅ CI/CD pipeline configured
- ✅ All code committed and pushed to `main` branch

### Infrastructure (Partial)

- ✅ S3 bucket created: `plainledger-prod-storybook`
- ✅ Storybook deployed to S3 (8.3 MB)
- ✅ S3 bucket security configured:
  - ✅ Public access blocked
  - ✅ Server-side encryption enabled (AES256)
- ✅ Bucket versioning enabled

### Security

- ✅ S3 bucket blocks all public access
- ✅ Encryption at rest enabled
- ✅ API endpoint requires authentication
- ✅ Database-backed authorization implemented

## ⚠️ Remaining Steps

### 1. CloudFront Distribution (Required for HTTPS/CDN)

The S3 bucket is ready, but CloudFront distribution needs to be created. You have two options:

**Option A: Use Terraform (Recommended, but requires fixing datalake module first)**

```bash
cd terraform/environments/prod
# Fix duplicate resources in datalake module first
terraform apply -target=module.storybook
```

**Option B: Create CloudFront manually via AWS Console/CLI**

1. Create CloudFront Origin Access Identity (OAI)
2. Create CloudFront distribution pointing to S3 bucket
3. Update S3 bucket policy to allow CloudFront OAI
4. Create Route53 record pointing to CloudFront

### 2. Route53 DNS Record

Once CloudFront is created:

```bash
# Get CloudFront distribution domain name
aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Storybook component library for plainledger-prod'].DomainName" --output text

# Create Route53 record (if hosted zone exists)
aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "storybook.plainledger.ca",
      "Type": "A",
      "AliasTarget": {
        "DNSName": "<CLOUDFRONT_DOMAIN>",
        "EvaluateTargetHealth": false,
        "HostedZoneId": "Z2FDTNDATAQYW2"
      }
    }
  }]
}'
```

### 3. GitHub Variables Configuration

Go to: https://github.com/stonyp90/plainledger/settings/secrets/actions

**Add Variables:**

- `STORYBOOK_BUCKET_PROD` = `plainledger-prod-storybook`
- `STORYBOOK_CF_ID_PROD` = (CloudFront distribution ID - get after creating CloudFront)

**Add Secret:**

- `AWS_ROLE_ARN` = (Get from Terraform: `terraform output github_actions_role_arn`)

### 4. Grant User Access

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

## 📊 Current Status

- **S3 Bucket**: ✅ Created and populated
- **Storybook Build**: ✅ Deployed to S3
- **CloudFront**: ⚠️ Not yet created
- **Route53 DNS**: ⚠️ Not yet configured
- **GitHub CI/CD**: ✅ Configured (will work once CloudFront is created)
- **API Endpoint**: ✅ Ready (`/api/permissions/storybook`)
- **Swagger Docs**: ✅ Documented

## 🔗 URLs

- **S3 Bucket**: `s3://plainledger-prod-storybook`
- **S3 Web URL** (temporary, for testing): `http://plainledger-prod-storybook.s3-website.ca-central-1.amazonaws.com` (won't work due to public access block - need CloudFront)
- **Target URL** (after CloudFront): `https://storybook.plainledger.ca`
- **API Docs**: `https://api.plainledger.ca/api/docs` (when API is running)

## 🚀 Next Actions

1. **Create CloudFront distribution** (see Option A or B above)
2. **Configure Route53 DNS** record
3. **Set GitHub variables** for CI/CD
4. **Grant access** to users
5. **Test** at `https://storybook.plainledger.ca`

## 📝 Notes

- Storybook static files were committed to git (105 files). Consider adding `storybook-static/` to `.gitignore` for future builds.
- Terraform has pre-existing issues in datalake module (duplicate resources). Fix those or deploy Storybook module separately.
- CloudFront certificate must be in `us-east-1` region (already configured in Terraform).
