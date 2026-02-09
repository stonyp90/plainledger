# Create Admin User: tony@plainledger.ca

## ✅ Keycloak User Status
- **Email**: tony@plainledger.ca
- **Password**: S00leils!!!!
- **Keycloak ID**: `6840364a-e6d1-4561-ba42-e9971e041443`
- **Status**: ✓ User exists in Keycloak

## 📝 Database Setup Required

The user needs to be added to the `admin_users` table in PostgreSQL.

### Option 1: AWS RDS Query Editor (Recommended - Easiest)

1. Go to AWS Console → RDS → Query Editor
2. Connect to database: `plainledger-prod-postgres`
3. Copy and paste the SQL from `scripts/create-admin-tony.sql`
4. Execute the SQL

### Option 2: Manual SQL Execution

If you have direct database access (via VPN, bastion, or ECS task):

```bash
# Get database password
export PGPASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id plainledger/prod/db-credentials \
  --region ca-central-1 \
  --query SecretString --output text | jq -r '.password')

# Run SQL script
psql -h plainledger-prod-postgres.cjaogo4qysce.ca-central-1.rds.amazonaws.com \
  -U plainledger_admin \
  -d plainledger \
  -f scripts/create-admin-tony.sql
```

### Option 3: Lambda Function

Deploy `scripts/create-admin-lambda.js` to AWS Lambda with:
- VPC access to RDS
- Secrets Manager read permissions
- Invoke the function to create the admin user

## 🔐 Security Notes

- Only users in `admin_users` table can access admin panel
- New signups will NOT have admin access automatically
- All admin endpoints are protected by `PlatformAdminGuard`
- The user will be assigned to `super-admin` group with tier level 10

## 📋 SQL Script Contents

The SQL script (`scripts/create-admin-tony.sql`) will:
1. Create `super-admin` group if it doesn't exist
2. Create admin user record in `platform.admin_users` table
3. Assign user to `super-admin` group
4. Verify the setup with a SELECT query
