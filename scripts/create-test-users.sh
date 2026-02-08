#!/bin/bash

# Create Production Test Users
# This script creates test users in production Keycloak and database

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="${KEYCLOAK_URL:-https://auth.plainledger.ca}"
REALM="${KEYCLOAK_REALM:-plainledger}"
API_URL="${API_URL:-https://api.plainledger.ca}"

# Default organization with real data
DEFAULT_ORG_ID="${DEFAULT_ORG_ID:-demo-org}"

echo -e "${BLUE}=== PlainLedger Test User Creator ===${NC}\n"

# Function to get Keycloak admin token
get_admin_token() {
  echo -e "${YELLOW}Getting Keycloak admin token...${NC}"
  
  # Try to get admin password from AWS Secrets Manager
  if command -v aws &> /dev/null; then
    ADMIN_PASS=$(aws secretsmanager get-secret-value \
      --secret-id "plainledger/prod/keycloak/admin-password" \
      --region ca-central-1 \
      --query 'SecretString' \
      --output text 2>/dev/null | jq -r '.password' 2>/dev/null || echo "")
  fi
  
  # If not from AWS, prompt for password
  if [ -z "$ADMIN_PASS" ]; then
    echo -e "${YELLOW}Enter Keycloak admin password:${NC}"
    read -s ADMIN_PASS
    echo
  fi
  
  TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | jq -r '.access_token' 2>/dev/null)
  
  if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get admin token${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ Admin token obtained${NC}\n"
  echo "$TOKEN"
}

# Function to create user in Keycloak
create_keycloak_user() {
  local email=$1
  local first_name=$2
  local last_name=$3
  local password=$4
  local org_id=$5
  local token=$6
  
  echo -e "${BLUE}Creating user in Keycloak: $email${NC}"
  
  # Check if user already exists
  EXISTING=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$email" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" | jq -r '.[0].id' 2>/dev/null)
  
  if [ "$EXISTING" != "null" ] && [ -n "$EXISTING" ]; then
    echo -e "${YELLOW}User already exists in Keycloak (ID: $EXISTING)${NC}"
    echo "$EXISTING"
    return
  fi
  
  # Create user
  USER_ID=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"firstName\": \"$first_name\",
      \"lastName\": \"$last_name\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"attributes\": {
        \"organization\": [\"$org_id\"]
      }
    }" | jq -r '.id' 2>/dev/null)
  
  if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
    echo -e "${RED}Failed to create user in Keycloak${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ User created in Keycloak (ID: $USER_ID)${NC}"
  
  # Set password
  if [ -n "$password" ]; then
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/reset-password" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"password\",
        \"value\": \"$password\",
        \"temporary\": false
      }" > /dev/null
    
    echo -e "${GREEN}✓ Password set${NC}"
  fi
  
  echo "$USER_ID"
}

# Function to create user via API (requires platform admin auth)
create_user_via_api() {
  local email=$1
  local first_name=$2
  local last_name=$3
  local org_id=$4
  local api_token=$5
  
  echo -e "${BLUE}Creating user via API: $email${NC}"
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/admin/users" \
    -H "Authorization: Bearer $api_token" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$email\",
      \"firstName\": \"$first_name\",
      \"lastName\": \"$last_name\",
      \"organizationId\": \"$org_id\",
      \"sendInvite\": false
    }")
  
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
}

# Main function
main() {
  echo -e "${YELLOW}Choose creation method:${NC}"
  echo "1) Keycloak only (manual DB setup needed)"
  echo "2) Via Admin API (requires platform admin token)"
  echo "3) Interactive (prompt for details)"
  read -p "Enter choice [1-3]: " METHOD
  
  case $METHOD in
    1)
      TOKEN=$(get_admin_token)
      
      read -p "Email: " EMAIL
      read -p "First Name: " FIRST_NAME
      read -p "Last Name: " LAST_NAME
      read -p "Organization ID [$DEFAULT_ORG_ID]: " ORG_ID
      ORG_ID=${ORG_ID:-$DEFAULT_ORG_ID}
      read -p "Password: " -s PASSWORD
      echo
      
      USER_ID=$(create_keycloak_user "$EMAIL" "$FIRST_NAME" "$LAST_NAME" "$PASSWORD" "$ORG_ID" "$TOKEN")
      
      echo -e "\n${GREEN}=== User Created ===${NC}"
      echo "Email: $EMAIL"
      echo "Keycloak ID: $USER_ID"
      echo "Organization: $ORG_ID"
      echo -e "\n${YELLOW}Note: You may need to create user profile in database manually${NC}"
      ;;
      
    2)
      read -p "Platform Admin API Token: " API_TOKEN
      read -p "Email: " EMAIL
      read -p "First Name: " FIRST_NAME
      read -p "Last Name: " LAST_NAME
      read -p "Organization ID [$DEFAULT_ORG_ID]: " ORG_ID
      ORG_ID=${ORG_ID:-$DEFAULT_ORG_ID}
      
      create_user_via_api "$EMAIL" "$FIRST_NAME" "$LAST_NAME" "$ORG_ID" "$API_TOKEN"
      ;;
      
    3)
      TOKEN=$(get_admin_token)
      
      echo -e "\n${BLUE}Creating test user...${NC}"
      read -p "Email: " EMAIL
      read -p "First Name: " FIRST_NAME
      read -p "Last Name: " LAST_NAME
      read -p "Organization ID [$DEFAULT_ORG_ID]: " ORG_ID
      ORG_ID=${ORG_ID:-$DEFAULT_ORG_ID}
      read -p "Password: " -s PASSWORD
      echo
      
      USER_ID=$(create_keycloak_user "$EMAIL" "$FIRST_NAME" "$LAST_NAME" "$PASSWORD" "$ORG_ID" "$TOKEN")
      
      echo -e "\n${GREEN}=== User Created Successfully ===${NC}"
      echo "Email: $EMAIL"
      echo "Name: $FIRST_NAME $LAST_NAME"
      echo "Keycloak ID: $USER_ID"
      echo "Organization: $ORG_ID"
      echo "Password: [set]"
      echo -e "\n${BLUE}Login URL: https://app.plainledger.ca${NC}"
      ;;
      
    *)
      echo -e "${RED}Invalid choice${NC}"
      exit 1
      ;;
  esac
}

# Run main function
main
