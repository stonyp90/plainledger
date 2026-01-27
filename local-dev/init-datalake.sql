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

-- Grant permissions
GRANT USAGE ON SCHEMA datalake TO plainledger;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA datalake TO plainledger;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA datalake TO plainledger;
