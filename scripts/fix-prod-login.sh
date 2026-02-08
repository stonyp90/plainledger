#!/bin/bash
# Fix production login and email issues

set -e

export AWS_ACCESS_KEY_ID="ASIAWLC57O2SJIG7AB6W"
export AWS_SECRET_ACCESS_KEY="XM/Bm0dTt5h7pwxkCP3nXDUxytOZgg0DNpiW5SWW"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjELb//////////wEaCXVzLWVhc3QtMiJGMEQCIBYTHyfNKXouoQQFEIqKRHfojouNJQ4+KU1NkVmGrO9AAiAMKDtL/HXh3RmXgqrc7RRLWCYGRIOwtN5F3OG0opnIUCrpAgh/EAAaDDQzNjEzNjI3NzY2OCIMX/IfgPqsY4zQtMkCKsYCjjRjt3Vg97K7Zwu84G7g/8WKwc0Odr1cOw0OPpk0Dk8l8Tcn1aHdDYN0N8BOITSTeywt1eMHs62hnMGTt8NNlvcFh0H5CEZyGcRIRuvFVP5fBCxQcCPe83zTdhSSzQkCnqOhdwEDh25J59n2Au4px46UOvCjM1uieD9DsXBjHg2u7HremQ+1tSKEjY60i4l9ycuUL5OvG1NhyPyRU+gIMb/5aUuSYxbokJmldIl2JGe0ytMVRgZqATCXgBAt8/XA//WU4RB+dEdNtR7zjCWUeFQ5za1FQ/PKYXquD0Kk5vQlZ6dP34fgCLECrr0XqzEaQzCar9StVrTgH9KTOUf35HYhy1dNDpSBq0nrYh0hCuFG2d/tCLAEp3uXpA1WNT14SLPJboGY62EzFAdJn1nO2jj+xB3QpHg6aPCOeVPW9IcNMQjYUwAwxJCkzAY6pgEXrhVq/r1od7QCy+QjD1uZoNGNGUI7XtxvKZ5qGQC5B2CdRDmQGaD8Tla/7VacGrNGB/SPtKKD4cfUuOdPfL7se59QxM4oumtF5jCBZdmqRCuZuz4RoJ6fpQrHW13rrUDrnrbpFbHo3oJxA2yzrrHnC8V+9ZrWaG2adMZtUwpfGkOlz4sfSdvEc0UT/lDFlAkLeMxxyBLJhC5frvR3NfPmcN6zDQop5"

KEYCLOAK_URL="https://auth.plainledger.ca"
REALM="plainledger"

echo "=== Production Login & Email Fix ==="
echo ""

# Get Keycloak admin password
echo "1. Getting Keycloak admin credentials..."
ADMIN_PASS=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/keycloak/admin-password" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")

if [ -z "$ADMIN_PASS" ]; then
  echo "✗ Could not retrieve admin password from AWS Secrets Manager"
  echo "  Please check AWS credentials and secret: plainledger/prod/keycloak/admin-password"
  exit 1
fi

# Get admin token
echo "2. Authenticating with Keycloak..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "✗ Failed to get admin token"
  echo "  Please verify Keycloak admin credentials"
  exit 1
fi

echo "✓ Authenticated"
echo ""

# Check if plainledger-web client exists
echo "3. Checking plainledger-web client..."
CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=plainledger-web" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)

if [ "$CLIENT" = "null" ] || [ -z "$CLIENT" ]; then
  echo "✗ plainledger-web client does not exist!"
  echo "  This is required for login. Please create it manually in Keycloak admin console."
  echo "  See: docs/KEYCLOAK_ADMIN_CLIENT_SETUP.md"
  exit 1
fi

CLIENT_ID=$(echo "$CLIENT" | jq -r '.id')
echo "✓ Client exists (ID: $CLIENT_ID)"

# Check client configuration
ENABLED=$(echo "$CLIENT" | jq -r '.enabled')
PUBLIC=$(echo "$CLIENT" | jq -r '.publicClient')
STANDARD_FLOW=$(echo "$CLIENT" | jq -r '.standardFlowEnabled')
DIRECT_ACCESS=$(echo "$CLIENT" | jq -r '.directAccessGrantsEnabled')

