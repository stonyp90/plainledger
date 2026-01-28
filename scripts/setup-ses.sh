#!/bin/bash
# ==============================================================================
# AWS SES Setup Script for plainledger.ca
# This script configures SES for sending emails with full whitelabeling
# ==============================================================================

set -e

DOMAIN="plainledger.ca"
REGION="us-east-1"  # SES region (matches your SMTP config)
PROJECT="plainledger"
ENVIRONMENT="prod"

echo "=============================================="
echo "AWS SES Setup for $DOMAIN"
echo "Region: $REGION"
echo "=============================================="

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ Error: AWS credentials not configured"
    echo "Please run: aws configure"
    echo "Or export AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN"
    exit 1
fi

echo "✅ AWS credentials valid"
echo ""

# ==============================================================================
# Step 1: Verify Domain Identity
# ==============================================================================
echo "Step 1: Verifying domain identity..."

aws ses verify-domain-identity \
    --domain "$DOMAIN" \
    --region "$REGION" \
    --output json > /tmp/ses-domain-verification.json

VERIFICATION_TOKEN=$(cat /tmp/ses-domain-verification.json | jq -r '.VerificationToken')

echo "✅ Domain verification initiated"
echo ""
echo "📋 ADD THIS TXT RECORD TO YOUR DNS:"
echo "   Name:  _amazonses.$DOMAIN"
echo "   Type:  TXT"
echo "   Value: $VERIFICATION_TOKEN"
echo ""

# ==============================================================================
# Step 2: Setup DKIM
# ==============================================================================
echo "Step 2: Setting up DKIM..."

aws ses verify-domain-dkim \
    --domain "$DOMAIN" \
    --region "$REGION" \
    --output json > /tmp/ses-dkim.json

DKIM_TOKENS=$(cat /tmp/ses-dkim.json | jq -r '.DkimTokens[]')

echo "✅ DKIM setup initiated"
echo ""
echo "📋 ADD THESE CNAME RECORDS TO YOUR DNS:"
for token in $DKIM_TOKENS; do
    echo "   Name:  ${token}._domainkey.$DOMAIN"
    echo "   Type:  CNAME"
    echo "   Value: ${token}.dkim.amazonses.com"
    echo ""
done

# ==============================================================================
# Step 3: Set up MAIL FROM domain (for SPF)
# ==============================================================================
echo "Step 3: Setting up custom MAIL FROM domain..."

MAIL_FROM_DOMAIN="mail.$DOMAIN"

aws ses set-identity-mail-from-domain \
    --identity "$DOMAIN" \
    --mail-from-domain "$MAIL_FROM_DOMAIN" \
    --region "$REGION" || true

echo "✅ MAIL FROM domain configured"
echo ""
echo "📋 ADD THESE RECORDS TO YOUR DNS FOR SPF:"
echo "   Name:  $MAIL_FROM_DOMAIN"
echo "   Type:  MX"
echo "   Value: 10 feedback-smtp.$REGION.amazonses.com"
echo ""
echo "   Name:  $MAIL_FROM_DOMAIN"
echo "   Type:  TXT"
echo "   Value: \"v=spf1 include:amazonses.com ~all\""
echo ""

# ==============================================================================
# Step 4: Create IAM User for SMTP
# ==============================================================================
echo "Step 4: Creating IAM user for SMTP..."

IAM_USER="${PROJECT}-ses-smtp-user"

# Create IAM user (ignore if exists)
aws iam create-user --user-name "$IAM_USER" 2>/dev/null || echo "User already exists, continuing..."

# Attach SES sending policy
cat > /tmp/ses-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam put-user-policy \
    --user-name "$IAM_USER" \
    --policy-name "SESSendingPolicy" \
    --policy-document file:///tmp/ses-policy.json

# Create SMTP credentials (access key)
echo ""
echo "Creating SMTP credentials..."

CREDENTIALS=$(aws iam create-access-key --user-name "$IAM_USER" --output json 2>/dev/null || echo "")

