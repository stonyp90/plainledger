-- ==============================================================================
-- PlainLedger - Platform Admin Schema
-- Entitlement Model: User -> Group -> Permission
-- ==============================================================================

-- Create platform schema
CREATE SCHEMA IF NOT EXISTS platform;

-- ==============================================================================
-- PERMISSIONS TABLE (Seed Data - Immutable)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.admin_permissions (
    id VARCHAR(100) PRIMARY KEY,             -- e.g., 'org:view', 'user:delete'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,           -- org, user, billing, sync, support, config, admin, analytics
    is_dangerous BOOLEAN DEFAULT false,      -- Requires confirmation before use
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE platform.admin_permissions IS 'Platform-level permissions (immutable seed data)';

-- ==============================================================================
-- GROUPS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,       -- e.g., 'L1 Support', 'Platform Owner'
    description TEXT,
    tier_level INTEGER NOT NULL DEFAULT 1,   -- 0=viewer, 1=L1, 2=L2, 3=L3, 5=CS, 8=ops, 10=admin, 100=owner
    is_system BOOLEAN DEFAULT true,          -- System groups cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE platform.groups IS 'Platform admin groups with tier levels for escalation';

-- ==============================================================================
-- GROUP-PERMISSION MAPPING (Many-to-Many)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.group_permissions (
    group_id UUID NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (group_id, permission_id)
);

COMMENT ON TABLE platform.group_permissions IS 'Maps groups to their granted permissions';

-- ==============================================================================
-- ADMIN USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_id VARCHAR(100) NOT NULL UNIQUE,  -- Keycloak user ID (sub)
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    mfa_enabled BOOLEAN DEFAULT false,
    last_access_at TIMESTAMPTZ,
    invited_by UUID REFERENCES platform.admin_users(id),
    notes TEXT,                                -- Internal notes about this admin
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE platform.admin_users IS 'Platform admin users (separate from tenant users)';

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON platform.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_keycloak ON platform.admin_users(keycloak_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON platform.admin_users(is_active) WHERE is_active = true;

-- ==============================================================================
-- USER-GROUP MEMBERSHIP (Many-to-Many)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.user_groups (
    user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    PRIMARY KEY (user_id, group_id)
);

COMMENT ON TABLE platform.user_groups IS 'Maps admin users to their groups';

CREATE INDEX IF NOT EXISTS idx_user_groups_user ON platform.user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group ON platform.user_groups(group_id);

-- ==============================================================================
-- AUDIT LOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS platform.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES platform.admin_users(id),
    admin_email VARCHAR(255),                  -- Denormalized for performance
    action VARCHAR(100) NOT NULL,              -- e.g., 'org:delete', 'user:impersonate'
    resource_type VARCHAR(50) NOT NULL,        -- org, user, billing, sync, admin, group
    resource_id VARCHAR(100),                  -- UUID or ID of affected resource
    resource_name VARCHAR(255),                -- Human-readable name (denormalized)
    target_org_id UUID,                        -- If action affects an organization
    target_org_name VARCHAR(255),              -- Denormalized org name
    target_user_id VARCHAR(100),               -- If action affects a user
    target_user_email VARCHAR(255),            -- Denormalized user email
    before_state JSONB,                        -- State before change
    after_state JSONB,                         -- State after change
    metadata JSONB,                            -- Additional context (search params, etc.)
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(100),
    duration_ms INTEGER,                       -- How long the action took
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE platform.audit_log IS 'Complete audit trail for all platform admin actions';

CREATE INDEX IF NOT EXISTS idx_audit_user ON platform.audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON platform.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON platform.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON platform.audit_log(target_org_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON platform.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_success ON platform.audit_log(success) WHERE success = false;

-- ==============================================================================
-- NOTE: Helper views (user_effective_permissions, user_tier_levels) are NOT
-- created here because TypeORM synchronize manages the platform schema tables.
-- Views would block TypeORM from modifying columns they depend on.
-- ==============================================================================

-- ==============================================================================
-- SEED DATA: PERMISSIONS (Comprehensive Admin Capabilities)
-- ==============================================================================
INSERT INTO platform.admin_permissions (id, name, category, description, is_dangerous) VALUES
    -- ============================================
    -- ORGANIZATION MANAGEMENT
    -- ============================================
    ('org:list', 'List Organizations', 'org', 'List all organizations with basic metadata', false),
    ('org:view', 'View Organization', 'org', 'View organization details, settings, and metadata', false),
    ('org:create', 'Create Organization', 'org', 'Create new organizations on behalf of customers', false),
    ('org:edit', 'Edit Organization', 'org', 'Edit organization settings (name, industry, etc.)', false),
    ('org:delete', 'Delete Organization', 'org', 'Soft-delete/archive organizations', true),
    ('org:hard_delete', 'Hard Delete Organization', 'org', 'Permanently delete organization and all data', true),
    ('org:impersonate', 'Impersonate Organization', 'org', 'Access organization as if you were a member', true),
    ('org:transfer_ownership', 'Transfer Ownership', 'org', 'Transfer organization ownership to another user', true),
    ('org:merge', 'Merge Organizations', 'org', 'Merge two organizations into one', true),
    
    -- ============================================
    -- USER & ACCOUNT MANAGEMENT
    -- ============================================
    ('user:list', 'List Users', 'user', 'List all users across organizations', false),
    ('user:view', 'View User', 'user', 'View user profile, activity, login history', false),
    ('user:create', 'Create User', 'user', 'Create user accounts on behalf of customers', true),
    ('user:edit', 'Edit User', 'user', 'Edit user profiles', false),
    ('user:invite', 'Invite User', 'user', 'Invite users to organizations on behalf of admins', true),
    ('user:reset_password', 'Reset Password', 'user', 'Force password reset for users', true),
    ('user:disable', 'Disable User', 'user', 'Disable/enable user accounts', true),
    ('user:delete', 'Delete User', 'user', 'Hard delete users (GDPR compliance)', true),
    ('user:impersonate', 'Impersonate User', 'user', 'Login as user for debugging', true),
    ('user:force_logout', 'Force Logout', 'user', 'Terminate all user sessions', true),
    ('user:change_role', 'Change User Role', 'user', 'Change user role within organization', true),
    ('user:view_sessions', 'View Sessions', 'user', 'View active user sessions', false),
    ('user:view_login_history', 'View Login History', 'user', 'View user login history and devices', false),
    
    -- ============================================
    -- ONBOARDING & SETUP
    -- ============================================
    ('onboarding:view', 'View Onboarding Status', 'onboarding', 'View customer onboarding progress', false),
    ('onboarding:complete', 'Complete Onboarding', 'onboarding', 'Complete onboarding steps on behalf of customer', true),
    ('onboarding:reset', 'Reset Onboarding', 'onboarding', 'Reset onboarding to allow customer to redo', true),
    ('onboarding:skip', 'Skip Onboarding Steps', 'onboarding', 'Skip onboarding requirements for customer', true),
    
    -- ============================================
    -- BILLING & SUBSCRIPTIONS
    -- ============================================
    ('billing:view', 'View Billing', 'billing', 'View billing status, invoices, MRR', false),
    ('billing:edit', 'Edit Billing', 'billing', 'Edit billing details and payment methods', false),
    ('billing:credit', 'Apply Credit', 'billing', 'Apply credits to accounts', true),
    ('billing:discount', 'Apply Discount', 'billing', 'Apply/remove discounts and coupons', true),
    ('billing:refund', 'Process Refund', 'billing', 'Process refunds', true),
    ('billing:invoice', 'Manage Invoices', 'billing', 'Generate, void, and resend invoices', true),
    ('billing:payment_method', 'Manage Payment Methods', 'billing', 'Add/remove payment methods on behalf of customer', true),
    ('tier:view', 'View Tier', 'billing', 'View organization tier', false),
    ('tier:upgrade', 'Upgrade Tier', 'billing', 'Upgrade organization tier', false),
    ('tier:downgrade', 'Downgrade Tier', 'billing', 'Downgrade organization tier', true),
    ('tier:override', 'Override Tier Limits', 'billing', 'Override tier limits (users, connections, etc.)', true),
    ('trial:extend', 'Extend Trial', 'billing', 'Extend trial period for organizations', true),
    ('trial:end', 'End Trial', 'billing', 'End trial early and convert to paid', true),
    ('subscription:cancel', 'Cancel Subscription', 'billing', 'Cancel customer subscription', true),
    ('subscription:pause', 'Pause Subscription', 'billing', 'Pause subscription billing', true),
    ('subscription:resume', 'Resume Subscription', 'billing', 'Resume paused subscription', false),
    ('promo:apply', 'Apply Promotion', 'billing', 'Apply promotional codes and offers', true),
    ('promo:create', 'Create Promotion', 'billing', 'Create new promotional codes', true),
    
    -- ============================================
    -- FEATURE FLAGS & CONFIGURATION
    -- ============================================
    ('feature:view', 'View Features', 'feature', 'View feature flags for organization', false),
    ('feature:toggle', 'Toggle Features', 'feature', 'Enable/disable features per organization', true),
    ('feature:beta', 'Beta Access', 'feature', 'Grant beta feature access to organizations', true),
    ('feature:override_limit', 'Override Feature Limits', 'feature', 'Override feature usage limits', true),
    
    -- ============================================
    -- DATA CONNECTIONS & SYNC
    -- ============================================
    ('connection:list', 'List Connections', 'connection', 'List all data connections', false),
    ('connection:view', 'View Connection', 'connection', 'View connection details and status', false),
    ('connection:create', 'Create Connection', 'connection', 'Create data connections on behalf of customer', true),
    ('connection:edit', 'Edit Connection', 'connection', 'Edit connection settings', true),
    ('connection:delete', 'Delete Connection', 'connection', 'Delete data connections', true),
    ('connection:reconnect', 'Reconnect', 'connection', 'Re-authenticate OAuth connections', true),
    ('sync:list', 'List Sync Jobs', 'sync', 'List all sync jobs', false),
    ('sync:view', 'View Sync Job', 'sync', 'View sync job details and logs', false),
    ('sync:trigger', 'Trigger Sync', 'sync', 'Manually trigger sync', false),
    ('sync:pause', 'Pause Sync', 'sync', 'Pause running sync jobs', false),
    ('sync:retry', 'Retry Sync', 'sync', 'Retry failed sync jobs', false),
    ('sync:cancel', 'Cancel Sync', 'sync', 'Cancel sync jobs', true),
    ('sync:schedule', 'Schedule Sync', 'sync', 'Change sync schedule for organization', true),
    ('data:export', 'Export Data', 'data', 'Export organization data', true),
    ('data:import', 'Import Data', 'data', 'Import data into organization', true),
    ('data:delete', 'Delete Data', 'data', 'Delete organization data', true),
    ('data:backup', 'Backup Data', 'data', 'Create data backup for organization', false),
    ('data:restore', 'Restore Data', 'data', 'Restore data from backup', true),
    
    -- ============================================
    -- REPORTS & DASHBOARDS
    -- ============================================
    ('report:list', 'List Reports', 'report', 'List all reports for organization', false),
    ('report:view', 'View Reports', 'report', 'View customer reports and dashboards', false),
    ('report:create', 'Create Reports', 'report', 'Create reports on behalf of customer', true),
    ('report:edit', 'Edit Reports', 'report', 'Edit customer reports', true),
    ('report:delete', 'Delete Reports', 'report', 'Delete customer reports', true),
    ('report:export', 'Export Reports', 'report', 'Export reports on behalf of customer', false),
    ('report:share', 'Share Reports', 'report', 'Manage report sharing settings', true),
    ('dashboard:view', 'View Dashboards', 'report', 'View customer dashboards', false),
    ('dashboard:edit', 'Edit Dashboards', 'report', 'Edit customer dashboard layouts', true),
    
    -- ============================================
    -- COMMUNICATION
    -- ============================================
    ('comm:send_email', 'Send Email', 'communication', 'Send email to individual users', true),
    ('comm:send_bulk_email', 'Send Bulk Email', 'communication', 'Send email to multiple users', true),
    ('comm:send_notification', 'Send Notification', 'communication', 'Send in-app notifications', false),
    ('comm:view_history', 'View Communication History', 'communication', 'View email and notification history', false),
    ('comm:templates', 'Manage Templates', 'communication', 'Create and edit email templates', true),
    ('announcement:create', 'Create Announcement', 'communication', 'Create platform-wide announcements', true),
    ('announcement:edit', 'Edit Announcement', 'communication', 'Edit announcements', true),
    ('announcement:delete', 'Delete Announcement', 'communication', 'Delete announcements', true),
    
    -- ============================================
    -- SECURITY & COMPLIANCE
    -- ============================================
    ('security:view_events', 'View Security Events', 'security', 'View security events and alerts', false),
    ('security:mfa_reset', 'Reset MFA', 'security', 'Reset MFA for users', true),
    ('security:mfa_enforce', 'Enforce MFA', 'security', 'Enforce MFA for organization', true),
    ('security:ip_allowlist', 'Manage IP Allowlist', 'security', 'Manage IP restrictions for organization', true),
    ('security:api_keys', 'Manage API Keys', 'security', 'View and revoke customer API keys', true),
    ('security:webhooks', 'Manage Webhooks', 'security', 'View and manage customer webhooks', true),
    ('gdpr:export', 'GDPR Export', 'security', 'Export all user data for GDPR request', true),
    ('gdpr:delete', 'GDPR Delete', 'security', 'Delete all user data for GDPR request', true),
    
    -- ============================================
    -- SUPPORT OPERATIONS
    -- ============================================
    ('support:view_tickets', 'View Tickets', 'support', 'View support tickets', false),
    ('support:create_ticket', 'Create Ticket', 'support', 'Create support tickets on behalf of users', false),
    ('support:manage_tickets', 'Manage Tickets', 'support', 'Update, assign, and close tickets', false),
    ('support:escalate', 'Escalate Tickets', 'support', 'Escalate tickets to higher tier', false),
    ('notes:view', 'View Notes', 'support', 'View internal notes on organizations/users', false),
    ('notes:create', 'Create Notes', 'support', 'Add internal notes', false),
    ('notes:edit', 'Edit Notes', 'support', 'Edit internal notes', false),
    ('notes:delete', 'Delete Notes', 'support', 'Delete internal notes', true),
    
    -- ============================================
    -- AUDIT & COMPLIANCE
    -- ============================================
    ('audit:view', 'View Audit Logs', 'audit', 'View audit logs for any organization', false),
    ('audit:export', 'Export Audit Logs', 'audit', 'Export audit logs', false),
    ('audit:search', 'Search Audit Logs', 'audit', 'Advanced search in audit logs', false),
    ('compliance:view', 'View Compliance Status', 'audit', 'View compliance status and reports', false),
    ('compliance:generate', 'Generate Compliance Reports', 'audit', 'Generate compliance reports', false),
    
    -- ============================================
    -- PLATFORM CONFIGURATION
    -- ============================================
    ('config:view', 'View Config', 'config', 'View system configuration', false),
    ('config:edit', 'Edit Config', 'config', 'Edit feature flags, rate limits, system settings', true),
    ('config:rate_limits', 'Manage Rate Limits', 'config', 'Adjust API rate limits', true),
    ('maintenance:view', 'View Maintenance', 'config', 'View maintenance schedules', false),
    ('maintenance:schedule', 'Schedule Maintenance', 'config', 'Schedule maintenance windows', true),
    ('maintenance:cancel', 'Cancel Maintenance', 'config', 'Cancel scheduled maintenance', true),
    
    -- ============================================
    -- ADMIN CONSOLE MANAGEMENT
    -- ============================================
    ('admin:list', 'List Admins', 'admin', 'View other admin users', false),
    ('admin:view', 'View Admin', 'admin', 'View admin user details and activity', false),
    ('admin:create', 'Create Admin', 'admin', 'Invite new admin users', true),
    ('admin:edit', 'Edit Admin', 'admin', 'Edit admin user details', true),
    ('admin:disable', 'Disable Admin', 'admin', 'Disable admin accounts', true),
    ('admin:delete', 'Delete Admin', 'admin', 'Remove admin accounts', true),
    ('group:list', 'List Groups', 'admin', 'List all groups', false),
    ('group:view', 'View Group', 'admin', 'View group details and members', false),
    ('group:create', 'Create Group', 'admin', 'Create new groups', true),
    ('group:edit', 'Edit Group', 'admin', 'Edit groups and assign permissions', true),
    ('group:delete', 'Delete Group', 'admin', 'Delete groups', true),
    ('group:assign', 'Assign Users to Groups', 'admin', 'Assign users to groups', true),
    
    -- ============================================
    -- ANALYTICS & REPORTING
    -- ============================================
    ('analytics:platform', 'Platform Analytics', 'analytics', 'View platform-wide analytics (MRR, churn, etc.)', false),
    ('analytics:usage', 'Usage Analytics', 'analytics', 'View usage metrics across tenants', false),
    ('analytics:cohort', 'Cohort Analysis', 'analytics', 'View cohort analysis and retention', false),
    ('analytics:export', 'Export Analytics', 'analytics', 'Export analytics data', false),
    ('analytics:realtime', 'Realtime Analytics', 'analytics', 'View realtime platform metrics', false),
    ('reports:generate', 'Generate Platform Reports', 'analytics', 'Generate platform-level reports', false),
    ('reports:schedule', 'Schedule Reports', 'analytics', 'Schedule automated reports', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_dangerous = EXCLUDED.is_dangerous;

-- ==============================================================================
-- SEED DATA: DEFAULT GROUPS
-- ==============================================================================
INSERT INTO platform.groups (id, name, description, tier_level, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Viewer', 'Read-only access to everything', 0, true),
    ('00000000-0000-0000-0000-000000000002', 'L1 Support', 'Basic support operations, no destructive actions', 1, true),
    ('00000000-0000-0000-0000-000000000003', 'L2 Support', 'Advanced support, can make non-destructive changes', 2, true),
    ('00000000-0000-0000-0000-000000000004', 'L3 Support', 'Full technical access, can do destructive operations', 3, true),
    ('00000000-0000-0000-0000-000000000005', 'Customer Success', 'Account management focus', 5, true),
    ('00000000-0000-0000-0000-000000000006', 'Operations', 'Platform operations, no user management', 8, true),
    ('00000000-0000-0000-0000-000000000007', 'Platform Administrator', 'Full access except admin management', 10, true),
    ('00000000-0000-0000-0000-000000000008', 'Platform Owner', 'God mode - all permissions', 100, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    tier_level = EXCLUDED.tier_level;

-- ==============================================================================
-- SEED DATA: GROUP PERMISSIONS (Comprehensive)
-- ==============================================================================

-- Viewer (Tier 0): All view/list permissions only
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, id 
FROM platform.admin_permissions
WHERE id LIKE '%:list' OR id LIKE '%:view'
   OR id IN ('audit:search', 'compliance:view')
ON CONFLICT DO NOTHING;

-- L1 Support (Tier 1): View + basic support operations
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002'::uuid, id
FROM platform.admin_permissions
WHERE id LIKE '%:list' OR id LIKE '%:view'
   OR id IN (
       'support:create_ticket', 'support:manage_tickets',
       'notes:view', 'notes:create',
       'comm:send_notification', 'comm:view_history',
       'audit:search'
   )
ON CONFLICT DO NOTHING;

-- L2 Support (Tier 2): L1 + edit permissions + account management
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003'::uuid, id
FROM platform.admin_permissions
WHERE id LIKE '%:list' OR id LIKE '%:view'
   OR id IN (
       -- Organization
       'org:edit',
       -- User management
       'user:edit', 'user:reset_password', 'user:invite', 'user:change_role',
       -- Onboarding
       'onboarding:complete', 'onboarding:reset',
       -- Billing (non-destructive)
       'billing:edit', 'billing:credit', 'tier:upgrade', 'trial:extend',
       -- Features
       'feature:toggle',
       -- Connections & Sync
       'connection:edit', 'connection:reconnect',
       'sync:trigger', 'sync:retry', 'sync:pause',
       -- Reports
       'report:create', 'report:edit', 'report:export',
       -- Communication
       'comm:send_email', 'comm:send_notification', 'comm:view_history',
       -- Support
       'support:create_ticket', 'support:manage_tickets', 'support:escalate',
       'notes:view', 'notes:create', 'notes:edit',
       -- Audit
       'audit:search', 'audit:export'
   )
ON CONFLICT DO NOTHING;

-- L3 Support / Engineering (Tier 3): Full technical access
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004'::uuid, id
FROM platform.admin_permissions
WHERE category NOT IN ('admin')
   OR id IN ('admin:list', 'admin:view', 'group:list', 'group:view')
ON CONFLICT DO NOTHING;

-- Customer Success (Tier 5): Account management + billing focus
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005'::uuid, id
FROM platform.admin_permissions
WHERE id LIKE '%:list' OR id LIKE '%:view'
   OR id IN (
       -- Organization
       'org:create', 'org:edit',
       -- User management
       'user:create', 'user:edit', 'user:invite', 'user:change_role',
       -- Onboarding
       'onboarding:complete', 'onboarding:reset', 'onboarding:skip',
       -- Billing (full)
       'billing:edit', 'billing:credit', 'billing:discount', 'billing:invoice',
       'tier:upgrade', 'tier:downgrade', 'tier:override',
       'trial:extend', 'trial:end',
       'subscription:pause', 'subscription:resume',
       'promo:apply',
       -- Features
       'feature:toggle', 'feature:beta', 'feature:override_limit',
       -- Connections
       'connection:create', 'connection:edit', 'connection:reconnect',
       'sync:trigger', 'sync:schedule',
       -- Reports
       'report:create', 'report:edit', 'report:share',
       -- Communication
       'comm:send_email', 'comm:send_notification',
       -- Support
       'support:create_ticket', 'support:manage_tickets',
       'notes:view', 'notes:create', 'notes:edit',
       -- Analytics
       'analytics:platform', 'analytics:usage', 'analytics:cohort', 'analytics:export',
       'reports:generate'
   )
ON CONFLICT DO NOTHING;

-- Operations (Tier 8): Platform ops, infrastructure focus
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006'::uuid, id
FROM platform.admin_permissions
WHERE category IN ('sync', 'data', 'config', 'analytics', 'audit')
   OR id LIKE '%:list' OR id LIKE '%:view'
   OR id IN (
       'connection:edit', 'connection:reconnect',
       'maintenance:schedule', 'maintenance:cancel',
       'announcement:create', 'announcement:edit',
       'config:rate_limits'
   )
ON CONFLICT DO NOTHING;

-- Platform Administrator (Tier 10): Everything except admin/group management
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000007'::uuid, id
FROM platform.admin_permissions
WHERE id NOT IN (
    'admin:create', 'admin:edit', 'admin:disable', 'admin:delete',
    'group:create', 'group:edit', 'group:delete', 'group:assign'
)
ON CONFLICT DO NOTHING;

-- Platform Owner (Tier 100): God mode - all permissions
INSERT INTO platform.group_permissions (group_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000008'::uuid, id
FROM platform.admin_permissions
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- GRANT PERMISSIONS
-- ==============================================================================
GRANT USAGE ON SCHEMA platform TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA platform TO plainledger;
