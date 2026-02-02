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
-- SEED GOVERNMENT SOURCES
-- ============================================

INSERT INTO reporting.government_sources (id, agency_name, agency_name_fr, jurisdiction, province, base_url, api_endpoint, check_frequency)
VALUES
    -- Federal
    ('cra', 'Canada Revenue Agency', 'Agence du revenu du Canada', 'federal', NULL, 
     'https://www.canada.ca/en/revenue-agency.html', 
     'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html',
     'weekly'),
    ('ised', 'Innovation, Science and Economic Development Canada', 'Innovation, Sciences et Développement économique Canada', 'federal', NULL,
     'https://ised-isde.canada.ca/site/ised/en',
     NULL,
     'monthly'),
    ('nrc', 'National Research Council', 'Conseil national de recherches', 'federal', NULL,
     'https://nrc.canada.ca/en',
     NULL,
     'monthly'),
    ('agriculture_canada', 'Agriculture and Agri-Food Canada', 'Agriculture et Agroalimentaire Canada', 'federal', NULL,
     'https://agriculture.canada.ca/en',
     'https://agriculture.canada.ca/en/programs',
     'monthly'),
    
    -- Quebec
    ('revenu_quebec', 'Revenu Québec', 'Revenu Québec', 'provincial', 'QC',
     'https://www.revenuquebec.ca/en/businesses/',
     'https://www.revenuquebec.ca/en/businesses/tax-credits/',
     'weekly'),
    ('investissement_quebec', 'Investissement Québec', 'Investissement Québec', 'provincial', 'QC',
     'https://www.investquebec.com/quebec/en/',
     'https://www.investquebec.com/quebec/en/financial-products/tax-credits.html',
     'weekly'),
    ('sodec', 'SODEC', 'SODEC', 'provincial', 'QC',
     'https://www.sodec.gouv.qc.ca/en/',
     'https://www.sodec.gouv.qc.ca/en/programs/',
     'monthly'),
    
    -- Ontario
    ('ontario_creates', 'Ontario Creates', 'Ontario Creates', 'provincial', 'ON',
     'https://www.ontariocreates.ca/',
     'https://www.ontariocreates.ca/tax-incentives',
     'weekly'),
    ('ontario_finance', 'Ontario Ministry of Finance', 'Ministère des Finances de l''Ontario', 'provincial', 'ON',
     'https://www.ontario.ca/page/ministry-finance',
     'https://www.ontario.ca/page/tax-credits-and-benefits-businesses',
     'monthly'),
    
    -- British Columbia
    ('bc_film', 'Creative BC', 'Creative BC', 'provincial', 'BC',
     'https://www.creativebc.com/',
     'https://www.creativebc.com/programs/tax-credits/',
     'monthly'),
    ('bc_finance', 'BC Ministry of Finance', 'Ministère des Finances de la C.-B.', 'provincial', 'BC',
     'https://www2.gov.bc.ca/gov/content/taxes',
     'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/corporate/credits',
     'monthly'),
    
    -- Alberta
    ('alberta_jobs', 'Alberta Jobs, Economy and Trade', 'Emplois, Économie et Commerce de l''Alberta', 'provincial', 'AB',
     'https://www.alberta.ca/jobs-economy-and-innovation.aspx',
     'https://www.alberta.ca/innovation-employment-grant.aspx',
     'monthly'),
    ('alberta_film', 'Alberta Film Commission', 'Alberta Film Commission', 'provincial', 'AB',
     'https://www.albertafilm.ca/',
     'https://www.alberta.ca/film-and-television-tax-credit.aspx',
     'monthly')
ON CONFLICT (id) DO UPDATE SET
    base_url = EXCLUDED.base_url,
    api_endpoint = EXCLUDED.api_endpoint,
    updated_at = NOW();

-- ============================================
-- SEED TAX CREDIT DEFINITIONS
-- ============================================

