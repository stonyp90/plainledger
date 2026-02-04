-- Migration: Add admin features tables
-- Date: 2024-02-04
-- Description: Creates tables for data source connections, push notifications, and admin chat

-- Create platform schema if not exists
CREATE SCHEMA IF NOT EXISTS platform;

-- ============================================================================
-- Data Source Connections Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounting.data_source_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_account_id VARCHAR(255),
    provider_account_name VARCHAR(255),
    provider_company_id VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_sync_error TEXT,
    last_sync_records_count INT,
    total_syncs INT NOT NULL DEFAULT 0,
    successful_syncs INT NOT NULL DEFAULT 0,
    failed_syncs INT NOT NULL DEFAULT 0,
    metadata JSONB,
    scopes TEXT[],
    connected_by_user_id VARCHAR(255),
    connected_by_email VARCHAR(255),
    disconnected_at TIMESTAMPTZ,
    disconnected_by_user_id VARCHAR(255),
    disconnected_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_source_connections_org ON accounting.data_source_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_source_connections_provider ON accounting.data_source_connections(provider);
CREATE INDEX IF NOT EXISTS idx_data_source_connections_status ON accounting.data_source_connections(status);

-- ============================================================================
-- Push Notifications Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform.push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    title_fr VARCHAR(255),
    message_fr TEXT,
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notification_type VARCHAR(100) NOT NULL DEFAULT 'admin_broadcast',
    target_type VARCHAR(50) NOT NULL,
    target_ids TEXT[],
    target_filter JSONB,
    recipients_count INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    read_count INT NOT NULL DEFAULT 0,
    clicked_count INT NOT NULL DEFAULT 0,
    action_url VARCHAR(500),
    action_label VARCHAR(100),
    action_label_fr VARCHAR(100),
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    created_by_admin_id VARCHAR(255) NOT NULL,
    created_by_admin_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON platform.push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_target ON platform.push_notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_title ON platform.push_notifications(title);

-- ============================================================================
-- Admin Chat Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform.admin_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    organization_id VARCHAR(255),
    organization_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'waiting',
    subject VARCHAR(255),
    initial_message TEXT,
    assigned_admin_id VARCHAR(255),
    assigned_admin_email VARCHAR(255),
    assigned_at TIMESTAMPTZ,
    messages_count INT NOT NULL DEFAULT 0,
    customer_messages_count INT NOT NULL DEFAULT 0,
    admin_messages_count INT NOT NULL DEFAULT 0,
    first_response_at TIMESTAMPTZ,
    first_response_time_seconds INT,
    customer_online BOOLEAN NOT NULL DEFAULT FALSE,
    customer_last_seen_at TIMESTAMPTZ,
    customer_typing BOOLEAN NOT NULL DEFAULT FALSE,
    page_url VARCHAR(500),
    user_agent TEXT,
    metadata JSONB,
    tags TEXT[],
    closed_at TIMESTAMPTZ,
    closed_by_admin_id VARCHAR(255),
    resolution_notes TEXT,
    satisfaction_rating INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer ON platform.admin_chat_sessions(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_org ON platform.admin_chat_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON platform.admin_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_admin ON platform.admin_chat_sessions(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_online ON platform.admin_chat_sessions(customer_online);

-- ============================================================================
-- Admin Chat Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform.admin_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES platform.admin_chat_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    file_type VARCHAR(100),
    read_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
    read_by_customer_at TIMESTAMPTZ,
    read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    read_by_admin_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON platform.admin_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON platform.admin_chat_messages(created_at);

-- ============================================================================
-- Update trigger for timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_data_source_connections_updated_at ON accounting.data_source_connections;
CREATE TRIGGER update_data_source_connections_updated_at 
    BEFORE UPDATE ON accounting.data_source_connections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON platform.admin_chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON platform.admin_chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Grant permissions (adjust role names as needed)
-- ============================================================================
-- GRANT ALL ON ALL TABLES IN SCHEMA platform TO plainledger_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA platform TO plainledger_app;

COMMENT ON TABLE accounting.data_source_connections IS 'Tracks connections to external accounting providers (QuickBooks, Xero, etc.)';
COMMENT ON TABLE platform.push_notifications IS 'Admin-initiated push notifications to users';
COMMENT ON TABLE platform.admin_chat_sessions IS 'Live chat sessions between admins and customers';
COMMENT ON TABLE platform.admin_chat_messages IS 'Messages within admin chat sessions';
