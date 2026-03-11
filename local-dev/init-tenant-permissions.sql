-- ==============================================================================
-- PlainLedger - Tenant Permission System Schema
-- Subscription Entitlements & Role-Based Permissions
-- ==============================================================================

-- Create tenant schema if not exists
CREATE SCHEMA IF NOT EXISTS tenant;

-- ==============================================================================
-- ENTITLEMENTS TABLE (Feature flags for subscription plans)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.entitlements (
    id VARCHAR(50) PRIMARY KEY,              -- e.g., 'datasource:quickbooks', 'feature:power-bi'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,           -- datasource, feature, limit, security, support
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenant.entitlements IS 'Feature entitlements available to subscription plans';

CREATE INDEX IF NOT EXISTS idx_entitlements_category ON tenant.entitlements(category);

-- ==============================================================================
-- SUBSCRIPTION PLANS TABLE (Maps to Stripe products/prices)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.subscription_plans (
    id VARCHAR(50) PRIMARY KEY,               -- e.g., 'free', 'professional', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stripe_product_id VARCHAR(100),          -- Stripe product ID
    stripe_price_id VARCHAR(100),             -- Stripe price ID (monthly)
    stripe_price_id_annual VARCHAR(100),     -- Stripe price ID (annual)
    limits JSONB NOT NULL DEFAULT '{}',      -- Usage limits (users, connections, etc.)
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenant.subscription_plans IS 'Subscription plans that map to Stripe products';

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON tenant.subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product ON tenant.subscription_plans(stripe_product_id);

-- ==============================================================================
-- PLAN ENTITLEMENTS (Junction table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.plan_entitlements (
    plan_id VARCHAR(50) REFERENCES tenant.subscription_plans(id) ON DELETE CASCADE,
    entitlement_id VARCHAR(50) REFERENCES tenant.entitlements(id) ON DELETE CASCADE,
    config JSONB DEFAULT '{}',                -- Entitlement-specific config (limits, etc.)
    PRIMARY KEY (plan_id, entitlement_id)
);

COMMENT ON TABLE tenant.plan_entitlements IS 'Maps subscription plans to their entitlements';

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan ON tenant.plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_entitlement ON tenant.plan_entitlements(entitlement_id);

-- ==============================================================================
-- PERMISSIONS TABLE (Actions users can perform)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.permissions (
    id VARCHAR(50) PRIMARY KEY,              -- e.g., 'view:dashboard', 'manage:connections'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,           -- dashboard, reports, connections, settings, members, billing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenant.permissions IS 'Permissions for user roles within organizations';

CREATE INDEX IF NOT EXISTS idx_permissions_category ON tenant.permissions(category);

-- ==============================================================================
-- ROLES TABLE (User roles within organization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.roles (
    id VARCHAR(50) PRIMARY KEY,               -- e.g., 'owner', 'admin', 'member', 'viewer'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    tier_level INTEGER DEFAULT 0,             -- For hierarchy (owner=100, admin=50, etc.)
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenant.roles IS 'User roles within organizations';

CREATE INDEX IF NOT EXISTS idx_roles_tier_level ON tenant.roles(tier_level);

-- ==============================================================================
-- ROLE PERMISSIONS (Junction table)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.role_permissions (
    role_id VARCHAR(50) REFERENCES tenant.roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(50) REFERENCES tenant.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE tenant.role_permissions IS 'Maps roles to their permissions';

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON tenant.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON tenant.role_permissions(permission_id);

-- ==============================================================================
-- ORGANIZATION ENTITLEMENT OVERRIDES (Optional - for custom deals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tenant.organization_entitlement_overrides (
    organization_id UUID NOT NULL,
    entitlement_id VARCHAR(50) REFERENCES tenant.entitlements(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    granted_by VARCHAR(100),                 -- Admin who granted override
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (organization_id, entitlement_id)
);

COMMENT ON TABLE tenant.organization_entitlement_overrides IS 'Organization-specific entitlement overrides';

CREATE INDEX IF NOT EXISTS idx_org_overrides_org ON tenant.organization_entitlement_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_overrides_expires ON tenant.organization_entitlement_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- Views will be created after ALTER TABLE statements

-- ==============================================================================
-- SEED DATA: ENTITLEMENTS
-- ==============================================================================
INSERT INTO tenant.entitlements (id, name, description, category) VALUES
    -- Data Sources
    ('datasource:quickbooks', 'QuickBooks Integration', 'Connect and sync QuickBooks data', 'datasource'),
    ('datasource:xero', 'Xero Integration', 'Connect and sync Xero data', 'datasource'),
    ('datasource:sage', 'Sage Integration', 'Connect and sync Sage data', 'datasource'),
    ('datasource:freshbooks', 'FreshBooks Integration', 'Connect and sync FreshBooks data', 'datasource'),
    ('datasource:wave', 'Wave Integration', 'Connect and sync Wave data', 'datasource'),
    ('datasource:csv', 'CSV Import', 'Import data via CSV files', 'datasource'),
    
    -- Features
    ('feature:anomaly-detection', 'Anomaly Detection', 'AI-powered anomaly detection in financial data', 'feature'),
    ('feature:power-bi', 'Power BI Integration', 'Power BI embedded dashboards', 'feature'),
    ('feature:ai-insights', 'AI Insights', 'AI-generated financial insights', 'feature'),
    ('feature:custom-reports', 'Custom Reports', 'Create custom financial reports', 'feature'),
    ('feature:audit-logs', 'Audit Logs', 'View audit logs and activity history', 'feature'),
    ('feature:api-access', 'API Access', 'Access to REST and GraphQL APIs', 'feature'),
    ('feature:sso', 'Single Sign-On', 'SSO authentication support', 'security'),
    ('feature:webhooks', 'Webhooks', 'Receive webhook notifications', 'feature'),
    ('feature:white-label', 'White Label', 'Remove branding and customize appearance', 'feature'),
    
    -- Limits
    ('limit:data-sources', 'Data Source Limit', 'Maximum number of connected data sources', 'limit'),
    ('limit:reports', 'Report Limit', 'Maximum number of reports per month', 'limit'),
    ('limit:storage', 'Storage Limit', 'Maximum storage in GB', 'limit'),
    ('limit:api-calls', 'API Call Limit', 'Maximum API calls per hour', 'limit'),
    ('limit:users', 'User Limit', 'Maximum number of users per organization', 'limit'),
    ('limit:power-bi-dashboards', 'Power BI Dashboard Limit', 'Maximum Power BI dashboards', 'limit')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- ==============================================================================
-- SEED DATA: SUBSCRIPTION PLANS
-- ==============================================================================
INSERT INTO tenant.subscription_plans (id, name, description, limits, display_order) VALUES
    ('free', 'Free', 'Basic access with limited features', 
     '{"users": 1, "connections": 0, "reports": 5, "storage": 100, "apiCalls": 100, "powerBiDashboards": 0}'::jsonb, 
     1),
    ('professional', 'Professional', 'Full features with standard limits', 
     '{"users": 10, "connections": 10, "reports": -1, "storage": 10000, "apiCalls": 10000, "powerBiDashboards": 10}'::jsonb, 
     2),
    ('enterprise', 'Enterprise', 'Unlimited everything', 
     '{"users": -1, "connections": -1, "reports": -1, "storage": -1, "apiCalls": -1, "powerBiDashboards": -1}'::jsonb, 
     3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    limits = EXCLUDED.limits,
    display_order = EXCLUDED.display_order;

-- ==============================================================================
-- SEED DATA: PLAN ENTITLEMENTS
-- ==============================================================================

-- Free Plan Entitlements
INSERT INTO tenant.plan_entitlements (plan_id, entitlement_id, config) VALUES
    ('free', 'datasource:csv', '{}'),
    ('free', 'feature:audit-logs', '{}'),
    ('free', 'limit:data-sources', '{"value": 0}'),
    ('free', 'limit:reports', '{"value": 5}'),
    ('free', 'limit:storage', '{"value": 100}'),
    ('free', 'limit:api-calls', '{"value": 100}'),
    ('free', 'limit:users', '{"value": 1}'),
    ('free', 'limit:power-bi-dashboards', '{"value": 0}')
ON CONFLICT DO NOTHING;

-- Professional Plan Entitlements
INSERT INTO tenant.plan_entitlements (plan_id, entitlement_id, config) VALUES
    ('professional', 'datasource:quickbooks', '{}'),
    ('professional', 'datasource:xero', '{}'),
    ('professional', 'datasource:sage', '{}'),
    ('professional', 'datasource:freshbooks', '{}'),
    ('professional', 'datasource:wave', '{}'),
    ('professional', 'datasource:csv', '{}'),
    ('professional', 'feature:anomaly-detection', '{}'),
    ('professional', 'feature:power-bi', '{}'),
    ('professional', 'feature:ai-insights', '{}'),
    ('professional', 'feature:custom-reports', '{}'),
    ('professional', 'feature:audit-logs', '{}'),
    ('professional', 'feature:api-access', '{}'),
    ('professional', 'feature:sso', '{}'),
    ('professional', 'feature:webhooks', '{}'),
    ('professional', 'limit:data-sources', '{"value": 10}'),
    ('professional', 'limit:reports', '{"value": -1}'),
    ('professional', 'limit:storage', '{"value": 10000}'),
    ('professional', 'limit:api-calls', '{"value": 10000}'),
    ('professional', 'limit:users', '{"value": 10}'),
    ('professional', 'limit:power-bi-dashboards', '{"value": 10}')
ON CONFLICT DO NOTHING;

-- Enterprise Plan Entitlements
INSERT INTO tenant.plan_entitlements (plan_id, entitlement_id, config) VALUES
    ('enterprise', 'datasource:quickbooks', '{}'),
    ('enterprise', 'datasource:xero', '{}'),
    ('enterprise', 'datasource:sage', '{}'),
    ('enterprise', 'datasource:freshbooks', '{}'),
    ('enterprise', 'datasource:wave', '{}'),
    ('enterprise', 'datasource:csv', '{}'),
    ('enterprise', 'feature:anomaly-detection', '{}'),
    ('enterprise', 'feature:power-bi', '{}'),
    ('enterprise', 'feature:ai-insights', '{}'),
    ('enterprise', 'feature:custom-reports', '{}'),
    ('enterprise', 'feature:audit-logs', '{}'),
    ('enterprise', 'feature:api-access', '{}'),
    ('enterprise', 'feature:sso', '{}'),
    ('enterprise', 'feature:webhooks', '{}'),
    ('enterprise', 'feature:white-label', '{}'),
    ('enterprise', 'limit:data-sources', '{"value": -1}'),
    ('enterprise', 'limit:reports', '{"value": -1}'),
    ('enterprise', 'limit:storage', '{"value": -1}'),
    ('enterprise', 'limit:api-calls', '{"value": -1}'),
    ('enterprise', 'limit:users', '{"value": -1}'),
    ('enterprise', 'limit:power-bi-dashboards', '{"value": -1}')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- SEED DATA: PERMISSIONS
-- ==============================================================================
INSERT INTO tenant.permissions (id, name, description, category) VALUES
    -- Dashboard
    ('view:dashboard', 'View Dashboard', 'View the main dashboard', 'dashboard'),
    ('customize:dashboard', 'Customize Dashboard', 'Customize dashboard layout and widgets', 'dashboard'),
    
    -- Reports
    ('view:reports', 'View Reports', 'View financial reports', 'reports'),
    ('create:reports', 'Create Reports', 'Create new reports', 'reports'),
    ('delete:reports', 'Delete Reports', 'Delete reports', 'reports'),
    
    -- Connections
    ('view:connections', 'View Connections', 'View data source connections', 'connections'),
    ('manage:connections', 'Manage Connections', 'Create, edit, and delete connections', 'connections'),
    
    -- Settings
    ('view:settings', 'View Settings', 'View organization settings', 'settings'),
    ('manage:settings', 'Manage Settings', 'Edit organization settings', 'settings'),
    
    -- Members
    ('view:members', 'View Members', 'View organization members', 'members'),
    ('manage:members', 'Manage Members', 'Invite, edit, and remove members', 'members'),
    
    -- Billing
    ('manage:billing', 'Manage Billing', 'Manage subscription and billing', 'billing'),
    
    -- Audit
    ('view:audit-logs', 'View Audit Logs', 'View audit logs and activity history', 'audit'),
    
    -- API
    ('use:api', 'Use API', 'Access REST and GraphQL APIs', 'api')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- ==============================================================================
-- SEED DATA: ROLES
-- ==============================================================================
INSERT INTO tenant.roles (id, name, description, tier_level, is_system) VALUES
    ('owner', 'Owner', 'Full access including billing', 100, true),
    ('admin', 'Administrator', 'Full access except billing', 50, true),
    ('member', 'Member', 'Create and view, no management', 20, true),
    ('viewer', 'Viewer', 'View-only access', 0, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    tier_level = EXCLUDED.tier_level;

-- ==============================================================================
-- SEED DATA: ROLE PERMISSIONS
-- ==============================================================================

-- Owner: All permissions
INSERT INTO tenant.role_permissions (role_id, permission_id)
SELECT 'owner', id FROM tenant.permissions
ON CONFLICT DO NOTHING;

-- Admin: All except billing
INSERT INTO tenant.role_permissions (role_id, permission_id)
SELECT 'admin', id FROM tenant.permissions
WHERE id != 'manage:billing'
ON CONFLICT DO NOTHING;

-- Member: Create/view, no manage
INSERT INTO tenant.role_permissions (role_id, permission_id) VALUES
    ('member', 'view:dashboard'),
    ('member', 'view:reports'),
    ('member', 'create:reports'),
    ('member', 'view:connections'),
    ('member', 'view:settings'),
    ('member', 'view:members'),
    ('member', 'use:api'),
    ('member', 'customize:dashboard')
ON CONFLICT DO NOTHING;

-- Viewer: View only
INSERT INTO tenant.role_permissions (role_id, permission_id) VALUES
    ('viewer', 'view:dashboard'),
    ('viewer', 'view:reports'),
    ('viewer', 'view:connections'),
    ('viewer', 'view:members')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================
GRANT USAGE ON SCHEMA tenant TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA tenant TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA tenant TO plainledger;

-- ==============================================================================
-- UPDATE ORGANIZATION TABLE
-- ==============================================================================
-- Add subscription plan columns to organizations table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'accounting' 
        AND table_name = 'organizations' 
        AND column_name = 'subscription_plan_id'
    ) THEN
        ALTER TABLE accounting.organizations 
        ADD COLUMN subscription_plan_id VARCHAR(50) DEFAULT 'free';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'accounting' 
        AND table_name = 'organizations' 
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE accounting.organizations 
        ADD COLUMN stripe_subscription_id VARCHAR(100);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'accounting' 
        AND table_name = 'organizations' 
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE accounting.organizations 
        ADD COLUMN stripe_customer_id VARCHAR(100);
    END IF;
END $$;

-- Add foreign key constraint after tables exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'accounting' 
        AND constraint_name = 'fk_organizations_subscription_plan'
    ) THEN
        ALTER TABLE accounting.organizations 
        ADD CONSTRAINT fk_organizations_subscription_plan 
        FOREIGN KEY (subscription_plan_id) 
        REFERENCES tenant.subscription_plans(id);
    END IF;
END $$;

-- ==============================================================================
-- UPDATE USER PROFILES TABLE
-- ==============================================================================
-- Add role column to user_profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'accounting' 
        AND table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE accounting.user_profiles 
        ADD COLUMN role VARCHAR(50) DEFAULT 'viewer';
    END IF;
END $$;

-- Add foreign key constraint after tables exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'accounting' 
        AND constraint_name = 'fk_user_profiles_role'
    ) THEN
        ALTER TABLE accounting.user_profiles 
        ADD CONSTRAINT fk_user_profiles_role 
        FOREIGN KEY (role) 
        REFERENCES tenant.roles(id);
    END IF;
END $$;

-- ==============================================================================
-- NOTE: Helper views (user_effective_permissions, organization_effective_entitlements)
-- are NOT created here because TypeORM synchronize manages the referenced tables.
-- Views would block TypeORM from modifying columns they depend on.
-- ==============================================================================
