-- ============================================
-- Enable pgvector Extension
-- ============================================
-- This runs after init-db.sql and init-datalake.sql

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Add embedding columns to existing tables
-- ============================================

-- Accounts table - for semantic search
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Transactions table - for semantic search
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Contacts table - for semantic search
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- ============================================
-- Create IVFFlat indexes for similarity search
-- ============================================
-- Note: IVFFlat requires some data to be present before creating the index
-- These indexes will be created after initial data load via a migration

-- For now, create HNSW indexes which don't require training data
-- These are slightly slower but work immediately

-- CREATE INDEX IF NOT EXISTS idx_accounts_embedding 
--   ON accounts USING hnsw (embedding vector_cosine_ops);

-- CREATE INDEX IF NOT EXISTS idx_transactions_embedding 
--   ON transactions USING hnsw (embedding vector_cosine_ops);

-- CREATE INDEX IF NOT EXISTS idx_contacts_embedding 
--   ON contacts USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- Similarity Search Functions
-- ============================================

-- Search for similar accounts
CREATE OR REPLACE FUNCTION search_similar_accounts(
  query_embedding vector(1536),
  org_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  account_name VARCHAR,
  account_type VARCHAR,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name AS account_name,
    a.account_type,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM accounts a
  WHERE 
    a.organization_id = org_id
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Search for similar transactions
CREATE OR REPLACE FUNCTION search_similar_transactions(
  query_embedding vector(1536),
  org_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  amount DECIMAL,
  transaction_date DATE,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.description,
    t.amount,
    t.transaction_date,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM transactions t
  WHERE 
    t.organization_id = org_id
    AND t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Performance Indexes
-- ============================================

-- Accounts table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_org_type 
  ON accounts(organization_id, account_type) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_accounts_code 
  ON accounts(organization_id, code) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_accounts_org_active_type 
  ON accounts(organization_id, is_active, account_type);

-- Partial index for active accounts only
CREATE INDEX IF NOT EXISTS idx_accounts_active_only 
  ON accounts(organization_id, code) 
  WHERE is_active = true;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Log pgvector setup
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled, similarity search functions created, and performance indexes added';
END $$;
