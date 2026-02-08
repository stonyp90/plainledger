#!/bin/bash
# Create default test users for production

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-https://auth.plainledger.ca}"
REALM="${KEYCLOAK_REALM:-plainledger}"
ORG_ID="${ORG_ID:-demo-org}"

# Get admin password from AWS Secrets Manager
ADMIN_PASS=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/keycloak/admin-password" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")

if [ -z "$ADMIN_PASS" ]; then
  echo "Error: Could not retrieve Keycloak admin password from AWS Secrets Manager"
  echo "Please ensure AWS credentials are configured and the secret exists."
  exit 1
fi

# Get admin token
echo "Authenticating with Keycloak..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "Error: Failed to get admin token"
  exit 1
fi

echo "✓ Authenticated"

# Function to create or update user
create_user() {
  local email=$1
  local first_name=$2
  local last_name=$3
  local password=$4
  
  echo ""
  echo "Processing: $email"
  
  # Check if user exists
  EXISTING=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$email" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id' 2>/dev/null)
  
  if [ "$EXISTING" != "null" ] && [ -n "$EXISTING" ]; then
    echo "  User already exists (ID: $EXISTING)"
    USER_ID=$EXISTING
    
    # Update password anyway
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"password\",
        \"value\": \"$password\",
        \"temporary\": false
      }" > /dev/null
    echo "  ✓ Password updated"
  else
    # Create user
    USER_ID=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$email\",
        \"firstName\": \"$first_name\",
        \"lastName\": \"$last_name\",
        \"enabled\": true,
        \"emailVerified\": true,
        \"attributes\": {
          \"organization\": [\"$ORG_ID\"]
        }
      }" | jq -r '.id' 2>/dev/null)
    
    if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
      echo "  ✗ Failed to create user"
      return 1
    fi
    
    echo "  ✓ User created (ID: $USER_ID)"
    
    # Set password
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"password\",
        \"value\": \"$password\",
        \"temporary\": false
      }" > /dev/null
    echo "  ✓ Password set"
  fi
}

# Create test users
echo ""
echo "=== Creating Test Users ==="
echo "Organization: $ORG_ID"
echo ""

# User 1: Test Admin
create_user \
  "test-admin@plainledger.ca" \
  "Test" \
  "Admin" \
  "TestAdmin123!"

# User 2: Test User (Owner)
create_user \
  "test-user@plainledger.ca" \
  "Test" \
  "User" \
  "TestUser123!"

# User 3: Test Viewer
create_user \
  "test-viewer@plainledger.ca" \
  "Test" \
  "Viewer" \
  "TestViewer123!"

echo ""
echo "=== Summary ==="
echo "Created/Updated users:"
echo "  - test-admin@plainledger.ca (Password: TestAdmin123!)"
echo "  - test-user@plainledger.ca (Password: TestUser123!)"
echo "  - test-viewer@plainledger.ca (Password: TestViewer123!)"
echo ""
echo "Login URL: https://app.plainledger.ca"
echo "Organization: $ORG_ID (has real data access)"
