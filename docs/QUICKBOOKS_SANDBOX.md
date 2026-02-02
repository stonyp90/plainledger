# QuickBooks Sandbox Configuration

## Current Setup

**Current Sandbox:** US Sandbox (`Sandbox Company_US_1`)
- **Realm ID:** `9341456072863003`
- **Country:** US
- **API URL:** `https://sandbox-quickbooks.api.intuit.com/v3/company`

## Switching to Canadian Sandbox

For Canadian market testing, use the Canadian sandbox company:

### Steps to Switch:

1. **Get Canadian Sandbox Credentials:**
   ```bash
   # Go to Intuit Developer Portal OAuth Playground
   # https://developer.intuit.com/app/developer/playground
   
   # Authorize with "Sandbox Company_CA_1" (not "Sandbox Company_US_1")
   # Copy the Realm ID from the OAuth callback
   ```

2. **Update Environment Variables:**
   ```bash
   # In .env or .env.local
   QUICKBOOKS_REALM_ID=<canadian_realm_id>
   ```

3. **Update Scripts:**
   ```bash
   # Update populate script
   python3 scripts/populate-quickbooks-industries.py \
       --refresh-token="RT1-xxx" \
       --realm-id="<canadian_realm_id>" \
       --industries all
   
   # Update pipeline script
   python3 scripts/run-production-pipeline.py \
       --refresh-token="RT1-xxx" \
       --realm-id="<canadian_realm_id>" \
       --organization-id="demo-org"
   ```

## Important Notes

- **API URL is the same** for both US and CA sandboxes
- **Only the Realm ID differs** between sandbox companies
- **Currency and tax settings** will differ (USD vs CAD, US tax vs GST/HST)
- **Account types** may have country-specific variations

## Verification

Check which sandbox you're using:

```bash
python3 -c "
import asyncio
import httpx
import os

async def check():
    client_id = os.getenv('QUICKBOOKS_CLIENT_ID')
    client_secret = os.getenv('QUICKBOOKS_CLIENT_SECRET')
    refresh_token = os.getenv('QUICKBOOKS_REFRESH_TOKEN')
    realm_id = os.getenv('QUICKBOOKS_REALM_ID', '9341456072863003')
    
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            data={'grant_type': 'refresh_token', 'refresh_token': refresh_token},
            auth=(client_id, client_secret),
        )
        access_token = token_resp.json()['access_token']
        
        headers = {'Authorization': f'Bearer {access_token}'}
        company_resp = await client.get(
            f'https://sandbox-quickbooks.api.intuit.com/v3/company/{realm_id}/companyinfo/{realm_id}',
            headers=headers,
        )
        company = company_resp.json().get('CompanyInfo', {})
        print(f'Sandbox: {company.get(\"CompanyName\")}')
        print(f'Country: {company.get(\"Country\")}')
        print(f'Realm ID: {realm_id}')

asyncio.run(check())
"
```

## GitHub Actions

Update GitHub Secrets with Canadian sandbox credentials:
- `QUICKBOOKS_REALM_ID` → Canadian Realm ID
- `QUICKBOOKS_REFRESH_TOKEN` → Token for Canadian sandbox
