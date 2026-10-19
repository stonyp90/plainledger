/**
 * PlainLedger Pricing Engine
 * 
 * Enterprise-Focused Pricing for Mid-Market Canadian Businesses
 * =============================================================
 * 
 * TARGET MARKET: Canadian enterprises with $2M-$20M+ annual revenue
 * 
 * Key Differentiators:
 * - Dedicated CPA support included in all plans
 * - Enterprise-grade anomaly detection & AI insights
 * - Multi-entity consolidation capabilities
 * - Bank-level security with Canadian data residency
 * - White-glove onboarding and ongoing support
 * 
 * COMPETITIVE POSITIONING:
 * ┌────────────────────┬──────────────┬─────────────────────────────────────────┐
 * │ Competitor         │ Price Range  │ PlainLedger Advantage                   │
 * ├────────────────────┼──────────────┼─────────────────────────────────────────┤
 * │ Fathom Analytics   │ $59-299/mo   │ Dedicated CPA, AI anomaly detection     │
 * │ Jirav              │ $500-2000/mo │ Canadian-first, simpler setup           │
 * │ Vena Solutions     │ $1000+/mo    │ Faster time-to-value, lower complexity  │
 * │ Planful            │ $2000+/mo    │ Mid-market focus, better pricing        │
 * └────────────────────┴──────────────┴─────────────────────────────────────────┘
 * 
 * PRICING TIERS (Revenue-Based):
 * - Essentiel:     $500/mo  - Businesses $2M-$5M revenue
 * - Professionnel: $1,200/mo - Businesses $5M-$10M revenue
 * - Premium:       $2,500/mo - Businesses $10M-$20M revenue
 * - Enterprise:    Custom    - Large organizations $20M+
 * 
 * VALUE PROPOSITION:
 * - ROI: Avg. $50K+ in anomalies caught per year
 * - Time savings: 40+ hours/month on financial reporting
 * - CPA support: Dedicated accountant guidance included
 */

// =====================================================
// TYPES
// =====================================================

export type PricingTier = 'starter' | 'professional' | 'business' | 'enterprise';
export type BillingInterval = 'monthly' | 'yearly';
export type Currency = 'CAD' | 'USD';

export interface UserTierPricing {
  includedUsers: number;
  additionalUserPrice: number; // per additional user per month
  maxUsers: number; // -1 for unlimited
}

export interface UsageBasedFeature {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  unit: string;
  unitFr: string;
  includedQuantity: number;
  pricePerUnit: number; // price per unit after included
  maxQuantity: number; // -1 for unlimited
}

export interface PricingTierConfig {
  id: string;
  tier: PricingTier;
  name: string;
  nameFr: string;
  tagline: string;
  taglineFr: string;
  description: string;
  descriptionFr: string;
  
  // Base pricing
  basePrice: number; // monthly base price
  yearlyDiscount: number; // percentage discount for yearly
  currency: Currency;
  
  // User-based pricing
  userPricing: UserTierPricing;
  
  // Usage-based features
  usageFeatures: UsageBasedFeature[];
  
  // Included features
  features: {
    id: string;
    name: string;
    nameFr: string;
    included: boolean;
    limit?: string;
    limitFr?: string;
  }[];
  
  // Display
  popular?: boolean;
  badge?: string;
  badgeFr?: string;
  ctaText: string;
  ctaTextFr: string;
  
  // Stripe
  stripePriceId?: string;
  stripeYearlyPriceId?: string;
  stripeUserPriceId?: string; // metered price for additional users
}

export interface PricingCalculation {
  tier: PricingTier;
  billingInterval: BillingInterval;
  users: number;
  
  // Costs breakdown
  baseCost: number;
  additionalUsersCost: number;
  usageOverageCost: number;
  
  // Totals
  monthlyTotal: number;
  yearlyTotal: number;
  effectiveMonthly: number; // yearly / 12
  savings: number; // savings with yearly
  
  // Per user
  perUserCost: number;
}

// =====================================================
// USAGE-BASED FEATURES
// =====================================================

