#!/bin/bash
# Simple script to create a test user in Keycloak

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-https://auth.plainledger.ca}"
REALM="${KEYCLOAK_REALM:-plainledger}"

echo "=== Create Test User in Keycloak ==="
echo

# Get admin password
if command -v aws &> /dev/null; then
  ADMIN_PASS=$(aws secretsmanager get-secret-value \
    --secret-id "plainledger/prod/keycloak/admin-password" \
    --region ca-central-1 \
    --query 'SecretString' \
    --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")
fi

if [ -z "$ADMIN_PASS" ]; then
  echo "Enter Keycloak admin password:"
  read -s ADMIN_PASS
  echo
fi

# Get token
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi

# Get user details
read -p "Email: " EMAIL
read -p "First Name: " FIRST_NAME
read -p "Last Name: " LAST_NAME
read -p "Organization ID [demo-org]: " ORG_ID
ORG_ID=${ORG_ID:-demo-org}
read -p "Password: " -s PASSWORD
echo

# Check if user exists
EXISTING=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$EMAIL" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id' 2>/dev/null)

if [ "$EXISTING" != "null" ] && [ -n "$EXISTING" ]; then
  echo "User already exists (ID: $EXISTING)"
  USER_ID=$EXISTING
else
  # Create user
  USER_ID=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"firstName\": \"$FIRST_NAME\",
      \"lastName\": \"$LAST_NAME\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"attributes\": {
        \"organization\": [\"$ORG_ID\"]
      }
    }" | jq -r '.id' 2>/dev/null)
  
  if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
    echo "Failed to create user"
    exit 1
  fi
  echo "✓ User created"
fi

# Set password
curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"password\",
    \"value\": \"$PASSWORD\",
    \"temporary\": false
  }" > /dev/null

echo "✓ Password set"
echo
echo "=== User Created ==="
echo "Email: $EMAIL"
echo "Keycloak ID: $USER_ID"
echo "Organization: $ORG_ID"
echo "Login: https://app.plainledger.ca"
