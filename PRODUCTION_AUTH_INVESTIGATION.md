# Production Authentication Investigation

## Issue Summary
User login is not working in production. This document outlines all potential issues and fixes.

## Authentication Flow

```
Frontend (Login.tsx) 
  → POST /api/auth/login {email, password}
  → Backend (auth.controller.ts)
  → Keycloak Token Endpoint (Direct Access Grants)
  → Returns tokens
  → Frontend stores tokens
  → Keycloak Provider initializes with tokens
```

## Potential Issues Found

### 1. KEYCLOAK_CLIENT_SECRET Missing or Incorrect (CRITICAL)

**Location:** `apps/api/src/infrastructure/http/controllers/auth.controller.ts:186-195`

**Issue:** The login endpoint requires `KEYCLOAK_CLIENT_SECRET` environment variable. If missing or incorrect, login will fail.

**Check:**
- Verify `KEYCLOAK_CLIENT_SECRET` is set in ECS task definition
- Verify it matches the secret in Keycloak Admin Console for `plainledger-api` client
- Check CloudWatch logs for: "Keycloak client secret not configured"

**Fix:** Ensure Terraform sets the secret correctly from AWS Secrets Manager.

### 2. Keycloak Users Don't Exist in Production (CRITICAL)

**Location:** `keycloak/Dockerfile:42` - Realm import only happens if realm doesn't exist

**Issue:** If the Keycloak realm already existed before deployment, the users from `plainledger-realm.json` won't be imported.

**Check:**
- Log into Keycloak Admin Console: `https://auth.plainledger.ca`
- Check if users exist: `admin@plainledger.ca`, `accountant@plainledger.ca`, `demo@plainledger.ca`
- Check if realm `plainledger` exists

**Fix Options:**
- Manually create users in Keycloak Admin Console
- Or delete realm and redeploy (will recreate with users)
- Or use Keycloak Admin API to create users programmatically

### 3. Keycloak URL Configuration Mismatch

**Frontend:** `VITE_KEYCLOAK_URL=https://auth.plainledger.ca` (terraform line 602)
**Backend:** `KEYCLOAK_URL=https://auth.plainledger.ca` (terraform line 655)

**Check:** Verify both are set correctly and Keycloak is accessible at that URL.

### 4. Keycloak Client Configuration Issues

**Location:** `keycloak/realms/plainledger-realm.json`

**Issues to check:**
- `plainledger-api` client must have `directAccessGrantsEnabled: true` (line 175)
- `plainledger-api` client secret must match `KEYCLOAK_CLIENT_SECRET`
- `plainledger-web` client must have correct `redirectUris` and `webOrigins` (lines 117-141)

**Check:** Verify in Keycloak Admin Console:
- Client `plainledger-api`: Direct Access Grants enabled
- Client `plainledger-web`: Redirect URIs include production domains

### 5. CORS Issues

**Potential:** Keycloak might not allow requests from `https://plainledger.ca`

**Check:** Browser console for CORS errors when accessing Keycloak

**Fix:** Ensure Keycloak realm has correct web origins configured

### 6. Silent Check SSO File Missing

**Location:** `apps/web/public/silent-check-sso.html`

**Issue:** If this file isn't deployed, silent SSO check will fail

**Check:** Verify file exists at `https://plainledger.ca/silent-check-sso.html`

### 7. Token Storage Key Mismatch (ALREADY FIXED)

**Status:** Fixed in previous commits - all files now use `kc_token`

## Diagnostic Steps

### Step 1: Check Keycloak Availability
```bash
curl https://auth.plainledger.ca/health
curl https://auth.plainledger.ca/realms/plainledger/.well-known/openid-configuration
```

### Step 2: Check API Logs
```bash
# Check CloudWatch logs for API service
# Look for:
# - "Keycloak client secret not configured"
# - "Login failed for"
# - "Authentication is temporarily unavailable"
```

### Step 3: Test Login Endpoint Directly
```bash
curl -X POST https://plainledger.ca/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plainledger.ca","password":"AdminPass123!@#"}'
```

### Step 4: Verify Keycloak Admin Console
1. Go to `https://auth.plainledger.ca`
2. Login with admin credentials
3. Check realm `plainledger` exists
4. Check users exist
5. Check client `plainledger-api` configuration
6. Check client `plainledger-web` configuration

## Most Likely Issues

Based on code analysis, the most likely issues are:

1. **KEYCLOAK_CLIENT_SECRET not set or incorrect** (HIGHEST PRIORITY)
   - Terraform variable `keycloak_client_secret` must be set correctly
   - Secret is stored in AWS Secrets Manager: `plainledger/prod/keycloak-client`
   - Secret must match the client secret in Keycloak Admin Console for `plainledger-api` client
   - If wrong, login will fail with "Invalid credentials" from Keycloak

2. **Users don't exist in production Keycloak** (HIGH PRIORITY)
   - Realm import only happens if realm doesn't exist (Dockerfile line 42)
   - If realm existed before deployment, users won't be imported
   - Users defined in `keycloak/realms/plainledger-realm.json:250-313` won't exist