const USAGE_FEATURES: Record<string, UsageBasedFeature> = {
  reports: {
    id: 'reports',
    name: 'Financial Reports',
    nameFr: 'Rapports financiers',
    description: 'Balance sheets, income statements, cash flow',
    descriptionFr: 'Bilans, comptes de résultat, flux de trésorerie',
    unit: 'reports/month',
    unitFr: 'rapports/mois',
    includedQuantity: 0,
    pricePerUnit: 0.50,
    maxQuantity: -1,
  },
  aiQueries: {
    id: 'aiQueries',
    name: 'James Assistant Queries',
    nameFr: 'Requêtes assistant IA',
    description: 'Natural language financial queries',
    descriptionFr: 'Requêtes financières en langage naturel',
    unit: 'queries/month',
    unitFr: 'requêtes/mois',
    includedQuantity: 0,
    pricePerUnit: 0.10,
    maxQuantity: -1,
  },
  connections: {
    id: 'connections',
    name: 'Data Source Connections',
    nameFr: 'Connexions de données',
    description: 'Connect to accounting software',
    descriptionFr: 'Connexion aux logiciels comptables',
    unit: 'connections',
    unitFr: 'connexions',
    includedQuantity: 0,
    pricePerUnit: 10,
    maxQuantity: -1,
  },
  storage: {
    id: 'storage',
    name: 'Data Storage',
    nameFr: 'Stockage de données',
    description: 'Historical data retention',
    descriptionFr: 'Rétention des données historiques',
    unit: 'GB',
    unitFr: 'Go',
    includedQuantity: 0,
    pricePerUnit: 1,
    maxQuantity: -1,
  },
};

// =====================================================
// PRICING TIERS
// =====================================================

