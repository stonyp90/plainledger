#!/bin/bash
# Create all required resources for login/signup in Keycloak and database

set -e

export AWS_ACCESS_KEY_ID="ASIAWLC57O2SJIG7AB6W"
export AWS_SECRET_ACCESS_KEY="XM/Bm0dTt5h7pwxkCP3nXDUxytOZgg0DNpiW5SWW"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjELb//////////wEaCXVzLWVhc3QtMiJGMEQCIBYTHyfNKXouoQQFEIqKRHfojouNJQ4+KU1NkVmGrO9AAiAMKDtL/HXh3RmXgqrc7RRLWCYGRIOwtN5F3OG0opnIUCrpAgh/EAAaDDQzNjEzNjI3NzY2OCIMX/IfgPqsY4zQtMkCKsYCjjRjt3Vg97K7Zwu84G7g/8WKwc0Odr1cOw0OPpk0Dk8l8Tcn1aHdDYN0N8BOITSTeywt1eMHs62hnMGTt8NNlvcFh0H5CEZyGcRIRuvFVP5fBCxQcCPe83zTdhSSzQkCnqOhdwEDh25J59n2Au4px46UOvCjM1uieD9DsXBjHg2u7HremQ+1tSKEjY60i4l9ycuUL5OvG1NhyPyRU+gIMb/5aUuSYxbokJmldIl2JGe0ytMVRgZqATCXgBAt8/XA//WU4RB+dEdNtR7zjCWUeFQ5za1FQ/PKYXquD0Kk5vQlZ6dP34fgCLECrr0XqzEaQzCar9StVrTgH9KTOUf35HYhy1dNDpSBq0nrYh0hCuFG2d/tCLAEp3uXpA1WNT14SLPJboGY62EzFAdJn1nO2jj+xB3QpHg6aPCOeVPW9IcNMQjYUwAwxJCkzAY6pgEXrhVq/r1od7QCy+QjD1uZoNGNGUI7XtxvKZ5qGQC5B2CdRDmQGaD8Tla/7VacGrNGB/SPtKKD4cfUuOdPfL7se59QxM4oumtF5jCBZdmqRCuZuz4RoJ6fpQrHW13rrUDrnrbpFbHo3oJxA2yzrrHnC8V+9ZrWaG2adMZtUwpfGkOlz4sfSdvEc0UT/lDFlAkLeMxxyBLJhC5frvR3NfPmcN6zDQop5"

KEYCLOAK_URL="https://auth.plainledger.ca"
REALM="plainledger"
REALM_JSON="/Users/tony/stonyp90-websites/plainledger/keycloak/realms/plainledger-realm.json"

echo "=== Creating Authentication Resources ==="
echo ""

# Step 1: Import Keycloak realm (creates clients)
echo "1. Keycloak Realm & Clients"
echo "   The realm JSON defines all required clients."
echo "   To import:"
echo "   - Log into Keycloak Admin Console: $KEYCLOAK_URL/admin"
echo "   - Go to Realm Settings → Import"
echo "   - Upload: $REALM_JSON"
echo "   - Or manually create clients (see below)"
echo ""

# Step 2: Create clients via API if possible
ADMIN_PASS=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/keycloak/admin-password" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")

