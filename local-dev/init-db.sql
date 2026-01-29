-- PlainLedger Financial Reporting Platform
-- Database Initialization Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS integration;

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
-- SEED DATA - Demo Organizations
-- ============================================

-- Insert demo organization (for existing demo users)
INSERT INTO accounting.organizations (tenant_id, name, legal_name, tax_number, fiscal_year_end_month, currency, industry)
VALUES ('demo-org', 'Demo Corp', 'Demo Corporation Inc.', '123456789RT0001', 12, 'USD', 'Technology')
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert demo-signup organization (for new signups - everything locked)
INSERT INTO accounting.organizations (tenant_id, name, legal_name, tax_number, fiscal_year_end_month, currency, industry)
VALUES ('demo-signup', 'Demo Account', 'Demo Account - Contact Us to Unlock', NULL, 12, 'CAD', 'Demo')
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert standard chart of accounts
INSERT INTO accounting.accounts (organization_id, code, name, name_fr, account_type, account_subtype, display_order)
SELECT 
    o.id,
    a.code,
    a.name,
    a.name_fr,
    a.account_type,
    a.account_subtype,
    a.display_order
FROM accounting.organizations o
CROSS JOIN (VALUES
    ('1000', 'Cash and Cash Equivalents', 'Encaisse et equivalents', 'ASSET', 'CURRENT', 10),
    ('1100', 'Accounts Receivable', 'Comptes clients', 'ASSET', 'CURRENT', 20),
    ('1200', 'Inventory', 'Stocks', 'ASSET', 'CURRENT', 30),
    ('1300', 'Prepaid Expenses', 'Frais payes d''avance', 'ASSET', 'CURRENT', 40),
    ('1500', 'Property and Equipment', 'Immobilisations', 'ASSET', 'FIXED', 50),
    ('1600', 'Accumulated Depreciation', 'Amortissement cumule', 'ASSET', 'FIXED', 60),
    ('2000', 'Accounts Payable', 'Comptes fournisseurs', 'LIABILITY', 'CURRENT', 100),
    ('2100', 'Accrued Liabilities', 'Charges a payer', 'LIABILITY', 'CURRENT', 110),
    ('2200', 'Current Portion of Long-term Debt', 'Portion courante dette LT', 'LIABILITY', 'CURRENT', 120),
    ('2500', 'Long-term Debt', 'Dette a long terme', 'LIABILITY', 'LONG_TERM', 150),
    ('3000', 'Share Capital', 'Capital-actions', 'EQUITY', 'CAPITAL', 200),
    ('3100', 'Retained Earnings', 'Benefices non repartis', 'EQUITY', 'RETAINED', 210),
    ('4000', 'Revenue', 'Revenus', 'REVENUE', 'OPERATING', 300),
    ('4100', 'Service Revenue', 'Revenus de services', 'REVENUE', 'OPERATING', 310),
    ('4200', 'Other Income', 'Autres revenus', 'REVENUE', 'OTHER', 320),
    ('5000', 'Cost of Goods Sold', 'Cout des ventes', 'EXPENSE', 'COGS', 400),
    ('6000', 'Salaries and Wages', 'Salaires', 'EXPENSE', 'OPERATING', 500),
    ('6100', 'Rent Expense', 'Loyer', 'EXPENSE', 'OPERATING', 510),
    ('6200', 'Utilities', 'Services publics', 'EXPENSE', 'OPERATING', 520),
    ('6300', 'Professional Fees', 'Honoraires professionnels', 'EXPENSE', 'OPERATING', 530),
    ('6400', 'Depreciation Expense', 'Amortissement', 'EXPENSE', 'OPERATING', 540),
    ('6500', 'Office Supplies', 'Fournitures de bureau', 'EXPENSE', 'OPERATING', 550),
    ('7000', 'Interest Expense', 'Charges d''interets', 'EXPENSE', 'OTHER', 600),
    ('8000', 'Income Tax Expense', 'Impots sur le revenu', 'EXPENSE', 'TAX', 700)
) AS a(code, name, name_fr, account_type, account_subtype, display_order)
WHERE o.tenant_id = 'demo-org';

-- Insert standard chart of accounts for demo-signup organization
INSERT INTO accounting.accounts (organization_id, code, name, name_fr, account_type, account_subtype, display_order)
SELECT 
    o.id,
    a.code,
    a.name,
    a.name_fr,
    a.account_type,
    a.account_subtype,
    a.display_order
