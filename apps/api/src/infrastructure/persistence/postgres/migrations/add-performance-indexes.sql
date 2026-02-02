-- ============================================
-- Performance Indexes for PlainLedger
-- ============================================
-- These indexes optimize common query patterns
-- Run this migration after initial schema setup

-- Accounts table indexes
CREATE INDEX IF NOT EXISTS idx_accounts_org_type 
  ON accounting.accounts(organization_id, account_type) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_accounts_code 
  ON accounting.accounts(organization_id, code) 
  WHERE is_active = true;

-- Transactions table (if exists) indexes
-- Note: Adjust table name and schema based on actual structure
CREATE INDEX IF NOT EXISTS idx_transactions_org_date 
  ON accounting.transactions(organization_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_account 
  ON accounting.transactions(organization_id, account_id, transaction_date DESC);

-- Embedding indexes (for pgvector similarity search)
-- These will be created after embeddings are populated
-- CREATE INDEX IF NOT EXISTS idx_accounts_embedding_hnsw 
--   ON accounting.accounts USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64)
--   WHERE embedding IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_org_active_type 
  ON accounting.accounts(organization_id, is_active, account_type);

-- Partial indexes for frequently filtered data
CREATE INDEX IF NOT EXISTS idx_accounts_active_only 
  ON accounting.accounts(organization_id, code) 
  WHERE is_active = true;

-- GIN index for JSONB columns (if any)
-- CREATE INDEX IF NOT EXISTS idx_accounts_metadata_gin 
--   ON accounting.accounts USING gin (metadata);

-- ============================================
-- Query Performance Monitoring
-- ============================================
-- Enable pg_stat_statements extension for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================
-- Vacuum and Analyze
-- ============================================
-- Run after creating indexes
-- VACUUM ANALYZE accounting.accounts;
-- VACUUM ANALYZE accounting.transactions;
