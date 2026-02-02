# QuickBooks Sandbox Setup Guide

**For:** Enterprise-Grade E2E Testing with Real QuickBooks Data

## Quick Start

### Step 1: Get Refresh Token from OAuth Playground

1. **Navigate to OAuth Playground**
   - URL: https://developer.intuit.com/app/developer/playground
   - Sign in: anthonypaquet1508@gmail.com

2. **Complete OAuth Flow**
   ```
   Workspace: [Select your workspace]
   App: ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to
   Scopes: com.intuit.quickbooks.accounting
   ```

3. **Get Authorization Code**
   - Click "Get authorization code"
   - Authorize with: **Sandbox Company_CA_1**
   - Copy the authorization code

4. **Exchange for Tokens**
   - Click "Get tokens"
   - Copy:
     - **Refresh Token** (long string)
     - **Realm ID** (numeric, e.g., `9341456072863003`)

### Step 2: Save Tokens

**Option A: Use Helper Script (Recommended)**
```bash
npx tsx scripts/get-quickbooks-tokens.ts
# Enter Realm ID and Refresh Token when prompted
```

**Option B: Manual Save**
```bash
# Add to .env.local
echo "QUICKBOOKS_REFRESH_TOKEN=your_refresh_token_here" >> .env.local
echo "QUICKBOOKS_REALM_ID=9341456072863003" >> .env.local
echo "QUICKBOOKS_CLIENT_ID=ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to" >> .env.local
echo "QUICKBOOKS_CLIENT_SECRET=DWyhuILmup8OWkeMRUoOhfZ44QYQdGKiNlmPS45z" >> .env.local
```

### Step 3: Sync QuickBooks Data to S3

```bash
# Load tokens from .env.local
export $(cat .env.local | grep QUICKBOOKS | xargs)

# Sync to S3 Gold layer
QUICKBOOKS_REFRESH_TOKEN=$QUICKBOOKS_REFRESH_TOKEN \
QUICKBOOKS_REALM_ID=$QUICKBOOKS_REALM_ID \
S3_ENDPOINT=http://localhost:4566 \
npx tsx scripts/sync-quickbooks-to-gold.ts
```

### Step 4: Verify Data

```bash
# Check S3 bucket
aws --endpoint-url http://localhost:4566 s3 ls s3://plainledger-gold/demo-org/ --recursive

# Test API endpoint
curl http://localhost:3000/api/v1/datalake/accounts?organizationId=demo-org
```

## Troubleshooting

### Authorization Code Expired

**Problem:** Authorization codes expire quickly (single-use, ~5 minutes)

**Solution:** Get a fresh authorization code from OAuth Playground

### Token Refresh Failed

**Problem:** Refresh token invalid or expired

**Solution:** 
1. Re-authorize in OAuth Playground
2. Get new refresh token
3. Update `.env.local`

### API Connection Failed

**Problem:** Cannot connect to QuickBooks API

**Check:**
- Refresh token is valid
- Realm ID matches sandbox company
- Network connectivity
- API endpoint: `https://sandbox-quickbooks.api.intuit.com`

## Current Credentials

- **Client ID:** `ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to`
- **Client Secret:** `DWyhuILmup8OWkeMRUoOhfZ44QYQdGKiNlmPS45z`
- **Realm ID:** `9341456072863003` (Sandbox Company_CA_1)
- **Sandbox URL:** https://sandbox-quickbooks.api.intuit.com

## Security Notes

- ✅ Tokens saved to `.env.local` (gitignored)
- ✅ Never commit tokens to git
- ✅ Refresh tokens rotate automatically
- ✅ Sandbox tokens only work with sandbox companies

## Next Steps After Setup

1. ✅ Sync QuickBooks data
2. ✅ Run E2E tests: `npm run test:e2e -- e2e/quickbooks-real-data.spec.ts`
3. ✅ Verify dashboard shows real data
4. ✅ Test all report sections
5. ✅ Validate data verification checklist (4/4)

---

**Last Updated:** 2026-02-02
