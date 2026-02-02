#!/bin/bash
# Deploy Storybook to S3 and CloudFront
# Usage: ./scripts/deploy-storybook.sh [prod|dev]

set -e

ENVIRONMENT="${1:-prod}"
AWS_REGION="${AWS_REGION:-ca-central-1}"

echo "🚀 Deploying Storybook to $ENVIRONMENT environment..."

# Get Terraform outputs
cd terraform/environments/$ENVIRONMENT

echo "📦 Getting Terraform outputs..."
BUCKET_NAME=$(terraform output -raw storybook_s3_bucket 2>/dev/null || echo "")
CF_ID=$(terraform output -raw storybook_cloudfront_id 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Error: Could not get S3 bucket name from Terraform"
  echo "   Run 'terraform apply' first to create the infrastructure"
  exit 1
fi

if [ -z "$CF_ID" ]; then
  echo "⚠️  Warning: Could not get CloudFront distribution ID"
  echo "   Cache invalidation will be skipped"
fi

cd ../../..

# Build Storybook
echo "🔨 Building Storybook..."
cd apps/web
pnpm build-storybook

if [ ! -d "storybook-static" ]; then
  echo "❌ Error: Storybook build failed"
  exit 1
fi

cd ../..

# Deploy to S3
echo "📤 Uploading to S3: $BUCKET_NAME"
aws s3 sync apps/web/storybook-static \
  s3://$BUCKET_NAME \
  --delete \
  --cache-control "public, max-age=3600" \
  --exclude "*.html" \
  --exclude "*.json" \
  --region $AWS_REGION

# HTML and JSON with no-cache for auth
aws s3 sync apps/web/storybook-static \
  s3://$BUCKET_NAME \
  --cache-control "no-cache, no-store, must-revalidate" \
  --include "*.html" \
  --include "*.json" \
  --region $AWS_REGION

echo "✅ Uploaded to S3"

# Invalidate CloudFront cache
if [ ! -z "$CF_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CF_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text \
    --region $AWS_REGION)
  
  echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
  echo "   URL: https://storybook.plainledger.ca"
else
  echo "⚠️  Skipping CloudFront invalidation (distribution ID not found)"
fi

echo ""
echo "🎉 Deployment complete!"
echo "   Storybook is available at: https://storybook.plainledger.ca"