-- Federal Credits
INSERT INTO reporting.tax_credit_definitions (
    id, name_en, name_fr, short_name_en, short_name_fr, description_en, description_fr,
    jurisdiction, province, credit_type, max_benefit_type, max_benefit_value,
    max_benefit_description_en, max_benefit_description_fr,
    source_url, source_agency, partner_referral_enabled, is_active
) VALUES
    -- SR&ED
    ('sred', 
     'Scientific Research and Experimental Development Tax Credit',
     'Crédit d''impôt pour la recherche scientifique et le développement expérimental',
     'SR&ED', 'RSDE',
     'Canada''s largest R&D tax credit program, providing refundable credits for scientific research and experimental development activities.',
     'Le plus grand programme de crédit d''impôt R-D du Canada, offrant des crédits remboursables pour les activités de recherche scientifique et de développement expérimental.',
     'federal', NULL, 'refundable', 'percentage', 35,
     'Up to 35% refundable credit on eligible R&D expenditures (15% for large corporations)',
     'Jusqu''à 35% de crédit remboursable sur les dépenses admissibles en R-D (15% pour les grandes entreprises)',
     'https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html',
     'CRA', true, true),
    
    -- Clean Tech ITC
    ('clean_tech',
     'Clean Technology Investment Tax Credit',
     'Crédit d''impôt à l''investissement en technologies propres',
     'Clean Tech ITC', 'CITP',
     'Refundable tax credit for investments in clean technology equipment and property.',
     'Crédit d''impôt remboursable pour les investissements dans l''équipement et les biens de technologies propres.',
     'federal', NULL, 'refundable', 'percentage', 30,
     '30% refundable credit on eligible clean technology equipment',
     '30% de crédit remboursable sur l''équipement de technologies propres admissible',
     'https://www.canada.ca/en/department-finance/programs/consultations/2022/clean-technology-investment-tax-credit.html',
     'CRA', true, true),
    
    -- Apprenticeship
    ('apprenticeship',
     'Apprenticeship Job Creation Tax Credit',
     'Crédit d''impôt pour la création d''emplois d''apprentis',
     'Apprenticeship Credit', 'Crédit apprentissage',
     'Non-refundable tax credit for employers who hire eligible apprentices in Red Seal trades.',
     'Crédit d''impôt non remboursable pour les employeurs qui embauchent des apprentis admissibles dans des métiers Sceau rouge.',
     'federal', NULL, 'non-refundable', 'fixed', 2000,
     '$2,000 per eligible apprentice per year',
     '2 000 $ par apprenti admissible par année',
     'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/special-situations/apprenticeship-incentive-programs.html',
     'CRA', false, true),
    
    -- Training Credit
    ('training_credit',
     'Canada Training Credit',
     'Crédit canadien pour la formation',
     'Training Credit', 'Crédit formation',
     'Refundable credit to help cover the cost of eligible training fees.',
     'Crédit remboursable pour aider à couvrir le coût des frais de formation admissibles.',
     'federal', NULL, 'refundable', 'percentage', 50,
     '50% of eligible training costs, up to $250 per year',
     '50% des coûts de formation admissibles, jusqu''à 250 $ par année',
     'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-45350-canada-training-credit.html',
     'CRA', false, true),
    
    -- AgriInvest
    ('agri_invest',
     'AgriInvest',
     'AgriInvestissement',
     'AgriInvest', 'AgriInv',
     'Self-managed savings account where government matches producer deposits to help manage income declines.',
     'Compte d''épargne autogéré où le gouvernement égale les dépôts des producteurs pour aider à gérer les baisses de revenus.',
     'federal', NULL, 'refundable', 'percentage', 1,
     'Government matches up to 1% of allowable net sales (max $10,000/year)',
     'Le gouvernement égale jusqu''à 1% des ventes nettes admissibles (max 10 000$/an)',
     'https://agriculture.canada.ca/en/programs/agriinvest',
     'Agriculture and Agri-Food Canada', false, true),
    
    -- AgriStability
    ('agri_stability',
     'AgriStability',
     'Agri-stabilité',
     'AgriStability', 'Agri-stab',
     'Income stabilization program protecting farmers against large margin declines.',
     'Programme de stabilisation des revenus protégeant les agriculteurs contre les importantes baisses de marge.',
     'federal', NULL, 'refundable', 'percentage', 70,
     'Covers 70% of margin decline below reference margin',
     'Couvre 70% de la baisse de marge sous la marge de référence',
     'https://agriculture.canada.ca/en/programs/agristability',
     'Agriculture and Agri-Food Canada', false, true),

    -- Quebec Credits
    ('cric',
     'Tax Credit for Research, Innovation and Commercialization',
     'Crédit d''impôt pour la recherche, l''innovation et la commercialisation',
     'CRIC', 'CRIC',
     'Quebec''s flagship R&D tax credit for research, innovation, and commercialization activities.',
     'Le crédit d''impôt R-D phare du Québec pour les activités de recherche, d''innovation et de commercialisation.',
     'provincial', 'QC', 'refundable', 'percentage', 30,
     '20% base rate, 30% enhanced rate for up to $1M in eligible expenditures',
     'Taux de base de 20%, taux majoré de 30% pour jusqu''à 1 M$ de dépenses admissibles',
     'https://www.revenuquebec.ca/en/businesses/tax-credits/tax-credit-for-research-innovation-and-commercialization/',
     'Revenu Québec', true, true),
    
    ('cdae',
     'Tax Credit for E-Business Development',
     'Crédit d''impôt pour le développement des affaires électroniques',
     'CDAE', 'CDAE',
     'Refundable tax credit for Quebec IT companies with 6+ technical employees.',
     'Crédit d''impôt remboursable pour les entreprises TI québécoises avec 6+ employés techniques.',
     'provincial', 'QC', 'refundable', 'percentage', 30,
     '30% of eligible salaries (24% refundable + 6% non-refundable), max $25,000 per employee',
     '30% des salaires admissibles (24% remboursable + 6% non remboursable), max 25 000 $ par employé',
     'https://www.investquebec.com/quebec/en/financial-products/tax-credits/tax-credit-for-the-development-of-e-business-cdae.html',
     'Investissement Québec', true, true),

    -- Ontario Credits
    ('oidmtc',
     'Ontario Interactive Digital Media Tax Credit',
     'Crédit d''impôt de l''Ontario pour les médias interactifs numériques',
     'OIDMTC', 'OIDMTC',
     'Refundable tax credit for qualifying corporations developing interactive digital media products in Ontario.',
     'Crédit d''impôt remboursable pour les sociétés admissibles développant des produits de médias numériques interactifs en Ontario.',
     'provincial', 'ON', 'refundable', 'percentage', 40,
     '40% on eligible Ontario labour (35% for fee-for-service), no annual cap',
     '40% sur la main-d''œuvre ontarienne admissible (35% pour les services à forfait), aucun plafond annuel',
     'https://www.ontariocreates.ca/tax-incentives/oidmtc',
     'Ontario Creates', true, true),
    
    ('ommitc',
     'Ontario Made Manufacturing Investment Tax Credit',
     'Crédit d''impôt de l''Ontario pour l''investissement dans la fabrication',
     'OMMITC', 'OMMITC',
     'Refundable tax credit for Canadian-controlled private corporations investing in manufacturing in Ontario.',
     'Crédit d''impôt remboursable pour les SPCC investissant dans la fabrication en Ontario.',
     'provincial', 'ON', 'refundable', 'percentage', 10,
     '10% refundable credit on eligible manufacturing investments, max $2M per year',
     '10% de crédit remboursable sur les investissements manufacturiers admissibles, max 2 M$ par année',
     'https://www.ontario.ca/page/ontario-made-manufacturing-investment-tax-credit',
     'Ontario Ministry of Finance', true, true),

    -- BC Credits
    ('bc_sred',
     'BC Scientific Research and Experimental Development Tax Credit',
     'Crédit d''impôt RSDE de la Colombie-Britannique',
     'BC SR&ED', 'RSDE C.-B.',
     'BC''s provincial SR&ED credit, providing additional refundable credit on top of the federal program.',
     'Crédit RSDE provincial de la C.-B., offrant un crédit remboursable additionnel au programme fédéral.',
     'provincial', 'BC', 'refundable', 'percentage', 10,
     '10% refundable credit on BC R&D wages (additional to federal SR&ED)',
     '10% de crédit remboursable sur les salaires R-D en C.-B. (en plus du RSDE fédéral)',
     'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/corporate/credits/scientific-research-development',
     'BC Ministry of Finance', true, true),
    
    ('bc_film',
     'BC Film and Television Tax Credit',
     'Crédit d''impôt pour la production cinématographique et télévisuelle de la C.-B.',
     'BC Film', 'Film C.-B.',
     'BC''s film and television tax credit program for domestic and foreign productions.',
     'Programme de crédit d''impôt cinématographique et télévisuel de la C.-B. pour les productions nationales et étrangères.',
     'provincial', 'BC', 'refundable', 'percentage', 35,
     '28-35% refundable credit on BC labour expenditures',
     '28-35% de crédit remboursable sur les dépenses de main-d''œuvre en C.-B.',
     'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/corporate/credits/film-television',
     'Creative BC', true, true),

    -- Alberta Credits
    ('ab_innovation',
     'Alberta Innovation Employment Grant',
     'Subvention albertaine pour l''emploi en innovation',
     'AB IEG', 'SAI Alberta',
     'Alberta''s R&D tax credit providing refundable credits on eligible innovation expenditures.',
     'Crédit d''impôt R-D de l''Alberta offrant des crédits remboursables sur les dépenses d''innovation admissibles.',
     'provincial', 'AB', 'refundable', 'percentage', 20,
     '8-20% refundable credit on Alberta R&D wages',
     '8-20% de crédit remboursable sur les salaires R-D en Alberta',
     'https://www.alberta.ca/innovation-employment-grant.aspx',
     'Alberta Jobs, Economy and Trade', true, true),
    
    ('ab_film',
     'Alberta Film and Television Tax Credit',
     'Crédit d''impôt pour la production cinématographique et télévisuelle de l''Alberta',
     'AB Film', 'Film Alberta',
     'Alberta''s film and television tax credit for productions in the province.',
     'Crédit d''impôt cinématographique et télévisuel de l''Alberta pour les productions dans la province.',
     'provincial', 'AB', 'refundable', 'percentage', 30,
     '22-30% refundable credit on Alberta production costs',
     '22-30% de crédit remboursable sur les coûts de production en Alberta',
     'https://www.alberta.ca/film-and-television-tax-credit.aspx',
     'Alberta Film Commission', true, true)

ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_fr = EXCLUDED.name_fr,
    description_en = EXCLUDED.description_en,
    description_fr = EXCLUDED.description_fr,
    max_benefit_value = EXCLUDED.max_benefit_value,
    max_benefit_description_en = EXCLUDED.max_benefit_description_en,
    max_benefit_description_fr = EXCLUDED.max_benefit_description_fr,
    source_url = EXCLUDED.source_url,
    updated_at = NOW();

