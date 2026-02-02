-- =============================================================================
-- Configure Demo Accounts with QuickBooks US Sandbox
-- =============================================================================
-- Run this migration to configure @plainledger.ca demo accounts to use
-- QuickBooks US Sandbox by default.
--
-- QuickBooks US Sandbox Details:
-- - Realm ID: 9341456072863003
-- - Company: Sandbox Company_US_1
-- - API URL: https://sandbox-quickbooks.api.intuit.com/v3/company
-- =============================================================================

-- Update or insert QuickBooks sandbox connection for demo-org
INSERT INTO datasource_connections (
    organization_id,
    provider_id,
    name,
    company_name,
    realm_id,
    status,
    last_sync_at,
    last_sync_status,
    accounts_count,
    contacts_count,
    transactions_count,
    auto_sync_enabled,
    sync_frequency,
    sync_time_utc,
    sync_to_datalake,
    sync_entities,
    sync_date_range_days,
    next_scheduled_sync_at
)
SELECT 
    o.id,
    'quickbooks',
    'QuickBooks US Sandbox',
    'Sandbox Company_US_1',
    '9341456072863003',  -- QuickBooks US Sandbox Realm ID
    'connected',
    NOW(),
    'pending',
    0,
    0,
    0,
    true,  -- auto_sync_enabled
    'daily',  -- sync_frequency
    '09:00:00',  -- sync_time_utc (4 AM EST)
    true,  -- sync_to_datalake
    ARRAY['accounts', 'customers', 'vendors', 'invoices', 'journal_entries'],
    365,  -- sync_date_range_days
    (CURRENT_DATE + 1 + TIME '09:00:00')::TIMESTAMP WITH TIME ZONE
FROM accounting.organizations o
WHERE o.tenant_id = 'demo-org'
ON CONFLICT (organization_id, provider_id, realm_id) 
DO UPDATE SET
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    status = 'connected',
    auto_sync_enabled = true,
    sync_to_datalake = true,
    updated_at = NOW();

-- Insert for other demo organizations if they exist
INSERT INTO datasource_connections (
    organization_id,
    provider_id,
    name,
    company_name,
    realm_id,
    status,
    auto_sync_enabled,
    sync_frequency,
    sync_to_datalake
)
SELECT 
    o.id,
    'quickbooks',
    'QuickBooks US Sandbox',
    'Sandbox Company_US_1',
    '9341456072863003',
    'connected',
    true,
    'daily',
    true
FROM accounting.organizations o
WHERE o.tenant_id IN ('test-org-free', 'test-org-001', 'test-org-enterprise')
ON CONFLICT (organization_id, provider_id, realm_id) DO NOTHING;

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'QuickBooks Sandbox configured for demo accounts';
    RAISE NOTICE 'Realm ID: 9341456072863003';
    RAISE NOTICE 'To complete setup, add QUICKBOOKS_SANDBOX_REFRESH_TOKEN to GitHub secrets';
END $$;
