-- Schema only, retained from local-dev/init-db.sql; no fixture/customer rows.
-- PlainLedger Financial Reporting Platform
-- Database Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS intelligence;

-- ============================================
-- ACCOUNTING SCHEMA - Core Financial Data
-- ============================================

-- Organizations (Tenants)
CREATE TABLE accounting.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_number VARCHAR(50),
    fiscal_year_end_month INTEGER DEFAULT 12 CHECK (fiscal_year_end_month BETWEEN 1 AND 12),
    currency VARCHAR(3) DEFAULT 'CAD',
    industry VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Chart of Accounts
CREATE TABLE accounting.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255),
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    account_subtype VARCHAR(50),
    parent_account_id UUID REFERENCES accounting.accounts(id),
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

-- Journal Entries
CREATE TABLE accounting.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    source VARCHAR(50) DEFAULT 'MANUAL',
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    posted_at TIMESTAMP WITH TIME ZONE,
    posted_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE accounting.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES accounting.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounting.accounts(id),
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    line_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account Balances (Materialized for performance)
CREATE TABLE accounting.account_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    account_id UUID NOT NULL REFERENCES accounting.accounts(id),
    fiscal_year INTEGER NOT NULL,
    fiscal_period INTEGER NOT NULL CHECK (fiscal_period BETWEEN 1 AND 13),
    opening_balance DECIMAL(15, 2) DEFAULT 0,
    debit_total DECIMAL(15, 2) DEFAULT 0,
    credit_total DECIMAL(15, 2) DEFAULT 0,
    closing_balance DECIMAL(15, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, account_id, fiscal_year, fiscal_period)
);

-- ============================================
-- REPORTING SCHEMA - Financial Reports
-- ============================================

-- Report Templates
CREATE TABLE reporting.report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW', 'TRIAL_BALANCE', 'CUSTOM')),
    template_config JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    is_ibcs_compliant BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Reports
CREATE TABLE reporting.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    template_id UUID REFERENCES reporting.report_templates(id),
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    as_of_date DATE NOT NULL,
    comparison_date DATE,
    parameters JSONB DEFAULT '{}',
    report_data JSONB NOT NULL,
    format VARCHAR(20) DEFAULT 'JSON' CHECK (format IN ('JSON', 'PDF', 'EXCEL', 'POWERBI')),
    file_path VARCHAR(500),
    generated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Report Links
CREATE TABLE reporting.shared_report_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reporting.generated_reports(id),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    share_token VARCHAR(255) NOT NULL UNIQUE,
    share_url VARCHAR(500) NOT NULL,
    password_hash VARCHAR(255),
    expires_in VARCHAR(20) DEFAULT '7d' CHECK (expires_in IN ('1d', '7d', '30d', '90d', 'never')),
    expires_at TIMESTAMP WITH TIME ZONE,
    allow_download BOOLEAN DEFAULT true,
    require_auth BOOLEAN DEFAULT false,
    created_by UUID,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_report_links_token ON reporting.shared_report_links(share_token);
CREATE INDEX idx_shared_report_links_report ON reporting.shared_report_links(report_id);
CREATE INDEX idx_shared_report_links_org ON reporting.shared_report_links(organization_id);

-- Tax Credit Eligibility Tracking
CREATE TABLE reporting.tax_credit_eligibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    tax_credit_id VARCHAR(100) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    eligibility_status VARCHAR(20) CHECK (eligibility_status IN ('likely', 'possible', 'unlikely', 'needs_review')),
    eligibility_score INTEGER CHECK (eligibility_score BETWEEN 0 AND 100),
    criteria_evaluation JSONB NOT NULL DEFAULT '{}',
    estimated_benefit_min DECIMAL(15, 2),
    estimated_benefit_max DECIMAL(15, 2),
    partner_referral_sent BOOLEAN DEFAULT false,
    partner_referral_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, tax_credit_id, fiscal_year)
);

CREATE INDEX idx_tax_credit_eligibility_org ON reporting.tax_credit_eligibility(organization_id);
CREATE INDEX idx_tax_credit_eligibility_status ON reporting.tax_credit_eligibility(eligibility_status);
CREATE INDEX idx_tax_credit_eligibility_credit ON reporting.tax_credit_eligibility(tax_credit_id);

