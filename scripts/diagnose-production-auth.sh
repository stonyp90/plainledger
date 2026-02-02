#!/bin/bash
# Production Authentication Diagnostic Script
# Run this to check all authentication-related issues

set -e

echo "=========================================="
echo "PlainLedger Production Auth Diagnostics"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if domain is provided
DOMAIN="${1:-plainledger.ca}"
KEYCLOAK_URL="https://auth.${DOMAIN}"
API_URL="https://${DOMAIN}"

echo "Checking Keycloak availability..."
echo "URL: ${KEYCLOAK_URL}"
echo ""

# Test 1: Keycloak Health Check
echo "1. Testing Keycloak health endpoint..."
if curl -sf "${KEYCLOAK_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Keycloak is accessible${NC}"
else
    echo -e "${RED}✗ Keycloak is NOT accessible${NC}"
    echo "   Check: Is Keycloak service running? Is DNS configured?"
fi
echo ""

# Test 2: Keycloak Realm Configuration
echo "2. Testing Keycloak realm configuration..."
if curl -sf "${KEYCLOAK_URL}/realms/plainledger/.well-known/openid-configuration" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Realm 'plainledger' exists${NC}"
    REALM_INFO=$(curl -sf "${KEYCLOAK_URL}/realms/plainledger/.well-known/openid-configuration" | jq -r '.issuer' 2>/dev/null || echo "")
    if [ ! -z "$REALM_INFO" ]; then
        echo "   Realm issuer: $REALM_INFO"
    fi
else
    echo -e "${RED}✗ Realm 'plainledger' NOT found${NC}"
    echo "   Action: Check if realm was imported correctly"
fi
echo ""

# Test 3: API Login Endpoint
echo "3. Testing API login endpoint..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>&1)
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ Login endpoint is accessible (401 expected for invalid credentials)${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" == "500" ]; then
    echo -e "${RED}✗ Login endpoint returned 500 (server error)${NC}"
    echo "   Response: $BODY"
    echo "   Action: Check CloudWatch logs for API service"
elif [ "$HTTP_CODE" == "400" ]; then
    echo -e "${YELLOW}⚠ Login endpoint returned 400 (bad request)${NC}"
    echo "   Response: $BODY"
    echo "   Action: Check if KEYCLOAK_CLIENT_SECRET is configured"
else
    echo -e "${YELLOW}⚠ Unexpected response code: $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: Check if silent-check-sso.html exists
echo "4. Testing silent-check-sso.html..."
if curl -sf "${API_URL}/silent-check-sso.html" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ silent-check-sso.html is accessible${NC}"
else
    echo -e "${RED}✗ silent-check-sso.html NOT found${NC}"
    echo "   Action: Ensure file is deployed in web container"
fi
echo ""

# Test 5: Check GraphQL endpoint
echo "5. Testing GraphQL endpoint..."
GRAPHQL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/graphql" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __typename }"}' 2>&1)
GRAPHQL_CODE=$(echo "$GRAPHQL_RESPONSE" | tail -n1)

if [ "$GRAPHQL_CODE" == "200" ] || [ "$GRAPHQL_CODE" == "400" ]; then
    echo -e "${GREEN}✓ GraphQL endpoint is accessible (${GRAPHQL_CODE})${NC}"
else
    echo -e "${RED}✗ GraphQL endpoint returned ${GRAPHQL_CODE}${NC}"
fi
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Check CloudWatch logs for API service:"
echo "   aws logs tail /aws/ecs/plainledger-prod/api --follow"
echo ""
echo "2. Verify KEYCLOAK_CLIENT_SECRET in AWS Secrets Manager:"
echo "   aws secretsmanager get-secret-value --secret-id plainledger/prod/keycloak-client"
echo ""
echo "3. Log into Keycloak Admin Console:"
echo "   ${KEYCLOAK_URL}"
echo "   Check if users exist: admin@plainledger.ca, accountant@plainledger.ca, demo@plainledger.ca"
echo ""
echo "4. Test login with valid credentials:"
echo "   curl -X POST ${API_URL}/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"admin@plainledger.ca\",\"password\":\"AdminPass123!@#\"}'"
echo ""
