-- =============================================================================
-- Integration Providers Schema
-- =============================================================================
-- Allows dynamic configuration of accounting software integrations
-- without code changes or deployments.

-- Provider configurations (QuickBooks, Xero, Sage, etc.)
CREATE TABLE IF NOT EXISTS integration_providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),
    description TEXT,
    description_fr TEXT,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    documentation_url VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'accounting',
    
    -- OAuth Configuration (JSON)
    oauth_config JSONB NOT NULL,
    -- Example:
    -- {
    --   "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2",
    --   "tokenUrl": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    --   "scopes": ["com.intuit.quickbooks.accounting"],
    --   "responseType": "code"
    -- }
    
    -- API Configuration (JSON)
    api_config JSONB NOT NULL,
    -- Example:
    -- {
    --   "baseUrl": "https://quickbooks.api.intuit.com/v3/company",
    --   "sandboxUrl": "https://sandbox-quickbooks.api.intuit.com/v3/company",
    --   "authHeader": "Bearer",
    --   "rateLimitPerMinute": 500
    -- }
    
    -- Entity Mappings (JSON) - How to fetch and transform data
    entity_mappings JSONB NOT NULL DEFAULT '{}',
    
    -- Account Type Mappings (JSON) - Provider types → PlainLedger types
    account_type_mapping JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_beta BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer-specific OAuth credentials (for white-label or multi-tenant)
CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES integration_providers(id),
    
    -- OAuth App Credentials (encrypted)
    client_id_encrypted BYTEA NOT NULL,
    client_secret_encrypted BYTEA NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    
    -- Optional: Customer-specific scopes
    custom_scopes TEXT[],
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, provider_id)
);

-- Connected data sources (customer connections)
CREATE TABLE IF NOT EXISTS datasource_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES integration_providers(id),
    
    -- Connection Details
    name VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    
    -- Provider-specific identifiers
    realm_id VARCHAR(100),          -- QuickBooks company ID
    tenant_id VARCHAR(100),         -- Xero tenant ID
    external_company_id VARCHAR(100), -- Generic external ID
    
    -- Tokens (encrypted)
    access_token_encrypted BYTEA,
    refresh_token_encrypted BYTEA,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'connected', 'syncing', 'error', 'disconnected', 'expired'
    
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),
    last_error TEXT,
    
    -- Sync Statistics
    accounts_count INTEGER DEFAULT 0,
    contacts_count INTEGER DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, provider_id, realm_id)
);

-- Sync history and logs
CREATE TABLE IF NOT EXISTS datasource_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES datasource_connections(id) ON DELETE CASCADE,
    
    -- Sync Details
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    status VARCHAR(50) NOT NULL,     -- 'started', 'completed', 'failed'
    
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    accounts_fetched INTEGER DEFAULT 0,
    contacts_fetched INTEGER DEFAULT 0,
    transactions_fetched INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    
    -- Quality Metrics
    quality_issues_count INTEGER DEFAULT 0,
    quality_issues JSONB DEFAULT '[]',
    
    -- Error Details
    error_message TEXT,
    error_stack TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integration_providers_active 
    ON integration_providers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_integration_credentials_org 
    ON integration_credentials(organization_id);

CREATE INDEX IF NOT EXISTS idx_datasource_connections_org 
    ON datasource_connections(organization_id);

CREATE INDEX IF NOT EXISTS idx_datasource_connections_status 
    ON datasource_connections(status);

CREATE INDEX IF NOT EXISTS idx_datasource_sync_logs_connection 
    ON datasource_sync_logs(connection_id, created_at DESC);

-- =============================================================================
-- Insert Default Providers
-- =============================================================================