-- Partner Referral Leads
CREATE TABLE reporting.tax_credit_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    tax_credit_id VARCHAR(100) NOT NULL,
    partner_id VARCHAR(100),
    lead_status VARCHAR(20) DEFAULT 'pending' CHECK (lead_status IN ('pending', 'contacted', 'qualified', 'converted', 'rejected')),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tax_credit_leads_org ON reporting.tax_credit_leads(organization_id);
CREATE INDEX idx_tax_credit_leads_status ON reporting.tax_credit_leads(lead_status);
CREATE INDEX idx_tax_credit_leads_credit ON reporting.tax_credit_leads(tax_credit_id);

-- ============================================
-- INTEGRATION SCHEMA - External Connections
-- ============================================

-- Data Sources (QuickBooks, Sage, etc.)
CREATE TABLE integration.data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounting.organizations(id),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('QUICKBOOKS', 'SAGE', 'XERO', 'CSV', 'EXCEL', 'API')),
    name VARCHAR(255) NOT NULL,
    connection_config JSONB DEFAULT '{}',
    credentials_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(20),
    sync_frequency VARCHAR(20) DEFAULT 'DAILY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync Jobs
CREATE TABLE integration.sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES integration.data_sources(id),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account Mappings
CREATE TABLE integration.account_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source_id UUID NOT NULL REFERENCES integration.data_sources(id),
    external_account_id VARCHAR(100) NOT NULL,
    external_account_name VARCHAR(255),
    internal_account_id UUID REFERENCES accounting.accounts(id),
    mapping_status VARCHAR(20) DEFAULT 'PENDING' CHECK (mapping_status IN ('PENDING', 'MAPPED', 'IGNORED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data_source_id, external_account_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_accounts_organization ON accounting.accounts(organization_id);
CREATE INDEX idx_accounts_type ON accounting.accounts(account_type);
CREATE INDEX idx_journal_entries_organization ON accounting.journal_entries(organization_id);
CREATE INDEX idx_journal_entries_date ON accounting.journal_entries(entry_date);
CREATE INDEX idx_journal_entry_lines_account ON accounting.journal_entry_lines(account_id);
CREATE INDEX idx_account_balances_org_year ON accounting.account_balances(organization_id, fiscal_year);
CREATE INDEX idx_generated_reports_org ON reporting.generated_reports(organization_id);
CREATE INDEX idx_data_sources_org ON integration.data_sources(organization_id);
CREATE INDEX idx_sync_jobs_source ON integration.sync_jobs(data_source_id);

-- ============================================

-- Schema only, retained from local-dev/init-datalake.sql; no fixture/customer rows.
-- PlainLedger Datalake Schema
-- Tracks ETL pipeline metadata for Bronze → Silver → Gold

-- Create datalake schema
CREATE SCHEMA IF NOT EXISTS datalake;

-- ============================================
-- BRONZE LAYER - Raw Ingestion Tracking
-- ============================================

CREATE TABLE datalake.bronze_ingestions (
    ingestion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    datasource_id UUID,
    source_endpoint VARCHAR(255),
    ingestion_status VARCHAR(20) DEFAULT 'success' CHECK (ingestion_status IN ('success', 'partial', 'failed')),
    record_count INTEGER DEFAULT 0,
    payload_hash VARCHAR(64),
    s3_path VARCHAR(500),
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bronze_ingestions_org ON datalake.bronze_ingestions(organization_id);
CREATE INDEX idx_bronze_ingestions_source ON datalake.bronze_ingestions(source_system);
CREATE INDEX idx_bronze_ingestions_date ON datalake.bronze_ingestions(ingested_at);

-- ============================================
-- SILVER LAYER - Processing Tracking
-- ============================================

CREATE TABLE datalake.silver_processing_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bronze_ingestion_id UUID REFERENCES datalake.bronze_ingestions(ingestion_id),
    organization_id UUID NOT NULL,
    source_system VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'account', 'contact', 'transaction'
    records_processed INTEGER DEFAULT 0,
    records_valid INTEGER DEFAULT 0,
    records_invalid INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5, 2),
    s3_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_silver_jobs_org ON datalake.silver_processing_jobs(organization_id);
CREATE INDEX idx_silver_jobs_bronze ON datalake.silver_processing_jobs(bronze_ingestion_id);

-- ============================================
-- GOLD LAYER - Analytics Ready Tracking
-- ============================================

CREATE TABLE datalake.gold_datasets (
    dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    silver_job_id UUID REFERENCES datalake.silver_processing_jobs(job_id),
    organization_id UUID NOT NULL,
    dataset_type VARCHAR(50) NOT NULL, -- 'dim_account', 'dim_contact', 'fact_transaction'
    record_count INTEGER DEFAULT 0,
    s3_path VARCHAR(500),
    partition_key VARCHAR(100), -- e.g., 'date_key=20240315'
    schema_version VARCHAR(20) DEFAULT '1.0',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gold_datasets_org ON datalake.gold_datasets(organization_id);
CREATE INDEX idx_gold_datasets_type ON datalake.gold_datasets(dataset_type);

-- ============================================
-- DATA QUALITY TRACKING
-- ============================================

CREATE TABLE datalake.quality_issues (
    issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processing_job_id UUID REFERENCES datalake.silver_processing_jobs(job_id),
    record_id VARCHAR(255),
    rule_id VARCHAR(50) NOT NULL,
    rule_name VARCHAR(255),
    severity VARCHAR(20) CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    field_name VARCHAR(100),
    issue_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quality_issues_job ON datalake.quality_issues(processing_job_id);
CREATE INDEX idx_quality_issues_severity ON datalake.quality_issues(severity);

-- ============================================
-- ETL PIPELINE RUNS
-- ============================================

CREATE TABLE datalake.pipeline_runs (
    run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    pipeline_type VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental', 'reprocess'
    source_system VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    bronze_records INTEGER DEFAULT 0,
    silver_records INTEGER DEFAULT 0,
    gold_records INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipeline_runs_org ON datalake.pipeline_runs(organization_id);
CREATE INDEX idx_pipeline_runs_status ON datalake.pipeline_runs(status);


-- Schema only, retained from local-dev/init-jobs.sql; no fixture/customer rows.
-- PlainLedger Jobs Configuration Schema
-- Allows super admins to configure scheduled jobs via the UI

-- Create system schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS system;

-- ============================================
-- JOB CONFIGURATION
-- ============================================

-- Job definitions and configuration
CREATE TABLE IF NOT EXISTS system.job_configurations (
    id VARCHAR(100) PRIMARY KEY,
    
    -- Job Info
    name_en VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    category VARCHAR(50) NOT NULL, -- 'sync', 'cleanup', 'reporting', 'ai', 'notifications'
    
    -- Schedule Configuration
    is_enabled BOOLEAN DEFAULT true,
    cron_expression VARCHAR(100) NOT NULL, -- Standard cron format
    timezone VARCHAR(50) DEFAULT 'America/Toronto',
    
    -- Execution Settings
    timeout_seconds INTEGER DEFAULT 3600, -- 1 hour default
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 300, -- 5 minutes
    
    -- Alert Configuration
    alert_on_failure BOOLEAN DEFAULT true,
    alert_on_success BOOLEAN DEFAULT false,
    alert_on_changes_detected BOOLEAN DEFAULT true,
    alert_emails TEXT[], -- Array of email addresses
    alert_slack_webhook VARCHAR(500),
    
    -- Metadata
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(20), -- 'success', 'failed', 'partial', 'skipped'
    last_run_duration_ms INTEGER,
    last_run_result JSONB,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_job_configurations_category ON system.job_configurations(category);
CREATE INDEX idx_job_configurations_enabled ON system.job_configurations(is_enabled);
CREATE INDEX idx_job_configurations_next_run ON system.job_configurations(next_run_at);

-- Job execution history
CREATE TABLE IF NOT EXISTS system.job_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) NOT NULL REFERENCES system.job_configurations(id),
    
    -- Execution Details
    run_id VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(20) NOT NULL, -- 'scheduled', 'manual', 'retry'
    triggered_by VARCHAR(100), -- User ID if manual
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Results
    result JSONB,
    error_message TEXT,
    
    -- Alerts Sent
    alerts_sent JSONB -- { email: [...], slack: boolean }
);

CREATE INDEX idx_job_executions_job ON system.job_executions(job_id);
CREATE INDEX idx_job_executions_status ON system.job_executions(status);
CREATE INDEX idx_job_executions_started ON system.job_executions(started_at DESC);

-- Alert templates
CREATE TABLE IF NOT EXISTS system.alert_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject_en VARCHAR(255) NOT NULL,
    subject_fr VARCHAR(255) NOT NULL,
    body_html_en TEXT NOT NULL,
    body_html_fr TEXT NOT NULL,
    variables TEXT[], -- Expected template variables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SEED DEFAULT JOB CONFIGURATIONS
-- ============================================


-- Schema only, retained from local-dev/init-tax-credits.sql; no fixture/customer rows.
-- PlainLedger Tax Credits Schema
-- Data-driven tax credit definitions with government source tracking
-- Enables dynamic updates from CRA, Revenu Québec, and provincial agencies

-- ============================================
-- TAX CREDITS REFERENCE DATA
-- ============================================

-- Tax Credit Definitions (synced from government sources)
CREATE TABLE IF NOT EXISTS reporting.tax_credit_definitions (
    id VARCHAR(100) PRIMARY KEY,
    
    -- Basic Info
    name_en VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    short_name_en VARCHAR(50) NOT NULL,
    short_name_fr VARCHAR(50) NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    
    -- Jurisdiction
    jurisdiction VARCHAR(20) NOT NULL CHECK (jurisdiction IN ('federal', 'provincial')),
    province VARCHAR(2), -- NULL for federal, 'QC', 'ON', 'BC', 'AB', etc. for provincial
    
    -- Credit Type
    credit_type VARCHAR(20) NOT NULL CHECK (credit_type IN ('refundable', 'non-refundable', 'both')),
    
    -- Benefit Details
    max_benefit_type VARCHAR(20) NOT NULL CHECK (max_benefit_type IN ('percentage', 'fixed', 'formula')),
    max_benefit_value DECIMAL(10, 2), -- e.g., 35 for 35%
    max_benefit_cap DECIMAL(15, 2), -- Maximum dollar cap if applicable
    max_benefit_description_en TEXT,
    max_benefit_description_fr TEXT,
    
    -- Program Dates
    program_start_date DATE,
    program_end_date DATE, -- NULL if ongoing
    application_deadline VARCHAR(100), -- e.g., "18 months after fiscal year end"
    
    -- Government Source (for dynamic updates)
    source_url VARCHAR(500) NOT NULL, -- Official government documentation URL
    source_agency VARCHAR(100) NOT NULL, -- 'CRA', 'Revenu Quebec', 'Ontario Creates', etc.
    source_last_checked TIMESTAMP WITH TIME ZONE,
    source_last_updated TIMESTAMP WITH TIME ZONE,
    source_version VARCHAR(50), -- Version/revision from source
    
    -- Partner Referral
    partner_referral_enabled BOOLEAN DEFAULT false,
    partner_id VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tax_credit_definitions_jurisdiction ON reporting.tax_credit_definitions(jurisdiction);
CREATE INDEX idx_tax_credit_definitions_province ON reporting.tax_credit_definitions(province);
CREATE INDEX idx_tax_credit_definitions_active ON reporting.tax_credit_definitions(is_active);

-- Tax Credit Industry Applicability
CREATE TABLE IF NOT EXISTS reporting.tax_credit_industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_credit_id VARCHAR(100) NOT NULL REFERENCES reporting.tax_credit_definitions(id) ON DELETE CASCADE,
    industry_id VARCHAR(50) NOT NULL,
    relevance_score INTEGER DEFAULT 100 CHECK (relevance_score BETWEEN 1 AND 100), -- How relevant to industry (100 = highly relevant)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tax_credit_id, industry_id)
);

CREATE INDEX idx_tax_credit_industries_credit ON reporting.tax_credit_industries(tax_credit_id);
CREATE INDEX idx_tax_credit_industries_industry ON reporting.tax_credit_industries(industry_id);

-- Tax Credit Eligibility Criteria (data-driven rules)
CREATE TABLE IF NOT EXISTS reporting.tax_credit_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_credit_id VARCHAR(100) NOT NULL REFERENCES reporting.tax_credit_definitions(id) ON DELETE CASCADE,
    
    -- Criterion Definition
    criterion_key VARCHAR(100) NOT NULL, -- e.g., 'rd_expenditures', 'technical_employees'
    metric_key VARCHAR(100) NOT NULL, -- Gold layer metric to check
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('gt', 'gte', 'lt', 'lte', 'eq', 'between', 'exists')),
    threshold_value DECIMAL(15, 2), -- Single value for gt, gte, lt, lte, eq
    threshold_min DECIMAL(15, 2), -- For 'between' operator
    threshold_max DECIMAL(15, 2), -- For 'between' operator
    
    -- Scoring
    weight INTEGER NOT NULL DEFAULT 50 CHECK (weight BETWEEN 1 AND 100), -- Weight for eligibility scoring
    is_required BOOLEAN DEFAULT false, -- If true, failing this makes credit ineligible
    
    -- Description
    description_en TEXT NOT NULL,
    description_fr TEXT NOT NULL,
    
    -- Source
    source_section VARCHAR(255), -- Section of government documentation
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tax_credit_id, criterion_key)
);