3. **Keycloak client configuration incorrect**
   - `plainledger-api` client must have `directAccessGrantsEnabled: true`
   - Client secret must match what's in AWS Secrets Manager

## Root Cause Analysis

### Issue 1: KEYCLOAK_CLIENT_SECRET

**Code Flow:**
1. Terraform variable `keycloak_client_secret` → AWS Secrets Manager
2. ECS task definition reads from Secrets Manager → `KEYCLOAK_CLIENT_SECRET` env var
3. API uses this secret to authenticate with Keycloak token endpoint

**Failure Points:**
- Variable not set in `terraform.tfvars` or `terraform.tfvars.example`
- Secret value doesn't match Keycloak client secret
- Secret ARN not passed to ECS module (but code shows it is passed)

**Check:**
```bash
# Check if secret exists
aws secretsmanager get-secret-value --secret-id plainledger/prod/keycloak-client

# Check ECS task definition
aws ecs describe-task-definition --task-definition plainledger-prod-api --query 'taskDefinition.containerDefinitions[0].secrets'
```

### Issue 2: Users Don't Exist

**Problem:** Keycloak Dockerfile uses `--import-realm` which only imports if realm doesn't exist.

**Solution Options:**
1. **Manual creation** (quickest): Create users via Keycloak Admin Console
2. **Realm reset**: Delete realm, redeploy (will recreate with users)
3. **Programmatic**: Use Keycloak Admin API to create users

## Immediate Actions Needed

### Priority 1: Verify KEYCLOAK_CLIENT_SECRET
1. Check Terraform variables: `terraform/environments/prod/terraform.tfvars`
2. Verify secret in AWS Secrets Manager matches Keycloak client secret
3. Check CloudWatch logs for: "Keycloak client secret not configured" or "Invalid client credentials"

### Priority 2: Verify Users Exist
1. Log into Keycloak Admin Console: `https://auth.plainledger.ca`
2. Navigate to: Realm `plainledger` → Users
3. Check if these users exist:
   - `admin@plainledger.ca`
   - `accountant@plainledger.ca`
   - `demo@plainledger.ca`

### Priority 3: Test Login Endpoint
```bash
# Test with admin user
curl -X POST https://plainledger.ca/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plainledger.ca","password":"AdminPass123!@#"}'

# Expected: 200 OK with accessToken
# If 401: Check Keycloak client secret
# If 500: Check CloudWatch logs
```

### Priority 4: Check Browser Console
- Open browser DevTools → Network tab
- Try to login
- Look for:
  - CORS errors
  - 401 Unauthorized on `/api/auth/login`
  - 400 Bad Request (might be Keycloak rejecting request)

## Files to Check

- `terraform/modules/ecs/main.tf:710-714` - KEYCLOAK_CLIENT_SECRET configuration
- `terraform/environments/prod/main.tf:272-283` - Keycloak secret creation
- `terraform/environments/prod/terraform.tfvars` - **MUST contain `keycloak_client_secret`**
- `keycloak/Dockerfile:42` - Realm import command
- `apps/api/src/infrastructure/http/controllers/auth.controller.ts:186-195` - Secret check

## CRITICAL FINDING

**The `keycloak_client_secret` variable was missing from `terraform.tfvars.example`!**

This means:
1. The variable might not be set in production `terraform.tfvars`
2. If not set, Terraform will fail OR use empty string
3. Empty secret → AWS Secrets Manager has wrong value → Login fails

**Action Required:**
1. Check if `terraform/environments/prod/terraform.tfvars` has `keycloak_client_secret`
2. If missing, add it with the correct value from Keycloak Admin Console
3. Run `terraform apply` to update AWS Secrets Manager
4. Restart ECS API service to pick up new secret

## Diagnostic Tools Created

### 1. Diagnostic Script
Run: `./scripts/diagnose-production-auth.sh [domain]`

This script checks:
- Keycloak health
- Realm configuration
- API login endpoint
- Silent check SSO file
- GraphQL endpoint

### 2. User Creation Script
Run: `npx tsx scripts/create-keycloak-users.ts`

This script creates test users in Keycloak if they don't exist.

**Environment variables needed:**
```bash
export KEYCLOAK_URL=https://auth.plainledger.ca
export KEYCLOAK_REALM=plainledger
export KEYCLOAK_ADMIN_USER=admin
export KEYCLOAK_ADMIN_PASSWORD=<admin-password>
```

## Quick Fix Checklist

- [ ] Verify `keycloak_client_secret` is set in `terraform/environments/prod/terraform.tfvars`
- [ ] Get client secret from Keycloak Admin Console (Clients → plainledger-api → Credentials)
- [ ] Run `terraform apply` to update AWS Secrets Manager
- [ ] Restart ECS API service: `aws ecs update-service --cluster plainledger-prod --service plainledger-prod-api --force-new-deployment`
- [ ] Run diagnostic script: `./scripts/diagnose-production-auth.sh`
- [ ] Check if users exist in Keycloak Admin Console
- [ ] If users don't exist, run: `npx tsx scripts/create-keycloak-users.ts`
- [ ] Test login with: `curl -X POST https://plainledger.ca/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@plainledger.ca","password":"AdminPass123!@#"}'`