if [ -n "$CREDENTIALS" ]; then
    ACCESS_KEY=$(echo "$CREDENTIALS" | jq -r '.AccessKey.AccessKeyId')
    SECRET_KEY=$(echo "$CREDENTIALS" | jq -r '.AccessKey.SecretAccessKey')
    
    # Convert secret key to SMTP password
    # AWS SES requires a special conversion from IAM secret key to SMTP password
    echo ""
    echo "=============================================="
    echo "⚠️  IMPORTANT: SMTP CREDENTIALS"
    echo "=============================================="
    echo ""
    echo "IAM Access Key ID: $ACCESS_KEY"
    echo "IAM Secret Key:    $SECRET_KEY"
    echo ""
    echo "To get your SMTP password, use this Python script:"
    echo ""
    
    # Generate the SMTP password conversion script
    cat > /tmp/convert-smtp-password.py << PYEOF
#!/usr/bin/env python3
import hmac
import hashlib
import base64

# Your IAM Secret Access Key
SECRET_KEY = "$SECRET_KEY"
REGION = "$REGION"

DATE = "11111111"
SERVICE = "ses"
MESSAGE = "SendRawEmail"
TERMINAL = "aws4_request"
VERSION = 0x04

def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def calculate_key(secret_access_key, region):
    signature = sign(("AWS4" + secret_access_key).encode('utf-8'), DATE)
    signature = sign(signature, region)
    signature = sign(signature, SERVICE)
    signature = sign(signature, TERMINAL)
    signature = sign(signature, MESSAGE)
    signature_and_version = bytes([VERSION]) + signature
    smtp_password = base64.b64encode(signature_and_version)
    return smtp_password.decode('utf-8')

smtp_password = calculate_key(SECRET_KEY, REGION)
print(f"SMTP Password: {smtp_password}")
PYEOF

    python3 /tmp/convert-smtp-password.py
    
    echo ""
    echo "SMTP Settings for Keycloak/Gmail:"
    echo "  Host:     email-smtp.$REGION.amazonaws.com"
    echo "  Port:     587 (TLS) or 465 (SSL)"
    echo "  Username: $ACCESS_KEY"
    echo "  Password: (use the SMTP password above, NOT the IAM secret key)"
    echo ""
else
    echo "⚠️  Could not create new access key. You may have reached the limit of 2 keys."
    echo "   Delete an existing key first: aws iam list-access-keys --user-name $IAM_USER"
fi

# ==============================================================================
# Step 5: Request Production Access (if in sandbox)
# ==============================================================================
echo ""
echo "=============================================="
echo "📧 SES SANDBOX MODE"
echo "=============================================="
echo ""
echo "By default, SES is in sandbox mode. You can only send to verified emails."
echo "To send to anyone, request production access:"
echo ""
echo "1. Go to: https://console.aws.amazon.com/ses/home?region=$REGION#/account"
echo "2. Click 'Request production access'"
echo "3. Fill out the form (takes 24-48 hours)"
echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo "=============================================="
echo "📋 SUMMARY: DNS RECORDS TO ADD"
echo "=============================================="
echo ""
echo "Add these records to your DNS provider (ImprovMX, Route53, etc.):"
echo ""
echo "1. Domain Verification (TXT):"
echo "   _amazonses.$DOMAIN  TXT  \"$VERIFICATION_TOKEN\""
echo ""
echo "2. DKIM (3 CNAME records):"
for token in $DKIM_TOKENS; do
    echo "   ${token}._domainkey.$DOMAIN  CNAME  ${token}.dkim.amazonses.com"
done
echo ""
echo "3. SPF/MAIL FROM:"
echo "   $MAIL_FROM_DOMAIN  MX   10 feedback-smtp.$REGION.amazonses.com"
echo "   $MAIL_FROM_DOMAIN  TXT  \"v=spf1 include:amazonses.com ~all\""
echo ""
echo "=============================================="
echo "✅ SES setup complete! Add the DNS records above."
echo "=============================================="