CREATE INDEX idx_tax_credit_criteria_credit ON reporting.tax_credit_criteria(tax_credit_id);
CREATE INDEX idx_tax_credit_criteria_metric ON reporting.tax_credit_criteria(metric_key);

-- Tax Credit Rates (historical and current rates)
CREATE TABLE IF NOT EXISTS reporting.tax_credit_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_credit_id VARCHAR(100) NOT NULL REFERENCES reporting.tax_credit_definitions(id) ON DELETE CASCADE,
    
    -- Rate Details
    rate_type VARCHAR(50) NOT NULL, -- 'base', 'enhanced', 'small_business', etc.
    rate_percentage DECIMAL(5, 2) NOT NULL,
    rate_cap DECIMAL(15, 2), -- Dollar cap if applicable
    
    -- Applicability
    effective_date DATE NOT NULL,
    end_date DATE, -- NULL if current
    conditions JSONB, -- Additional conditions for this rate
    
    -- Source
    source_url VARCHAR(500),
    source_announcement_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tax_credit_id, rate_type, effective_date)
);

CREATE INDEX idx_tax_credit_rates_credit ON reporting.tax_credit_rates(tax_credit_id);
CREATE INDEX idx_tax_credit_rates_effective ON reporting.tax_credit_rates(effective_date);

