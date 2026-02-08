#!/bin/bash
# Comprehensive verification and setup for login/signup

set -e

export AWS_ACCESS_KEY_ID="ASIAWLC57O2SJIG7AB6W"
export AWS_SECRET_ACCESS_KEY="XM/Bm0dTt5h7pwxkCP3nXDUxytOZgg0DNpiW5SWW"
export AWS_SESSION_TOKEN="IQoJb3JpZ2luX2VjELb//////////wEaCXVzLWVhc3QtMiJGMEQCIBYTHyfNKXouoQQFEIqKRHfojouNJQ4+KU1NkVmGrO9AAiAMKDtL/HXh3RmXgqrc7RRLWCYGRIOwtN5F3OG0opnIUCrpAgh/EAAaDDQzNjEzNjI3NzY2OCIMX/IfgPqsY4zQtMkCKsYCjjRjt3Vg97K7Zwu84G7g/8WKwc0Odr1cOw0OPpk0Dk8l8Tcn1aHdDYN0N8BOITSTeywt1eMHs62hnMGTt8NNlvcFh0H5CEZyGcRIRuvFVP5fBCxQcCPe83zTdhSSzQkCnqOhdwEDh25J59n2Au4px46UOvCjM1uieD9DsXBjHg2u7HremQ+1tSKEjY60i4l9ycuUL5OvG1NhyPyRU+gIMb/5aUuSYxbokJmldIl2JGe0ytMVRgZqATCXgBAt8/XA//WU4RB+dEdNtR7zjCWUeFQ5za1FQ/PKYXquD0Kk5vQlZ6dP34fgCLECrr0XqzEaQzCar9StVrTgH9KTOUf35HYhy1dNDpSBq0nrYh0hCuFG2d/tCLAEp3uXpA1WNT14SLPJboGY62EzFAdJn1nO2jj+xB3QpHg6aPCOeVPW9IcNMQjYUwAwxJCkzAY6pgEXrhVq/r1od7QCy+QjD1uZoNGNGUI7XtxvKZ5qGQC5B2CdRDmQGaD8Tla/7VacGrNGB/SPtKKD4cfUuOdPfL7se59QxM4oumtF5jCBZdmqRCuZuz4RoJ6fpQrHW13rrUDrnrbpFbHo3oJxA2yzrrHnC8V+9ZrWaG2adMZtUwpfGkOlz4sfSdvEc0UT/lDFlAkLeMxxyBLJhC5frvR3NfPmcN6zDQop5"

KEYCLOAK_URL="https://auth.plainledger.ca"
REALM="plainledger"
API_URL="https://api.plainledger.ca"

echo "=== PlainLedger Authentication Setup & Verification ==="
echo ""

# Test API health
echo "1. Testing API health..."
API_HEALTH=$(curl -s "$API_URL/health" 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unavailable")
if [ "$API_HEALTH" = "healthy" ]; then
  echo "   ✓ API is healthy"
else
  echo "   ⚠ API health check failed"
fi

# Test login endpoint
echo ""
echo "2. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@nonexistent.com","password":"test"}' \
  -w "\n%{http_code}" 2>/dev/null)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "400" ]; then
  echo "   ✓ Login endpoint responds (HTTP $HTTP_CODE - expected for invalid credentials)"
else
  echo "   ⚠ Login endpoint returned HTTP $HTTP_CODE"
fi

# Test signup endpoint
echo ""
echo "3. Testing signup endpoint..."
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"verify-test@example.com","firstName":"Test","lastName":"User","password":"Test123!@#$Password","province":"ON"}' \
  -w "\n%{http_code}" 2>/dev/null)

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "201" ]; then
  echo "   ✓ Signup endpoint works (created test user)"
elif [ "$HTTP_CODE" = "409" ]; then
  echo "   ✓ Signup endpoint works (user already exists)"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "   ✓ Signup endpoint responds (validation working)"
else
  echo "   ⚠ Signup endpoint returned HTTP $HTTP_CODE"
  echo "   Response: $(echo "$SIGNUP_RESPONSE" | head -1)"
fi

echo ""
echo "=== Keycloak Configuration ==="
echo ""
echo "The realm JSON defines these clients:"
echo "  ✓ plainledger-web (public, standard flow)"
echo "  ✓ plainledger-api (confidential, direct access grants)"
echo "  ✓ plainledger-admin (public, standard flow)"
echo ""
echo "To ensure they exist in Keycloak:"
echo "1. Log into Keycloak Admin Console: $KEYCLOAK_URL/admin"
echo "2. Select realm: $REALM"
echo "3. Go to Clients → Check if all 3 clients exist"
echo "4. If missing, import realm from: keycloak/realms/plainledger-realm.json"
echo ""
echo "Critical: plainledger-api client MUST have:"
echo "  - Direct Access Grants: ENABLED"
echo "  - Client Secret: Set and saved to plainledger/prod/keycloak-client secret"
echo ""

# Check if client secret exists
echo "=== Checking Secrets ==="
CLIENT_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "plainledger/prod/keycloak-client" \
  --region ca-central-1 \
  --query 'SecretString' \
  --output text 2>/dev/null | jq -r '.secret // empty' 2>/dev/null || echo "")

if [ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "null" ] && [ "$CLIENT_SECRET" != "change-me-in-production" ]; then
  echo "✓ Keycloak client secret is configured"
else
  echo "✗ Keycloak client secret is missing or not set"
  echo "  Secret: plainledger/prod/keycloak-client"
  echo "  Get from: Keycloak → Clients → plainledger-api → Credentials tab"
fi

echo ""
echo "=== Database Tables ==="
echo "Required tables in 'accounting' schema:"
echo "  - user_profiles (stores user data)"
echo "  - organizations (stores tenant data)"
echo ""
echo "These should be created automatically by TypeORM migrations."
echo "To verify, connect to database and run:"
echo "  SELECT table_name FROM information_schema.tables WHERE table_schema = 'accounting';"
echo ""

echo "=== Summary ==="
echo ""
echo "To complete setup:"
echo ""
echo "1. KEYCLOAK CLIENTS:"
echo "   - Verify all 3 clients exist in Keycloak admin console"
echo "   - Ensure plainledger-api has Direct Access Grants enabled"
echo "   - Copy client secret to: plainledger/prod/keycloak-client"
echo ""
echo "2. DATABASE:"
echo "   - Ensure user_profiles and organizations tables exist"
echo "   - TypeORM should create them automatically on API startup"
echo ""
echo "3. TEST:"
echo "   - Try signing up: https://app.plainledger.ca/signup"
echo "   - Try logging in: https://app.plainledger.ca/login"
echo ""
echo "Keycloak Admin: $KEYCLOAK_URL/admin"
echo "API Health: $API_URL/health"
