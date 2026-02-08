#!/bin/bash
# Setup and verify login/signup resources in Keycloak and database

set -e

export AWS_ACCESS_KEY_ID="ASIAWLC57O2SJIG7AB6W"
export AWS_SECRET_ACCESS_KEY="XM/Bm0dTt5h7pwxkCP3nXDUxytOZgg0DNpiW5SWW"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjELb//////////wEaCXVzLWVhc3QtMiJGMEQCIBYTHyfNKXouoQQFEIqKRHfojouNJQ4+KU1NkVmGrO9AAiAMKDtL/HXh3RmXgqrc7RRLWCYGRIOwtN5F3OG0opnIUCrpAgh/EAAaDDQzNjEzNjI3NzY2OCIMX/IfgPqsY4zQtMkCKsYCjjRjt3Vg97K7Zwu84G7g/8WKwc0Odr1cOw0OPpk0Dk8l8Tcn1aHdDYN0N8BOITSTeywt1eMHs62hnMGTt8NNlvcFh0H5CEZyGcRIRuvFVP5fBCxQcCPe83zTdhSSzQkCnqOhdwEDh25J59n2Au4px46UOvCjM1uieD9DsXBjHg2u7HremQ+1tSKEjY60i4l9ycuUL5OvG1NhyPyRU+gIMb/5aUuSYxbokJmldIl2JGe0ytMVRgZqATCXgBAt8/XA//WU4RB+dEdNtR7zjCWUeFQ5za1FQ/PKYXquD0Kk5vQlZ6dP34fgCLECrr0XqzEaQzCar9StVrTgH9KTOUf35HYhy1dNDpSBq0nrYh0hCuFG2d/tCLAEp3uXpA1WNT14SLPJboGY62EzFAdJn1nO2jj+xB3QpHg6aPCOeVPW9IcNMQjYUwAwxJCkzAY6pgEXrhVq/r1od7QCy+QjD1uZoNGNGUI7XtxvKZ5qGQC5B2CdRDmQGaD8Tla/7VacGrNGB/SPtKKD4cfUuOdPfL7se59QxM4oumtF5jCBZdmqRCuZuz4RoJ6fpQrHW13rrUDrnrbpFbHo3oJxA2yzrrHnC8V+9ZrWaG2adMZtUwpfGkOlz4sfSdvEc0UT/lDFlAkLeMxxyBLJhC5frvR3NfPmcN6zDQop5"

KEYCLOAK_URL="https://auth.plainledger.ca"
REALM="plainledger"
API_URL="https://api.plainledger.ca"

echo "=== PlainLedger Login/Signup Setup & Verification ==="
echo ""

# Get admin password
ADMIN_PASS=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/keycloak/admin-password" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")

if [ -z "$ADMIN_PASS" ]; then
  echo "✗ Could not retrieve admin password"
  exit 1
fi

# Try to get admin token (may fail if admin-cli not enabled)
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" 2>/dev/null | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "⚠ Cannot access Keycloak Admin API (admin-cli may not be enabled)"
  echo "  You'll need to configure clients manually via Keycloak Admin Console"
  echo "  URL: $KEYCLOAK_URL/admin"
  echo ""
  echo "=== Required Keycloak Clients ==="
  echo ""
  echo "1. plainledger-web (Public Client)"
  echo "   - Standard Flow: ON"
  echo "   - Direct Access Grants: OFF (uses API for login)"
  echo "   - Redirect URIs: https://app.plainledger.ca/*, https://plainledger.ca/*"
  echo "   - Web Origins: https://app.plainledger.ca, https://plainledger.ca"
  echo ""
  echo "2. plainledger-api (Confidential Client)"
  echo "   - Standard Flow: ON"
  echo "   - Direct Access Grants: ON (required for login endpoint)"
  echo "   - Service Accounts: ON (optional)"
  echo "   - Get secret from Credentials tab → save to plainledger/prod/keycloak-client"
  echo ""
  echo "3. plainledger-admin (Public Client)"
  echo "   - Standard Flow: ON"
  echo "   - Direct Access Grants: ON"
  echo "   - Redirect URIs: https://admin.plainledger.ca/*"
  echo "   - Web Origins: https://admin.plainledger.ca"
  echo ""