-- Tax Credit Sync Log (tracks updates from government sources)
CREATE TABLE IF NOT EXISTS reporting.tax_credit_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tax_credit_id VARCHAR(100) REFERENCES reporting.tax_credit_definitions(id),
    sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
    source_url VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'no_changes')),
    changes_detected BOOLEAN DEFAULT false,
    changes_summary JSONB, -- What changed
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tax_credit_sync_log_credit ON reporting.tax_credit_sync_log(tax_credit_id);
CREATE INDEX idx_tax_credit_sync_log_status ON reporting.tax_credit_sync_log(status);

-- ============================================
-- GOVERNMENT SOURCE REGISTRY
-- ============================================

-- Registry of government data sources for tax credits
CREATE TABLE IF NOT EXISTS reporting.government_sources (
    id VARCHAR(100) PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    agency_name_fr VARCHAR(255),
    jurisdiction VARCHAR(20) NOT NULL,
    province VARCHAR(2),
    
    -- API/Scraping Configuration
    base_url VARCHAR(500) NOT NULL,
    api_endpoint VARCHAR(500), -- If they have an API
    api_key_required BOOLEAN DEFAULT false,
    scrape_selectors JSONB, -- CSS selectors for scraping
    
    -- Update Schedule
    check_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (check_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    last_checked TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE,
    
    -- Contact
    contact_email VARCHAR(255),
    contact_url VARCHAR(500),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================

-- Schema only, retained from local-dev/init-tenant-permissions.sql; no fixture/customer rows.
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