-- ============================================
-- SEED INDUSTRY APPLICABILITY
-- ============================================

-- SR&ED applicable industries
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('sred', 'technology', 100),
    ('sred', 'manufacturing', 95),
    ('sred', 'healthcare', 85),
    ('sred', 'professional_services', 80),
    ('sred', 'agriculture', 70),
    ('sred', 'construction', 60)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Clean Tech applicable industries
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('clean_tech', 'manufacturing', 100),
    ('clean_tech', 'technology', 90),
    ('clean_tech', 'agriculture', 85),
    ('clean_tech', 'transport', 80),
    ('clean_tech', 'construction', 75),
    ('clean_tech', 'real_estate', 70)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Apprenticeship applicable industries
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('apprenticeship', 'construction', 100),
    ('apprenticeship', 'manufacturing', 95),
    ('apprenticeship', 'automotive', 90),
    ('apprenticeship', 'transport', 80)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Training Credit - all industries
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('training_credit', 'technology', 80),
    ('training_credit', 'professional_services', 80),
    ('training_credit', 'manufacturing', 80),
    ('training_credit', 'healthcare', 80),
    ('training_credit', 'construction', 80),
    ('training_credit', 'retail', 70),
    ('training_credit', 'hospitality', 70),
    ('training_credit', 'restaurant', 70),
    ('training_credit', 'real_estate', 70),
    ('training_credit', 'agriculture', 70),
    ('training_credit', 'transport', 70),
    ('training_credit', 'education', 70),
    ('training_credit', 'wholesale', 70),
    ('training_credit', 'automotive', 70),
    ('training_credit', 'beauty_wellness', 70)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- AgriInvest & AgriStability - agriculture only
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('agri_invest', 'agriculture', 100),
    ('agri_stability', 'agriculture', 100)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Quebec credits
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('cric', 'technology', 100),
    ('cric', 'manufacturing', 95),
    ('cric', 'healthcare', 85),
    ('cric', 'professional_services', 80),
    ('cdae', 'technology', 100)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Ontario credits
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('oidmtc', 'technology', 100),
    ('ommitc', 'manufacturing', 100)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- BC credits
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('bc_sred', 'technology', 100),
    ('bc_sred', 'manufacturing', 95),
    ('bc_sred', 'healthcare', 85),
    ('bc_film', 'technology', 100)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- Alberta credits