else
  echo "✓ Keycloak admin token obtained"
  echo ""
  
  # Check clients
  echo "=== Checking Keycloak Clients ==="
  
  for CLIENT_ID in "plainledger-web" "plainledger-api" "plainledger-admin"; do
    CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
      -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
    
    if [ "$CLIENT" != "null" ] && [ -n "$CLIENT" ]; then
      echo "✓ $CLIENT_ID exists"
      ENABLED=$(echo "$CLIENT" | jq -r '.enabled')
      PUBLIC=$(echo "$CLIENT" | jq -r '.publicClient')
      STANDARD=$(echo "$CLIENT" | jq -r '.standardFlowEnabled')
      DIRECT=$(echo "$CLIENT" | jq -r '.directAccessGrantsEnabled')
      
      if [ "$ENABLED" != "true" ]; then
        echo "  ⚠ Client is disabled"
      fi
      
      if [ "$CLIENT_ID" = "plainledger-api" ] && [ "$DIRECT" != "true" ]; then
        echo "  ⚠ Direct Access Grants must be enabled for login to work"
      fi
    else
      echo "✗ $CLIENT_ID MISSING - needs to be created"
    fi
  done
fi

echo ""
echo "=== Testing API Endpoints ==="

# Test login endpoint
echo "1. Testing login endpoint..."
LOGIN_TEST=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@nonexistent.com","password":"test"}' \
  -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null)

HTTP_STATUS=$(echo "$LOGIN_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "400" ]; then
  echo "  ✓ Login endpoint responds (expected 401 for invalid credentials)"
else
  echo "  ⚠ Login endpoint returned: $HTTP_STATUS"
fi

# Test signup endpoint
echo ""
echo "2. Testing signup endpoint..."
SIGNUP_TEST=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","firstName":"Test","lastName":"User","password":"Test123!@#$","province":"ON"}' \
  -w "\nHTTP_STATUS:%{http_code}" 2>/dev/null)

HTTP_STATUS=$(echo "$SIGNUP_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "201" ] || [ "$HTTP_STATUS" = "409" ] || [ "$HTTP_STATUS" = "400" ]; then
  echo "  ✓ Signup endpoint responds (status: $HTTP_STATUS)"
else
  echo "  ⚠ Signup endpoint returned: $HTTP_STATUS"
fi

echo ""
echo "=== Database Verification ==="
echo "Checking if user_profiles table exists..."

# Get DB credentials
DB_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/db-credentials" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null)

if [ -n "$DB_SECRET" ]; then
  DB_HOST=$(echo "$DB_SECRET" | jq -r '.host // empty')
  DB_NAME=$(echo "$DB_SECRET" | jq -r '.database // empty')
  DB_USER=$(echo "$DB_SECRET" | jq -r '.username // empty')
  DB_PASS=$(echo "$DB_SECRET" | jq -r '.password // empty')
  
  if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ]; then
    echo "  ✓ Database credentials retrieved"
    echo "  Host: $DB_HOST"
    echo "  Database: $DB_NAME"
    echo ""
    echo "  To verify tables, connect and run:"
    echo "    SELECT table_name FROM information_schema.tables WHERE table_schema = 'accounting' AND table_name = 'user_profiles';"
  else
    echo "  ⚠ Could not parse database credentials"
  fi
else
  echo "  ⚠ Could not retrieve database credentials"
fi

echo ""
echo "=== Summary ==="
echo ""
echo "Next steps:"
echo "1. Verify Keycloak clients exist and are configured correctly"
echo "2. Ensure plainledger-api client has Direct Access Grants enabled"
echo "3. Ensure KEYCLOAK_CLIENT_SECRET is set in API environment"
echo "4. Verify database tables exist (user_profiles, organizations)"
echo "5. Test login with: curl -X POST $API_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"password\"}'"
echo ""
echo "Keycloak Admin Console: $KEYCLOAK_URL/admin"
echo "Realm: $REALM"
