#!/bin/bash
# Complete authentication setup verification

set -e

export AWS_ACCESS_KEY_ID="ASIAWLC57O2SJIG7AB6W"
export AWS_SECRET_ACCESS_KEY="XM/Bm0dTt5h7pwxkCP3nXDUxytOZgg0DNpiW5SWW"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjELb//////////wEaCXVzLWVhc3QtMiJGMEQCIBYTHyfNKXouoQQFEIqKRHfojouNJQ4+KU1NkVmGrO9AAiAMKDtL/HXh3RmXgqrc7RRLWCYGRIOwtN5F3OG0opnIUCrpAgh/EAAaDDQzNjEzNjI3NzY2OCIMX/IfgPqsY4zQtMkCKsYCjjRjt3Vg97K7Zwu84G7g/8WKwc0Odr1cOw0OPpk0Dk8l8Tcn1aHdDYN0N8BOITSTeywt1eMHs62hnMGTt8NNlvcFh0H5CEZyGcRIRuvFVP5fBCxQcCPe83zTdhSSzQkCnqOhdwEDh25J59n2Au4px46UOvCjM1uieD9DsXBjHg2u7HremQ+1tSKEjY60i4l9ycuUL5OvG1NhyPyRU+gIMb/5aUuSYxbokJmldIl2JGe0ytMVRgZqATCXgBAt8/XA//WU4RB+dEdNtR7zjCWUeFQ5za1FQ/PKYXquD0Kk5vQlZ6dP34fgCLECrr0XqzEaQzCar9StVrTgH9KTOUf35HYhy1dNDpSBq0nrYh0hCuFG2d/tCLAEp3uXpA1WNT14SLPJboGY62EzFAdJn1nO2jj+xB3QpHg6aPCOeVPW9IcNMQjYUwAwxJCkzAY6pgEXrhVq/r1od7QCy+QjD1uZoNGNGUI7XtxvKZ5qGQC5B2CdRDmQGaD8Tla/7VacGrNGB/SPtKKD4cfUuOdPfL7se59QxM4oumtF5jCBZdmqRCuZuz4RoJ6fpQrHW13rrUDrnrbpFbHo3oJxA2yzrrHnC8V+9ZrWaG2adMZtUwpfGkOlz4sfSdvEc0UT/lDFlAkLeMxxyBLJhC5frvR3NfPmcN6zDQop5"

KEYCLOAK_URL="https://auth.plainledger.ca"
REALM="plainledger"
API_URL="https://api.plainledger.ca"

echo "=== Complete Authentication Setup Verification ==="
echo ""

# Get service account token
CLIENT_SECRET=$(aws secretsmanager get-secret-value --secret-id "plainledger/prod/keycloak-client" --region ca-central-1 --query 'SecretString' --output text | jq -r '.secret')
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=plainledger-api" \
  -d "client_secret=$CLIENT_SECRET" | jq -r '.access_token')

echo "1. Keycloak Clients:"
for CLIENT_ID in "plainledger-web" "plainledger-api" "plainledger-admin"; do
  CLIENT=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
  
  if [ "$CLIENT" != "null" ] && [ -n "$CLIENT" ]; then
    ENABLED=$(echo "$CLIENT" | jq -r '.enabled')
    DIRECT=$(echo "$CLIENT" | jq -r '.directAccessGrantsEnabled')
    echo "   ✓ $CLIENT_ID (Enabled: $ENABLED, Direct Access: $DIRECT)"
  else
    echo "   ✗ $CLIENT_ID MISSING"
  fi
done

echo ""
echo "2. Test Users:"
for EMAIL in "test-user@plainledger.ca" "test-admin@plainledger.ca"; do
  USER=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$EMAIL" \
    -H "Authorization: Bearer $TOKEN" | jq '.[0]' 2>/dev/null)
  
  if [ "$USER" != "null" ] && [ -n "$USER" ]; then
    ENABLED=$(echo "$USER" | jq -r '.enabled')
    VERIFIED=$(echo "$USER" | jq -r '.emailVerified')
    echo "   ✓ $EMAIL (Enabled: $ENABLED, Verified: $VERIFIED)"
  else
    echo "   ✗ $EMAIL MISSING"
  fi
done

echo ""
echo "3. API Endpoint Tests:"
# Test login
LOGIN_TEST=$(curl -s -m 10 -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-user@plainledger.ca","password":"TestUser123!"}' \
  -w "\n%{http_code}" 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$LOGIN_TEST" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Login endpoint: WORKING"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
  echo "   ⚠ Login endpoint: Responds but credentials issue (HTTP $HTTP_CODE)"
else
  echo "   ✗ Login endpoint: Not responding (HTTP $HTTP_CODE)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Test Credentials:"
echo "  Email: test-user@plainledger.ca"
echo "  Password: TestUser123!"
echo ""
echo "Login: https://app.plainledger.ca/login"