echo "  Enabled: $ENABLED"
echo "  Public Client: $PUBLIC"
echo "  Standard Flow: $STANDARD_FLOW"
echo "  Direct Access Grants: $DIRECT_ACCESS"

if [ "$ENABLED" != "true" ] || [ "$PUBLIC" != "true" ] || [ "$STANDARD_FLOW" != "true" ]; then
  echo "⚠️  Client configuration issues detected!"
fi
echo ""

# Check if test-admin user exists
echo "4. Checking test-admin@plainledger.ca user..."
USER=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=test-admin@plainledger.ca" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)

if [ "$USER" = "null" ] || [ -z "$USER" ]; then
  echo "✗ User does not exist"
  echo "  Creating user..."
  
  USER_ID=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test-admin@plainledger.ca",
      "firstName": "Test",
      "lastName": "Admin",
      "enabled": true,
      "emailVerified": true,
      "attributes": {
        "organization": ["demo-org"]
      }
    }' | jq -r '.id' 2>/dev/null)
  
  if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
    echo "✗ Failed to create user"
    exit 1
  fi
  
  echo "✓ User created (ID: $USER_ID)"
  
  # Set password
  curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "password",
      "value": "TestAdmin123!",
      "temporary": false
    }' > /dev/null
  
  echo "✓ Password set: TestAdmin123!"
else
  USER_ID=$(echo "$USER" | jq -r '.id')
  echo "✓ User exists (ID: $USER_ID)"
  
  # Reset password
  echo "  Resetting password..."
  curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "password",
      "value": "TestAdmin123!",
      "temporary": false
    }' > /dev/null
  
  echo "✓ Password reset: TestAdmin123!"
fi
echo ""

# Check SMTP configuration
echo "5. Checking SMTP configuration..."
REALM_CONFIG=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM" \
  -H "Authorization: Bearer $TOKEN" | jq '.smtpServer' 2>/dev/null)

SMTP_HOST=$(echo "$REALM_CONFIG" | jq -r '.host // empty')
SMTP_ENABLED=$(echo "$REALM_CONFIG" | jq -r '.host != null and .host != ""')

if [ "$SMTP_ENABLED" = "true" ]; then
  echo "✓ SMTP configured"
  echo "  Host: $SMTP_HOST"
  
  # Check if SMTP credentials are set
  SMTP_USER=$(echo "$REALM_CONFIG" | jq -r '.user // empty')
  if [ -z "$SMTP_USER" ]; then
    echo "⚠️  SMTP user not configured"
    echo "  Checking AWS Secrets Manager for SMTP credentials..."
    
    SMTP_SECRET=$(aws secretsmanager get-secret-value \
      --secret-id "plainledger/prod/keycloak/smtp" \
      --region ca-central-1 \
      --query 'SecretString' \
      --output text 2>/dev/null || echo "")
    
    if [ -z "$SMTP_SECRET" ]; then
      echo "✗ SMTP secret not found in AWS Secrets Manager"
      echo "  Secret name: plainledger/prod/keycloak/smtp"
      echo "  You need to create this secret with SMTP_USER and SMTP_PASSWORD"
    else
      echo "✓ SMTP secret exists"
      echo "  Note: Keycloak needs to be restarted or SMTP settings updated via admin console"
    fi
  else
    echo "✓ SMTP user configured"
  fi
else
  echo "✗ SMTP not configured"
  echo "  Emails will not be sent!"
fi
echo ""

echo "=== Summary ==="
echo "User: test-admin@plainledger.ca"
echo "Password: TestAdmin123!"
echo "Login URL: https://app.plainledger.ca/login"
echo ""
echo "Next steps:"
echo "1. Try logging in with the credentials above"
echo "2. If SMTP is not configured, set it up in Keycloak admin console:"
echo "   https://auth.plainledger.ca/admin -> plainledger realm -> Realm settings -> Email"
echo "3. Create SMTP secret if needed:"
echo "   aws secretsmanager create-secret --name plainledger/prod/keycloak/smtp --secret-string '{\"user\":\"...\",\"password\":\"...\"}'"
