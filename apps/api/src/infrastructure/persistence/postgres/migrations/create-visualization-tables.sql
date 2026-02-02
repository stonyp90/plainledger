-- ============================================
-- Visualization Tables Migration
-- ============================================
-- Creates tables for saved visualizations and custom entities
-- Run this migration after initial schema setup

-- ============================================
-- Visualizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS visualizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  description_en TEXT,
  config JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  category VARCHAR(50),
  thumbnail VARCHAR(500)
);

-- Indexes for visualizations
CREATE INDEX IF NOT EXISTS idx_visualizations_org_created_by 
  ON visualizations(organization_id, created_by);

CREATE INDEX IF NOT EXISTS idx_visualizations_org_public 
  ON visualizations(organization_id, is_public);

CREATE INDEX IF NOT EXISTS idx_visualizations_org_category 
  ON visualizations(organization_id, category);

CREATE INDEX IF NOT EXISTS idx_visualizations_tags_gin 
  ON visualizations USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_visualizations_config_gin 
  ON visualizations USING gin(config);

-- ============================================
-- Custom Entities Table
-- ============================================
CREATE TABLE IF NOT EXISTS custom_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description TEXT,
  description_en TEXT,
  icon VARCHAR(50),
  definition JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE
);

-- Indexes for custom entities
CREATE INDEX IF NOT EXISTS idx_custom_entities_org_created_by 
  ON custom_entities(organization_id, created_by);

CREATE INDEX IF NOT EXISTS idx_custom_entities_org_public 
  ON custom_entities(organization_id, is_public);

CREATE INDEX IF NOT EXISTS idx_custom_entities_definition_gin 
  ON custom_entities USING gin(definition);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE visualizations IS 'Saved visualizations (charts, dashboards)';
COMMENT ON TABLE custom_entities IS 'Reusable pre-configured data source joins';

COMMENT ON COLUMN visualizations.config IS 'Visualization configuration (JSON)';
COMMENT ON COLUMN custom_entities.definition IS 'Custom entity definition (sources, joins, fields)';