if [ -n "$ADMIN_PASS" ]; then
  TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" 2>/dev/null | jq -r '.access_token' 2>/dev/null)
  
  if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "   ✓ Admin token obtained"
    
    # Create plainledger-web client
    WEB_CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=plainledger-web" \
      -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
    
    if [ "$WEB_CLIENT" = "null" ] || [ -z "$WEB_CLIENT" ]; then
      echo "   Creating plainledger-web client..."
      curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "clientId": "plainledger-web",
          "name": "PlainLedger Web Application",
          "enabled": true,
          "publicClient": true,
          "standardFlowEnabled": true,
          "directAccessGrantsEnabled": true,
          "redirectUris": ["https://app.plainledger.ca/*", "https://plainledger.ca/*"],
          "webOrigins": ["https://app.plainledger.ca", "https://plainledger.ca", "+"]
        }' > /dev/null && echo "   ✓ Created plainledger-web" || echo "   ✗ Failed"
    else
      echo "   ✓ plainledger-web exists"
    fi
    
    # Create plainledger-api client
    API_CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=plainledger-api" \
      -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
    
    if [ "$API_CLIENT" = "null" ] || [ -z "$API_CLIENT" ]; then
      echo "   Creating plainledger-api client..."
      API_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "clientId": "plainledger-api",
          "name": "PlainLedger API Backend",
          "enabled": true,
          "publicClient": false,
          "standardFlowEnabled": true,
          "directAccessGrantsEnabled": true,
          "serviceAccountsEnabled": true,
          "redirectUris": ["https://api.plainledger.ca/*"],
          "webOrigins": ["https://api.plainledger.ca", "+"]
        }' 2>/dev/null)
      
      if [ -n "$API_RESPONSE" ]; then
        echo "   ✓ Created plainledger-api"
        echo "   ⚠ IMPORTANT: Get client secret from Keycloak Admin Console"
        echo "      Clients → plainledger-api → Credentials tab"
        echo "      Save to: plainledger/prod/keycloak-client secret"
      else
        echo "   ✗ Failed to create plainledger-api"
      fi
    else
      echo "   ✓ plainledger-api exists"
      # Check if secret is set
      CLIENT_ID=$(echo "$API_CLIENT" | jq -r '.id')
      CLIENT_SECRET=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_ID/client-secret" \
        -H "Authorization: Bearer $TOKEN" | jq -r '.value' 2>/dev/null)
      
      if [ "$CLIENT_SECRET" != "null" ] && [ -n "$CLIENT_SECRET" ]; then
        echo "   ✓ Client secret exists"
        # Update secret in AWS
        aws secretsmanager put-secret-value \
          --secret-id "plainledger/prod/keycloak-client" \
          --region ca-central-1 \
          --secret-string "{\"secret\":\"$CLIENT_SECRET\"}" \
          2>/dev/null && echo "   ✓ Updated AWS secret" || echo "   ⚠ Could not update AWS secret"
      else
        echo "   ⚠ Client secret not found - regenerate in Keycloak"
      fi
    fi
    
    # Create plainledger-admin client
    ADMIN_CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=plainledger-admin" \
      -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
    
    if [ "$ADMIN_CLIENT" = "null" ] || [ -z "$ADMIN_CLIENT" ]; then
      echo "   Creating plainledger-admin client..."
      curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "clientId": "plainledger-admin",
          "name": "PlainLedger Admin Console",
          "enabled": true,
          "publicClient": true,
          "standardFlowEnabled": true,
          "directAccessGrantsEnabled": true,
          "redirectUris": ["https://admin.plainledger.ca/*"],
          "webOrigins": ["https://admin.plainledger.ca", "+"]
        }' > /dev/null && echo "   ✓ Created plainledger-admin" || echo "   ✗ Failed"
    else
      echo "   ✓ plainledger-admin exists"
    fi
  else
    echo "   ⚠ Cannot access Keycloak Admin API"
    echo "   Create clients manually via Keycloak Admin Console"
  fi
fi

echo ""
echo "2. Database Tables"
echo "   TypeORM will create tables automatically on API startup if synchronize is enabled."
echo "   To verify tables exist, connect to database and run:"
echo ""
echo "   SELECT table_name FROM information_schema.tables"
echo "   WHERE table_schema = 'accounting'"
echo "   AND table_name IN ('user_profiles', 'organizations');"
echo ""
echo "   If tables don't exist, ensure API has started at least once,"
echo "   or run migrations manually."
echo ""

echo "3. Test User Creation"
echo "   Creating test user: test-user@plainledger.ca"
echo ""

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  # Check if user exists
  EXISTING_USER=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=test-user@plainledger.ca" \
    -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
  
  if [ "$EXISTING_USER" = "null" ] || [ -z "$EXISTING_USER" ]; then
    USER_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "test-user@plainledger.ca",
        "firstName": "Test",
        "lastName": "User",
        "enabled": true,
        "emailVerified": true,
        "attributes": {
          "organization": ["demo-org"]
        }
      }' 2>/dev/null)
    
    if [ -n "$USER_RESPONSE" ]; then
      USER_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=test-user@plainledger.ca" \
        -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id' 2>/dev/null)
      
      if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
        # Set password
        curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "type": "password",
            "value": "TestUser123!",
            "temporary": false
          }' > /dev/null
        
        echo "   ✓ Test user created"
        echo "   Email: test-user@plainledger.ca"
        echo "   Password: TestUser123!"
      fi
    else
      echo "   ✗ Failed to create user"
    fi
  else
    echo "   ✓ Test user already exists"
    USER_ID=$(echo "$EXISTING_USER" | jq -r '.id')
    # Reset password
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "type": "password",
        "value": "TestUser123!",
        "temporary": false
      }' > /dev/null
    echo "   Password reset: TestUser123!"
  fi
else
  echo "   ⚠ Cannot create user (no admin access)"
fi

echo ""
echo "=== Summary ==="
echo ""
echo "Next steps:"
echo "1. Verify Keycloak clients exist and are configured"
echo "2. Ensure plainledger-api client secret is saved to AWS Secrets Manager"
echo "3. Verify database tables exist (user_profiles, organizations)"
echo "4. Test login: https://app.plainledger.ca/login"
echo "   Email: test-user@plainledger.ca"
echo "   Password: TestUser123!"
echo ""
echo "Keycloak Admin: $KEYCLOAK_URL/admin"