export const PRICING_TIERS: PricingTierConfig[] = [
  {
    id: 'plan_essentiel',
    tier: 'starter',
    name: 'Essentiel',
    nameFr: 'Essentiel',
    tagline: 'For growing businesses',
    taglineFr: 'Pour entreprises en croissance',
    description: 'Core financial intelligence with CPA support',
    descriptionFr: 'Intelligence financière essentielle avec support CPA',
    
    basePrice: 0, // Contact for quote
    yearlyDiscount: 20,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: 3,
      additionalUserPrice: 0,
      maxUsers: 10,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 500, pricePerUnit: 0 },
      { ...USAGE_FEATURES.connections, includedQuantity: 3, pricePerUnit: 0 },
      { ...USAGE_FEATURES.storage, includedQuantity: 25 },
    ],
    
    features: [
      { id: 'dashboard', name: 'Executive dashboard', nameFr: 'Tableau de bord exécutif', included: true },
      { id: 'anomaly', name: 'Anomaly detection', nameFr: 'Détection d\'anomalies', included: true },
      { id: 'reports', name: 'Monthly reports', nameFr: 'Rapports mensuels', included: true },
      { id: 'cpa_support', name: 'CPA email support', nameFr: 'Support CPA par courriel', included: true },
      { id: 'connections', name: '3 data connections', nameFr: '3 connexions de données', included: true },
      { id: 'export', name: 'Export (PDF/Excel)', nameFr: 'Export (PDF/Excel)', included: true },
      { id: 'team', name: 'Up to 3 users', nameFr: 'Jusqu\'à 3 utilisateurs', included: true },
      { id: 'alerts', name: 'Email alerts', nameFr: 'Alertes par courriel', included: true },
    ],
    
    stripePriceId: 'price_essentiel_monthly',
    stripeYearlyPriceId: 'price_essentiel_yearly',
    stripeUserPriceId: 'price_essentiel_user',
    
    ctaText: 'Get a quote',
    ctaTextFr: 'Demander une soumission',
  },
  {
    id: 'plan_professionnel',
    tier: 'professional',
    name: 'Professionnel',
    nameFr: 'Professionnel',
    tagline: 'For mid-market companies',
    taglineFr: 'Pour entreprises de taille moyenne',
    description: 'Advanced analytics with priority CPA support',
    descriptionFr: 'Analytique avancée avec support CPA prioritaire',
    
    basePrice: 0, // Contact for quote
    yearlyDiscount: 20,
    currency: 'CAD',
    popular: true,
    badge: 'Most Popular',
    badgeFr: 'Plus populaire',
    
    userPricing: {
      includedUsers: 5,
      additionalUserPrice: 0,
      maxUsers: 25,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 2000, pricePerUnit: 0 },
      { ...USAGE_FEATURES.connections, includedQuantity: 10, pricePerUnit: 0 },
      { ...USAGE_FEATURES.storage, includedQuantity: 100 },
    ],
    
    features: [
      { id: 'everything_essentiel', name: 'Everything in Essentiel', nameFr: 'Tout d\'Essentiel', included: true },
      { id: 'weekly_reviews', name: 'Weekly reviews', nameFr: 'Revues hebdomadaires', included: true },
      { id: 'priority_cpa', name: 'Priority CPA (48h)', nameFr: 'CPA prioritaire (48h)', included: true },
      { id: 'advanced_ai', name: 'Advanced AI insights', nameFr: 'Insights IA avancés', included: true },
      { id: 'forecasting', name: 'Cash flow forecasting', nameFr: 'Prévisions de trésorerie', included: true },
      { id: 'budget', name: 'Budget vs Actual', nameFr: 'Budget vs Réel', included: true },
      { id: 'api', name: 'API access', nameFr: 'Accès API', included: true },
      { id: 'alerts', name: 'Slack & Teams alerts', nameFr: 'Alertes Slack & Teams', included: true },
    ],
    
    stripePriceId: 'price_professionnel_monthly',
    stripeYearlyPriceId: 'price_professionnel_yearly',
    stripeUserPriceId: 'price_professionnel_user',
    
    ctaText: 'Get a quote',
    ctaTextFr: 'Demander une soumission',
  },
  {
    id: 'plan_premium',
    tier: 'business',
    name: 'Premium',
    nameFr: 'Premium',
    tagline: 'For established enterprises',
    taglineFr: 'Pour entreprises établies',
    description: 'Full-service with dedicated CPA',
    descriptionFr: 'Service complet avec CPA dédié',
    
    basePrice: 0, // Contact for quote
    yearlyDiscount: 20,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: 10,
      additionalUserPrice: 0,
      maxUsers: 50,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.aiQueries, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.connections, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.storage, includedQuantity: 500 },
    ],
    
    features: [
      { id: 'everything_pro', name: 'Everything in Professionnel', nameFr: 'Tout de Professionnel', included: true },
      { id: 'dedicated_cpa', name: 'Dedicated CPA', nameFr: 'CPA dédié', included: true },
      { id: 'same_day', name: 'Same-day response', nameFr: 'Réponse le jour même', included: true },
      { id: 'multi_entity', name: 'Multi-entity consolidation', nameFr: 'Consolidation multi-entités', included: true },
      { id: 'custom_branding', name: 'Custom branding', nameFr: 'Marque personnalisée', included: true },
      { id: 'board_reports', name: 'Board-ready reports', nameFr: 'Rapports pour CA', included: true },
      { id: 'quarterly_review', name: 'Quarterly business review', nameFr: 'Revue trimestrielle', included: true },
      { id: 'audit', name: 'Advanced audit logs', nameFr: 'Journaux d\'audit avancés', included: true },
    ],
    
    stripePriceId: 'price_premium_monthly',
    stripeYearlyPriceId: 'price_premium_yearly',
    stripeUserPriceId: 'price_premium_user',
    
    ctaText: 'Get a quote',
    ctaTextFr: 'Demander une soumission',
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Entreprise',
    tagline: 'For large organizations',
    taglineFr: 'Pour grandes organisations',
    description: 'White-glove service with dedicated support',
    descriptionFr: 'Service personnalisé avec support dédié',
    
    basePrice: 0, // Contact for quote
    yearlyDiscount: 25,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: -1,
      additionalUserPrice: 0,
      maxUsers: -1,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.aiQueries, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.connections, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.storage, includedQuantity: -1, pricePerUnit: 0 },
    ],
    
    features: [
      { id: 'everything_premium', name: 'Everything in Premium', nameFr: 'Tout de Premium', included: true },
      { id: 'unlimited_users', name: 'Unlimited team members', nameFr: 'Utilisateurs illimités', included: true },
      { id: 'unlimited_ai', name: 'Unlimited AI queries', nameFr: 'Requêtes IA illimitées', included: true },
      { id: 'sso', name: 'SSO (SAML/OIDC)', nameFr: 'SSO (SAML/OIDC)', included: true },
      { id: 'sla', name: '99.9% SLA', nameFr: 'SLA 99.9%', included: true },
      { id: 'dedicated_manager', name: 'Dedicated account manager', nameFr: 'Gestionnaire de compte dédié', included: true },
      { id: 'onboarding', name: 'Custom onboarding', nameFr: 'Intégration personnalisée', included: true },
      { id: 'training', name: 'On-site training', nameFr: 'Formation sur site', included: true },
    ],
    
    ctaText: 'Get a quote',
    ctaTextFr: 'Demander une soumission',
  },
];