FROM accounting.organizations o
CROSS JOIN (VALUES
    ('1000', 'Cash and Cash Equivalents', 'Encaisse et equivalents', 'ASSET', 'CURRENT', 10),
    ('1100', 'Accounts Receivable', 'Comptes clients', 'ASSET', 'CURRENT', 20),
    ('1200', 'Inventory', 'Stocks', 'ASSET', 'CURRENT', 30),
    ('1300', 'Prepaid Expenses', 'Frais payes d''avance', 'ASSET', 'CURRENT', 40),
    ('1500', 'Property and Equipment', 'Immobilisations', 'ASSET', 'FIXED', 50),
    ('1600', 'Accumulated Depreciation', 'Amortissement cumule', 'ASSET', 'FIXED', 60),
    ('2000', 'Accounts Payable', 'Comptes fournisseurs', 'LIABILITY', 'CURRENT', 100),
    ('2100', 'Accrued Liabilities', 'Charges a payer', 'LIABILITY', 'CURRENT', 110),
    ('2200', 'Current Portion of Long-term Debt', 'Portion courante dette LT', 'LIABILITY', 'CURRENT', 120),
    ('2500', 'Long-term Debt', 'Dette a long terme', 'LIABILITY', 'LONG_TERM', 150),
    ('3000', 'Share Capital', 'Capital-actions', 'EQUITY', 'CAPITAL', 200),
    ('3100', 'Retained Earnings', 'Benefices non repartis', 'EQUITY', 'RETAINED', 210),
    ('4000', 'Revenue', 'Revenus', 'REVENUE', 'OPERATING', 300),
    ('4100', 'Service Revenue', 'Revenus de services', 'REVENUE', 'OPERATING', 310),
    ('4200', 'Other Income', 'Autres revenus', 'REVENUE', 'OTHER', 320),
    ('5000', 'Cost of Goods Sold', 'Cout des ventes', 'EXPENSE', 'COGS', 400),
    ('6000', 'Salaries and Wages', 'Salaires', 'EXPENSE', 'OPERATING', 500),
    ('6100', 'Rent Expense', 'Loyer', 'EXPENSE', 'OPERATING', 510),
    ('6200', 'Utilities', 'Services publics', 'EXPENSE', 'OPERATING', 520),
    ('6300', 'Professional Fees', 'Honoraires professionnels', 'EXPENSE', 'OPERATING', 530),
    ('6400', 'Depreciation Expense', 'Amortissement', 'EXPENSE', 'OPERATING', 540),
    ('6500', 'Office Supplies', 'Fournitures de bureau', 'EXPENSE', 'OPERATING', 550),
    ('7000', 'Interest Expense', 'Charges d''interets', 'EXPENSE', 'OTHER', 600),
    ('8000', 'Income Tax Expense', 'Impots sur le revenu', 'EXPENSE', 'TAX', 700)
) AS a(code, name, name_fr, account_type, account_subtype, display_order)
WHERE o.tenant_id = 'demo-signup';

-- Insert default report templates
INSERT INTO reporting.report_templates (name, name_fr, report_type, template_config, is_system, is_ibcs_compliant)
VALUES 
    ('Balance Sheet', 'Bilan', 'BALANCE_SHEET', '{"sections": ["assets", "liabilities", "equity"], "format": "IBCS"}', true, true),
    ('Income Statement', 'Etat des resultats', 'INCOME_STATEMENT', '{"sections": ["revenue", "expenses", "net_income"], "format": "IBCS"}', true, true),
    ('Cash Flow Statement', 'Etat des flux de tresorerie', 'CASH_FLOW', '{"sections": ["operating", "investing", "financing"], "format": "IBCS"}', true, true),
    ('Trial Balance', 'Balance de verification', 'TRIAL_BALANCE', '{"columns": ["debit", "credit"], "format": "STANDARD"}', true, false);

-- ============================================
-- REPORTING SCHEMA - Industry Benchmarks
-- ============================================

-- Industry Benchmarks (from ISED and Statistics Canada)
CREATE TABLE reporting.industry_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    industry_id VARCHAR(50) NOT NULL,              -- PlainLedger industry ID (e.g., 'restaurant', 'construction')
    naics_code VARCHAR(10) NOT NULL,               -- NAICS code (e.g., '7225', '23')
    data_source VARCHAR(20) NOT NULL CHECK (data_source IN ('ised', 'statscan')),
    reference_year INTEGER,                        -- For ISED annual data (e.g., 2022)
    reference_quarter VARCHAR(10),                 -- For Stats Can quarterly (e.g., '2025-Q3')
    revenue_range VARCHAR(20) CHECK (revenue_range IN ('30k-5m', '5m-20m', 'all')),
    
    -- Profitability metrics (stored as decimals, e.g., 0.25 = 25%)
    gross_margin_q1 DECIMAL(5,4),                  -- 25th percentile
    gross_margin_median DECIMAL(5,4),              -- 50th percentile (industry average)
    gross_margin_q3 DECIMAL(5,4),                  -- 75th percentile
    net_margin_q1 DECIMAL(5,4),
    net_margin_median DECIMAL(5,4),
    net_margin_q3 DECIMAL(5,4),
    
    -- Operating metrics
    operating_expense_ratio DECIMAL(5,4),          -- Operating expenses / Revenue
    wages_to_revenue_ratio DECIMAL(5,4),           -- Wages & benefits / Revenue
    rent_to_revenue_ratio DECIMAL(5,4),            -- Rent & occupancy / Revenue
    
    -- Balance sheet ratios
    current_ratio_median DECIMAL(6,2),             -- Current assets / Current liabilities
    debt_to_equity_median DECIMAL(6,2),            -- Total debt / Equity
    
    -- Growth metrics (from Stats Can quarterly data)
    revenue_yoy_growth DECIMAL(5,4),               -- Year-over-year revenue change
    revenue_qoq_growth DECIMAL(5,4),               -- Quarter-over-quarter revenue change
    
    -- Metadata
    sample_size INTEGER,                           -- Number of businesses in sample
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(industry_id, data_source, reference_year, reference_quarter, revenue_range)
);

CREATE INDEX idx_benchmarks_industry ON reporting.industry_benchmarks(industry_id);
CREATE INDEX idx_benchmarks_naics ON reporting.industry_benchmarks(naics_code);
CREATE INDEX idx_benchmarks_source ON reporting.industry_benchmarks(data_source);
CREATE INDEX idx_benchmarks_year ON reporting.industry_benchmarks(reference_year);

-- Benchmark Data Refresh Log
CREATE TABLE reporting.benchmark_refresh_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_source VARCHAR(20) NOT NULL,
    refresh_type VARCHAR(20) NOT NULL CHECK (refresh_type IN ('full', 'incremental')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Grant permissions
GRANT USAGE ON SCHEMA accounting TO plainledger;
GRANT USAGE ON SCHEMA reporting TO plainledger;
GRANT USAGE ON SCHEMA integration TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA accounting TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA reporting TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA integration TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA accounting TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA reporting TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA integration TO plainledger;