INSERT INTO integration_providers (
    id, name, name_fr, description, description_fr, category,
    oauth_config, api_config, entity_mappings, account_type_mapping, is_active
) VALUES 
(
    'quickbooks',
    'QuickBooks Online',
    'QuickBooks en ligne',
    'Intuit QuickBooks accounting software',
    'Logiciel comptable Intuit QuickBooks',
    'accounting',
    '{
        "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2",
        "tokenUrl": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "scopes": ["com.intuit.quickbooks.accounting", "openid", "profile", "email"],
        "responseType": "code"
    }'::jsonb,
    '{
        "baseUrl": "https://quickbooks.api.intuit.com/v3/company",
        "sandboxUrl": "https://sandbox-quickbooks.api.intuit.com/v3/company",
        "authHeader": "Bearer",
        "rateLimitPerMinute": 500,
        "paginationStyle": "offset",
        "maxPageSize": 1000
    }'::jsonb,
    '{
        "accounts": {
            "endpoint": "/query",
            "queryTemplate": "SELECT * FROM Account MAXRESULTS 1000",
            "idField": "Id"
        },
        "customers": {
            "endpoint": "/query",
            "queryTemplate": "SELECT * FROM Customer MAXRESULTS 1000",
            "idField": "Id"
        },
        "invoices": {
            "endpoint": "/query",
            "queryTemplate": "SELECT * FROM Invoice WHERE TxnDate >= ''{startDate}'' AND TxnDate <= ''{endDate}'' MAXRESULTS 1000",
            "idField": "Id"
        }
    }'::jsonb,
    '{
        "Asset": "ASSET",
        "Liability": "LIABILITY",
        "Equity": "EQUITY",
        "Revenue": "REVENUE",
        "Income": "REVENUE",
        "Expense": "EXPENSE"
    }'::jsonb,
    true
),
(
    'xero',
    'Xero',
    'Xero',
    'Cloud-based accounting platform',
    'Plateforme comptable infonuagique',
    'accounting',
    '{
        "authorizationUrl": "https://login.xero.com/identity/connect/authorize",
        "tokenUrl": "https://identity.xero.com/connect/token",
        "scopes": ["openid", "profile", "email", "accounting.transactions.read", "accounting.contacts.read"],
        "responseType": "code",
        "pkceRequired": true
    }'::jsonb,
    '{
        "baseUrl": "https://api.xero.com/api.xro/2.0",
        "authHeader": "Bearer",
        "rateLimitPerMinute": 60,
        "paginationStyle": "page",
        "maxPageSize": 100
    }'::jsonb,
    '{
        "accounts": {"endpoint": "/Accounts", "idField": "AccountID"},
        "contacts": {"endpoint": "/Contacts", "idField": "ContactID"},
        "invoices": {"endpoint": "/Invoices", "idField": "InvoiceID"}
    }'::jsonb,
    '{
        "ASSET": "ASSET",
        "BANK": "ASSET",
        "LIABILITY": "LIABILITY",
        "EQUITY": "EQUITY",
        "REVENUE": "REVENUE",
        "EXPENSE": "EXPENSE"
    }'::jsonb,
    true
),
(
    'sage',
    'Sage Business Cloud',
    'Sage Business Cloud',
    'Sage Business Cloud Accounting',
    'Comptabilité Sage Business Cloud',
    'accounting',
    '{
        "authorizationUrl": "https://www.sageone.com/oauth2/auth/central",
        "tokenUrl": "https://oauth.accounting.sage.com/token",
        "scopes": ["full_access"],
        "responseType": "code"
    }'::jsonb,
    '{
        "baseUrl": "https://api.accounting.sage.com/v3.1",
        "authHeader": "Bearer",
        "rateLimitPerMinute": 300
    }'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    true
),
(
    'freshbooks',
    'FreshBooks',
    'FreshBooks',
    'Invoice and accounting software for small businesses',
    'Logiciel de facturation et comptabilité pour petites entreprises',
    'accounting',
    '{
        "authorizationUrl": "https://auth.freshbooks.com/oauth/authorize",
        "tokenUrl": "https://api.freshbooks.com/auth/oauth/token",
        "scopes": ["user:profile:read", "user:invoices:read"],
        "responseType": "code"
    }'::jsonb,
    '{
        "baseUrl": "https://api.freshbooks.com/accounting/account",
        "authHeader": "Bearer",
        "rateLimitPerMinute": 100
    }'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    true
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    oauth_config = EXCLUDED.oauth_config,
    api_config = EXCLUDED.api_config,
    updated_at = CURRENT_TIMESTAMP;

-- View for active connections with provider details
CREATE OR REPLACE VIEW v_active_connections AS
SELECT 
    dc.id,
    dc.organization_id,
    dc.name as connection_name,
    dc.company_name,
    dc.status,
    dc.last_sync_at,
    dc.accounts_count,
    dc.contacts_count,
    dc.transactions_count,
    ip.id as provider_id,
    ip.name as provider_name,
    ip.logo_url as provider_logo,
    ip.category as provider_category
FROM datasource_connections dc
JOIN integration_providers ip ON dc.provider_id = ip.id
WHERE dc.status != 'disconnected'
  AND ip.is_active = true;

COMMENT ON TABLE integration_providers IS 'Dynamic integration provider configurations - add new accounting software without code changes';
COMMENT ON TABLE integration_credentials IS 'Customer-specific OAuth credentials for white-label integrations';
COMMENT ON TABLE datasource_connections IS 'Active connections between PlainLedger organizations and external accounting systems';
