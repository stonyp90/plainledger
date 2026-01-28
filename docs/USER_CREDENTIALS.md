# PlainLedger User Credentials Matrix

## Keycloak Users

| Email | Password | Roles | Groups | QuickBooks Environment | Organization |
|-------|----------|-------|--------|----------------------|--------------|
| `admin@plainledger.ca` | `AdminPass123!@#` | admin, owner | Administrators | **SANDBOX** | demo-org |
| `accountant@plainledger.ca` | `Accountant123!@#` | accountant | Accountants | **SANDBOX** | demo-org |
| `demo@plainledger.ca` | `DemoPass123!@#` | viewer | Viewers | **SANDBOX** | demo-org |

## QuickBooks Configuration

### Environment Settings
- **Default Environment**: `production` (set in `QUICKBOOKS_ENVIRONMENT`)
- **Sandbox Users**: The three default users above will override to use **sandbox**
- **Production Users**: All other users will use **production**

### QuickBooks Sandbox
- **Sandbox Realm ID**: `9341456246487117`
- **Sandbox API URL**: `https://sandbox-quickbooks.api.intuit.com/v3/company`
- **Production API URL**: `https://quickbooks.api.intuit.com/v3/company`

### QuickBooks Credentials
- **Client ID**: Set in `QUICKBOOKS_CLIENT_ID` environment variable
- **Client Secret**: Set in `QUICKBOOKS_CLIENT_SECRET` environment variable
- **Redirect URI**: `http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback`

## Keycloak Configuration

- **URL**: `http://localhost:8080`
- **Realm**: `plainledger`
- **API Client ID**: `plainledger-api`
- **API Client Secret**: `change-me-in-production` (⚠️ Change in production!)
- **Web Client ID**: `plainledger-web`

## Environment Behavior

### Sandbox Users (Demo Accounts)
These users will **always** use QuickBooks **sandbox** environment:
- ✅ `admin@plainledger.ca`
- ✅ `accountant@plainledger.ca`
- ✅ `demo@plainledger.ca`

### Production Users
All other users will use QuickBooks **production** environment:
- Any user not in the sandbox users list
- New users created through registration
- External users

## Quick Reference

```bash
# Login as Admin
Email: admin@plainledger.ca
Password: AdminPass123!@#

# Login as Accountant
Email: accountant@plainledger.ca
Password: Accountant123!@#

# Login as Demo User
Email: demo@plainledger.ca
Password: DemoPass123!@#
```

## Notes

⚠️ **Security Warning**: 
- Default passwords should be changed in production
- Keycloak client secret should be changed from `change-me-in-production`
- QuickBooks credentials should be stored securely (not in code)

📝 **Environment Logic**:
- The system checks the user's email from the Keycloak token
- If email matches one of the three demo users → uses **sandbox**
- Otherwise → uses **production**
- This is handled in `quickbooks-environment.util.ts`