INSERT INTO reporting.tax_credit_industries (tax_credit_id, industry_id, relevance_score) VALUES
    ('ab_innovation', 'technology', 100),
    ('ab_innovation', 'manufacturing', 95),
    ('ab_innovation', 'healthcare', 85),
    ('ab_film', 'technology', 100)
ON CONFLICT (tax_credit_id, industry_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

-- ============================================
-- SEED ELIGIBILITY CRITERIA
-- ============================================

-- SR&ED criteria
INSERT INTO reporting.tax_credit_criteria (tax_credit_id, criterion_key, metric_key, operator, threshold_value, weight, is_required, description_en, description_fr)
VALUES
    ('sred', 'rd_expenditures', 'development_costs', 'gt', 0, 40, true,
     'Company has R&D expenditures (development costs, research salaries)',
     'L''entreprise a des dépenses en R-D (coûts de développement, salaires de recherche)'),
    ('sred', 'technical_employees', 'technical_employee_count', 'gte', 1, 25, false,
     'Has technical employees (engineers, developers, researchers)',
     'A des employés techniques (ingénieurs, développeurs, chercheurs)'),
    ('sred', 'revenue_activity', 'yoy_revenue_change_pct', 'gt', -50, 15, false,
     'Company is actively developing (not winding down)',
     'L''entreprise développe activement (pas en fermeture)')
ON CONFLICT (tax_credit_id, criterion_key) DO UPDATE SET
    weight = EXCLUDED.weight,
    description_en = EXCLUDED.description_en,
    description_fr = EXCLUDED.description_fr;

-- Clean Tech criteria
INSERT INTO reporting.tax_credit_criteria (tax_credit_id, criterion_key, metric_key, operator, threshold_value, weight, is_required, description_en, description_fr)
VALUES
    ('clean_tech', 'clean_tech_investment', 'clean_tech_investments', 'gt', 0, 50, true,
     'Investments in clean technology equipment (solar, wind, electric vehicles, etc.)',
     'Investissements dans l''équipement de technologies propres (solaire, éolien, véhicules électriques, etc.)'),
    ('clean_tech', 'operational', 'total_revenue', 'gt', 0, 20, false,
     'Company is operational',
     'L''entreprise est opérationnelle')
ON CONFLICT (tax_credit_id, criterion_key) DO UPDATE SET
    weight = EXCLUDED.weight,
    description_en = EXCLUDED.description_en;

-- CDAE criteria (Quebec e-business)
INSERT INTO reporting.tax_credit_criteria (tax_credit_id, criterion_key, metric_key, operator, threshold_value, weight, is_required, description_en, description_fr)
VALUES
    ('cdae', 'tech_employees', 'technical_employee_count', 'gte', 6, 50, true,
     'Has at least 6 technical employees in Quebec',
     'A au moins 6 employés techniques au Québec'),
    ('cdae', 'quebec_operations', 'quebec_operations', 'eq', 1, 30, true,
     'Company operates in Quebec',
     'L''entreprise opère au Québec'),
    ('cdae', 'tech_revenue', 'technology_revenue', 'gt', 0, 20, false,
     'Generates revenue from technology/software activities',
     'Génère des revenus d''activités technologiques/logicielles')
ON CONFLICT (tax_credit_id, criterion_key) DO UPDATE SET
    weight = EXCLUDED.weight,
    description_en = EXCLUDED.description_en;

-- AgriInvest criteria
INSERT INTO reporting.tax_credit_criteria (tax_credit_id, criterion_key, metric_key, operator, threshold_value, weight, is_required, description_en, description_fr)
VALUES
    ('agri_invest', 'farm_sales', 'crop_sales', 'gt', 0, 50, true,
     'Has agricultural sales (crops, livestock)',
     'A des ventes agricoles (cultures, bétail)'),
    ('agri_invest', 'minimum_income', 'total_revenue', 'gte', 10000, 30, false,
     'Minimum $10,000 in farm income',
     'Minimum 10 000$ en revenus agricoles')
ON CONFLICT (tax_credit_id, criterion_key) DO UPDATE SET
    weight = EXCLUDED.weight,
    description_en = EXCLUDED.description_en;

-- OIDMTC criteria (Ontario interactive digital media)
INSERT INTO reporting.tax_credit_criteria (tax_credit_id, criterion_key, metric_key, operator, threshold_value, weight, is_required, description_en, description_fr)
VALUES
    ('oidmtc', 'ontario_operations', 'ontario_operations', 'eq', 1, 35, true,
     'Company operates in Ontario',
     'L''entreprise opère en Ontario'),
    ('oidmtc', 'digital_media_work', 'digital_media_revenue', 'gt', 0, 40, true,
     'Develops interactive digital media products (games, VR/AR, e-learning)',
     'Développe des produits de médias numériques interactifs (jeux, VR/AR, e-learning)'),
    ('oidmtc', 'ontario_labour', 'ontario_labour_expenditures', 'gt', 0, 25, false,
     'Has Ontario labour expenditures for digital media development',
     'A des dépenses de main-d''œuvre ontarienne pour le développement de médias numériques')
ON CONFLICT (tax_credit_id, criterion_key) DO UPDATE SET
    weight = EXCLUDED.weight,
    description_en = EXCLUDED.description_en;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.tax_credit_definitions TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.tax_credit_industries TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.tax_credit_criteria TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.tax_credit_rates TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.tax_credit_sync_log TO plainledger;
GRANT SELECT, INSERT, UPDATE, DELETE ON reporting.government_sources TO plainledger;