// =====================================================
// CPA PARTNER PROGRAM
// =====================================================

export interface CPAPartnerPricing {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  clientSeats: number; // Number of client organizations
  teamMembers: number; // Staff at the accounting firm
  pricePerClient: number; // Per client organization per month
  minimumClients: number;
  features: string[];
  featuresFr: string[];
}

export const CPA_PARTNER_TIERS: CPAPartnerPricing[] = [
  {
    id: 'cpa_starter',
    name: 'CPA Starter',
    nameFr: 'CPA Démarrage',
    description: 'For small accounting practices',
    descriptionFr: 'Pour les petits cabinets comptables',
    clientSeats: 10,
    teamMembers: 3,
    pricePerClient: 25, // Per client
    minimumClients: 5,
    features: [
      'Manage up to 10 clients',
      'Client dashboard access',
      'Bulk reporting',
      'Partner portal',
      'Priority support',
    ],
    featuresFr: [
      'Gérez jusqu\'à 10 clients',
      'Accès tableau de bord client',
      'Rapports en lot',
      'Portail partenaire',
      'Support prioritaire',
    ],
  },
  {
    id: 'cpa_professional',
    name: 'CPA Professional',
    nameFr: 'CPA Professionnel',
    description: 'For growing accounting firms',
    descriptionFr: 'Pour les cabinets en croissance',
    clientSeats: 50,
    teamMembers: 10,
    pricePerClient: 20, // Volume discount
    minimumClients: 10,
    features: [
      'Manage up to 50 clients',
      'All Professional features',
      'White-label reports',
      'Client onboarding tools',
      'Dedicated success manager',
      'API access',
    ],
    featuresFr: [
      'Gérez jusqu\'à 50 clients',
      'Toutes les fonctionnalités Pro',
      'Rapports en marque blanche',
      'Outils d\'intégration client',
      'Gestionnaire de succès dédié',
      'Accès API',
    ],
  },
  {
    id: 'cpa_enterprise',
    name: 'CPA Enterprise',
    nameFr: 'CPA Entreprise',
    description: 'For large accounting firms',
    descriptionFr: 'Pour les grands cabinets',
    clientSeats: -1, // Unlimited
    teamMembers: -1,
    pricePerClient: 15, // Best volume discount
    minimumClients: 25,
    features: [
      'Unlimited clients',
      'All Enterprise features',
      'Custom integrations',
      'On-site training',
      'SLA guarantee',
      'Co-marketing opportunities',
    ],
    featuresFr: [
      'Clients illimités',
      'Toutes les fonctionnalités Entreprise',
      'Intégrations personnalisées',
      'Formation sur site',
      'Garantie SLA',
      'Opportunités de co-marketing',
    ],
  },
];

// =====================================================
// PRICING CALCULATOR
// =====================================================

export class PricingCalculator {
  /**
   * Calculate total price for a given configuration
   */
  static calculate(
    tier: PricingTier,
    billingInterval: BillingInterval,
    users: number,
    usage?: Partial<Record<string, number>>
  ): PricingCalculation {
    const tierConfig = PRICING_TIERS.find(t => t.tier === tier);
    if (!tierConfig) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    // Base cost
    const baseCost = tierConfig.basePrice;

    // Additional users cost
    const { includedUsers, additionalUserPrice, maxUsers } = tierConfig.userPricing;
    const effectiveUsers = maxUsers === -1 ? users : Math.min(users, maxUsers);
    const additionalUsers = Math.max(0, effectiveUsers - includedUsers);
    const additionalUsersCost = additionalUsers * additionalUserPrice;

    // Usage overage cost
    let usageOverageCost = 0;
    if (usage) {
      for (const feature of tierConfig.usageFeatures) {
        const used = usage[feature.id] || 0;
        if (feature.includedQuantity !== -1 && used > feature.includedQuantity) {
          const overage = used - feature.includedQuantity;
          usageOverageCost += overage * feature.pricePerUnit;
        }
      }
    }

    // Monthly total
    const monthlyTotal = baseCost + additionalUsersCost + usageOverageCost;

    // Yearly calculation with discount
    const yearlyDiscount = tierConfig.yearlyDiscount / 100;
    const yearlyTotal = monthlyTotal * 12 * (1 - yearlyDiscount);
    const effectiveMonthly = yearlyTotal / 12;
    const savings = (monthlyTotal * 12) - yearlyTotal;

    // Per user cost
    const perUserCost = effectiveUsers > 0 
      ? (billingInterval === 'yearly' ? effectiveMonthly : monthlyTotal) / effectiveUsers
      : 0;

    return {
      tier,
      billingInterval,
      users: effectiveUsers,
      baseCost,
      additionalUsersCost,
      usageOverageCost,
      monthlyTotal,
      yearlyTotal,
      effectiveMonthly,
      savings,
      perUserCost,
    };
  }

