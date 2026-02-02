#!/bin/bash
# Create CloudFront distribution for Storybook
# This script creates CloudFront with OAI, updates S3 policy, and optionally creates Route53 record

set -e

BUCKET_NAME="${1:-plainledger-prod-storybook}"
DOMAIN_NAME="${2:-storybook.plainledger.ca}"
CERT_ARN="${3}"  # ACM certificate ARN in us-east-1 (optional)

echo "🚀 Creating CloudFront distribution for Storybook..."

# Get OAI ID (create if doesn't exist)
OAI_ID=$(aws cloudfront list-cloud-front-origin-access-identities \
  --query "CloudFrontOriginAccessIdentityList.Items[?Comment=='OAI for ${BUCKET_NAME}'].Id" \
  --output text 2>/dev/null | head -1)

if [ -z "$OAI_ID" ]; then
  echo "📦 Creating Origin Access Identity..."
  OAI_OUTPUT=$(aws cloudfront create-cloud-front-origin-access-identity \
    --cloud-front-origin-access-identity-config "CallerReference=$(date +%s),Comment=OAI for ${BUCKET_NAME}")
  OAI_ID=$(echo $OAI_OUTPUT | jq -r '.CloudFrontOriginAccessIdentity.Id')
  OAI_CANONICAL=$(echo $OAI_OUTPUT | jq -r '.CloudFrontOriginAccessIdentity.S3CanonicalUserId')
  echo "✅ Created OAI: $OAI_ID"
else
  echo "✅ Using existing OAI: $OAI_ID"
  OAI_OUTPUT=$(aws cloudfront get-cloud-front-origin-access-identity --id $OAI_ID)
  OAI_CANONICAL=$(echo $OAI_OUTPUT | jq -r '.CloudFrontOriginAccessIdentity.S3CanonicalUserId')
fi

# Update S3 bucket policy to allow CloudFront OAI
echo "🔒 Updating S3 bucket policy..."
BUCKET_ARN="arn:aws:s3:::${BUCKET_NAME}"
OAI_ARN="arn:aws:cloudfront::436136277668:cloudfront-origin-access-identity/${OAI_ID}"

cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAI",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${OAI_ARN}"
      },
      "Action": "s3:GetObject",
      "Resource": "${BUCKET_ARN}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/s3-policy.json
rm /tmp/s3-policy.json
echo "✅ S3 bucket policy updated"

# Get bucket regional domain name
BUCKET_DOMAIN=$(aws s3api get-bucket-location --bucket $BUCKET_NAME --query 'LocationConstraint' --output text)
if [ "$BUCKET_DOMAIN" = "None" ]; then
  BUCKET_DOMAIN="us-east-1"
fi
BUCKET_REGIONAL_DOMAIN="${BUCKET_NAME}.s3.${BUCKET_DOMAIN}.amazonaws.com"

# Create CloudFront distribution config
cat > /tmp/cf-config.json <<EOF
{
  "CallerReference": "storybook-$(date +%s)",
  "Comment": "Storybook component library for plainledger-prod",
  "Enabled": true,
  "IsIPV6Enabled": true,
  "DefaultRootObject": "index.html",
  "Aliases": {
    "Quantity": 1,
    "Items": ["${DOMAIN_NAME}"]
  },
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-${BUCKET_NAME}",
      "DomainName": "${BUCKET_REGIONAL_DOMAIN}",
      "S3OriginConfig": {
        "OriginAccessIdentity": "origin-access-identity/cloudfront/${OAI_ID}"
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET_NAME}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Restrictions": {
    "GeoRestriction": {
      "RestrictionType": "none"
    }
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
EOF

# Create CloudFront distribution
echo "🌐 Creating CloudFront distribution..."
CF_OUTPUT=$(aws cloudfront create-distribution --distribution-config file:///tmp/cf-config.json)
CF_ID=$(echo $CF_OUTPUT | jq -r '.Distribution.Id')
CF_DOMAIN=$(echo $CF_OUTPUT | jq -r '.Distribution.DomainName')
CF_ARN=$(echo $CF_OUTPUT | jq -r '.Distribution.ARN')

rm /tmp/cf-config.json

echo ""
echo "✅ CloudFront distribution created!"
echo "   Distribution ID: $CF_ID"
echo "   Domain Name: $CF_DOMAIN"
echo "   ARN: $CF_ARN"
echo ""
echo "⏳ Distribution is deploying (takes 5-15 minutes)..."
echo "   Status: $(echo $CF_OUTPUT | jq -r '.Distribution.Status')"
echo ""
echo "📝 Next steps:"
echo "   1. Wait for distribution to deploy: aws cloudfront get-distribution --id $CF_ID"
echo "   2. Create Route53 record pointing $DOMAIN_NAME to $CF_DOMAIN"
echo "   3. Set GitHub variable STORYBOOK_CF_ID_PROD=$CF_ID"
