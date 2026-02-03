-- ============================================
-- Enable pgvector Extension
-- ============================================
-- This runs after init-db.sql and init-datalake.sql

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Add embedding columns to existing tables
-- ============================================

-- Accounts table - for semantic search (in accounting schema)
ALTER TABLE accounting.accounts ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE accounting.accounts ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE accounting.accounts ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Journal entries table - for semantic search (transactions are journal entries in this schema)
ALTER TABLE accounting.journal_entries ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE accounting.journal_entries ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE accounting.journal_entries ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

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
  FROM accounting.accounts a
  WHERE 
    a.organization_id = org_id
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Search for similar journal entries
CREATE OR REPLACE FUNCTION search_similar_journal_entries(
  query_embedding vector(1536),
  org_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  description TEXT,
  total_amount DECIMAL,
  entry_date DATE,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.id,
    je.description,
    je.total_amount,
    je.entry_date,
    1 - (je.embedding <=> query_embedding) AS similarity
  FROM accounting.journal_entries je
  WHERE 
    je.organization_id = org_id
    AND je.embedding IS NOT NULL
    AND 1 - (je.embedding <=> query_embedding) > match_threshold
  ORDER BY je.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Performance Indexes
-- ============================================

-- Accounts table indexes for common queries (in accounting schema)
CREATE INDEX IF NOT EXISTS idx_accounts_org_type 
  ON accounting.accounts(organization_id, account_type) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_accounts_code 
  ON accounting.accounts(organization_id, code) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_accounts_org_active_type 
  ON accounting.accounts(organization_id, is_active, account_type);

-- Partial index for active accounts only
CREATE INDEX IF NOT EXISTS idx_accounts_active_only 
  ON accounting.accounts(organization_id, code) 
  WHERE is_active = true;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Log pgvector setup
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled, similarity search functions created, and performance indexes added';
END $$;
