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
