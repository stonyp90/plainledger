#!/bin/bash
# =============================================================================
# Update Keycloak Client Configuration
# Enables Direct Access Grants on plainledger-web client
# =============================================================================

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-https://auth.plainledger.ca}"
REALM="${KEYCLOAK_REALM:-plainledger}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-plainledger-api}"
CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET}"
ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}"

if [ -z "$CLIENT_SECRET" ] && [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: Either KEYCLOAK_CLIENT_SECRET or KEYCLOAK_ADMIN_PASSWORD must be set"
  exit 1
fi

echo "🔐 Authenticating to Keycloak..."

# Get admin token
if [ -n "$ADMIN_PASSWORD" ]; then
  # Use admin credentials
  ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${ADMIN_USER}" \
    -d "password=${ADMIN_PASSWORD}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | jq -r '.access_token')
else
  # Use client credentials
  ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "grant_type=client_credentials" | jq -r '.access_token')
fi

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo "❌ Failed to authenticate to Keycloak"
  exit 1
fi

echo "✅ Authenticated successfully"

# Get plainledger-web client
echo "📋 Fetching plainledger-web client configuration..."
CLIENT_CONFIG=$(curl -s -X GET \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/clients?clientId=plainledger-web" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq '.[0]')

if [ -z "$CLIENT_CONFIG" ] || [ "$CLIENT_CONFIG" = "null" ]; then
  echo "❌ Client 'plainledger-web' not found"
  exit 1
fi

CLIENT_UUID=$(echo "$CLIENT_CONFIG" | jq -r '.id')
echo "✅ Found client with ID: ${CLIENT_UUID}"

# Check current Direct Access Grants status
CURRENT_STATUS=$(echo "$CLIENT_CONFIG" | jq -r '.directAccessGrantsEnabled')
echo "📊 Current Direct Access Grants status: ${CURRENT_STATUS}"

if [ "$CURRENT_STATUS" = "true" ]; then
  echo "✅ Direct Access Grants is already enabled"
  exit 0
fi

# Update client to enable Direct Access Grants
echo "🔧 Enabling Direct Access Grants..."
UPDATED_CONFIG=$(echo "$CLIENT_CONFIG" | jq '.directAccessGrantsEnabled = true')

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_CONFIG")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Successfully enabled Direct Access Grants on plainledger-web client"
  echo "🎉 Configuration updated!"
else
  echo "❌ Failed to update client configuration"
  echo "HTTP Code: ${HTTP_CODE}"
  echo "Response: ${BODY}"
  exit 1
fi