  /**
   * Format price for display
   */
  static formatPrice(
    amount: number,
    currency: Currency = 'CAD',
    locale: 'en' | 'fr' = 'fr'
  ): string {
    if (amount === 0) {
      return locale === 'en' ? 'Free' : 'Gratuit';
    }

    return new Intl.NumberFormat(locale === 'en' ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Get recommended tier based on requirements
   */
  static recommendTier(params: {
    users: number;
    monthlyReports: number;
    connections: number;
    needsAI: boolean;
    needsAPI: boolean;
    budget?: number;
  }): PricingTier | 'free' {
    const { users, monthlyReports, connections, needsAI, needsAPI, budget } = params;

    // Enterprise for large organizations
    if (users > 20 || connections > 5 || monthlyReports > 100) {
      return 'enterprise';
    }

    // Professional for growing teams with advanced needs
    if (users > 5 || needsAI || needsAPI || monthlyReports > 25 || connections > 2) {
      return 'professional';
    }

    // Starter for small businesses
    if (users > 1 || monthlyReports > 5 || connections > 1) {
      return 'starter';
    }

    // Free for individual exploration
    return 'free';
  }

  /**
   * Calculate CPA partner pricing
   */
  static calculateCPAPrice(
    tier: string,
    numberOfClients: number
  ): { monthly: number; yearly: number; perClient: number } {
    const cpaConfig = CPA_PARTNER_TIERS.find(t => t.id === tier);
    if (!cpaConfig) {
      throw new Error(`Unknown CPA tier: ${tier}`);
    }

    const clients = Math.max(numberOfClients, cpaConfig.minimumClients);
    const monthly = clients * cpaConfig.pricePerClient;
    const yearly = monthly * 12 * 0.8; // 20% discount

    return {
      monthly,
      yearly,
      perClient: cpaConfig.pricePerClient,
    };
  }
}

// =====================================================
// CANADIAN MARKET MESSAGING
// =====================================================

export const CANADA_MARKET_MESSAGING = {
  taglines: {
    main: {
      en: 'Enterprise Data Intelligence. Startup-Friendly Pricing.',
      fr: 'Intelligence de données d\'entreprise. Prix accessible aux PME.',
    },
    sub: {
      en: 'Democratizing data lake access for Canadian startups and PMEs. AI-powered anomaly detection at 1/3 the cost.',
      fr: 'Démocratiser l\'accès aux lacs de données pour les startups et PME canadiennes. Détection d\'anomalies par IA à 1/3 du coût.',
    },
    value: {
      en: 'Your data. Your industry. Our AI.',
      fr: 'Vos données. Votre industrie. Notre IA.',
    },
  },
  
  // ROI-focused metrics for executive appeal
  roiMetrics: {
    avgSavings: { 
      value: '$847K', 
      label: { en: 'avg. prevented losses per client', fr: 'pertes évitées en moyenne par client' } 
    },
    timeReduction: { 
      value: '60%', 
      label: { en: 'faster month-end close', fr: 'clôture mensuelle plus rapide' } 
    },
    accuracy: { 
      value: '97%', 
      label: { en: 'anomaly detection accuracy', fr: 'précision de détection d\'anomalies' } 
    },
    costAdvantage: { 
      value: '1/3', 
      label: { en: 'the cost of enterprise solutions', fr: 'du coût des solutions enterprise' } 
    },
    firstYearROI: {
      value: '340%',
      label: { en: 'average first-year ROI', fr: 'ROI moyen la première année' }
    },
  },
  
  valueProps: {
    dataLakeDemocratization: {
      en: 'Enterprise-grade data lake infrastructure accessible to growing businesses',
      fr: 'Infrastructure de lac de données de niveau entreprise accessible aux entreprises en croissance',
    },
    costSavings: {
      en: '1/3 the cost of traditional enterprise BI solutions',
      fr: '1/3 du coût des solutions BI enterprise traditionnelles',
    },
    industryAI: {
      en: 'AI optimized for your specific industry vertical',
      fr: 'IA optimisée pour votre secteur d\'activité spécifique',
    },
    bilingualFirst: {
      en: 'Bilingual interface designed for Canadian businesses',
      fr: 'Interface bilingue conçue pour les entreprises canadiennes',
    },
    localCompliance: {
      en: 'GST/HST/PST compliant reporting out of the box',
      fr: 'Rapports conformes TPS/TVH/TVP inclus',
    },
    localSupport: {
      en: 'Canadian support team with data hosted in Canada',
      fr: 'Équipe de support canadienne avec données hébergées au Canada',
    },
  },
  
  socialProof: {
    stats: {
      savings: { value: '$847K', label: { en: 'avg. client savings', fr: 'économies client moy.' } },
      accuracy: { value: '97%', label: { en: 'detection accuracy', fr: 'précision détection' } },
      costAdvantage: { value: '1/3', label: { en: 'the cost', fr: 'du coût' } },
    },
    regions: [
      // Ontario
      'Toronto',
      'Ottawa',
      'Mississauga',
      'Hamilton',
      'London',
      // Quebec
      'Montréal', 
      'Québec City', 
      'Laval', 
      // British Columbia
      'Vancouver',
      'Victoria',
      'Surrey',
      // Alberta
      'Calgary',
      'Edmonton',
      // Other major cities
      'Winnipeg',
      'Halifax',
      'Regina',
      'Saskatoon',
      'St. John\'s',
    ],
  },
  
  // Industries we optimize for
  industries: [
    { id: 'real_estate', name: { en: 'Real Estate', fr: 'Immobilier' }, icon: '🏢' },
    { id: 'restaurant', name: { en: 'Restaurant', fr: 'Restauration' }, icon: '🍽️' },
    { id: 'hospitality', name: { en: 'Hospitality', fr: 'Hôtellerie' }, icon: '🏨' },
    { id: 'retail', name: { en: 'Retail', fr: 'Commerce de détail' }, icon: '🛍️' },
    { id: 'construction', name: { en: 'Construction', fr: 'Construction' }, icon: '🏗️' },
    { id: 'professional_services', name: { en: 'Professional Services', fr: 'Services professionnels' }, icon: '💼' },
  ],
  
  competitiveAdvantages: [
    {
      vs: 'Enterprise BI Tools',
      advantage: {
        en: 'Same capabilities at 1/3 the cost, designed for SMBs',
        fr: 'Mêmes capacités à 1/3 du coût, conçu pour les PME',
      },
    },
    {
      vs: 'QuickBooks/Sage',
      advantage: {
        en: 'Adds AI-powered intelligence on top of your existing accounting software',
        fr: 'Ajoute l\'intelligence IA à votre logiciel comptable existant',
      },
    },
    {
      vs: 'Excel/Spreadsheets',
      advantage: {
        en: 'Real-time data lake, intelligent anomaly detection, no manual data entry',
        fr: 'Lac de données temps réel, détection IA, aucune saisie manuelle',
      },
    },
    {
      vs: 'US-based tools',
      advantage: {
        en: 'Canada-first: Bilingual, GST/HST/PST compliant, data stays in Canada',
        fr: 'Canada d\'abord: bilingue, conforme TPS/TVH/TVP, données au Canada',
      },
    },
  ],
};

// Legacy alias for backwards compatibility
export const QUEBEC_MARKET_MESSAGING = CANADA_MARKET_MESSAGING;

// =====================================================
// EXPORTS
// =====================================================

export {
  USAGE_FEATURES,
};

export default PricingCalculator;
