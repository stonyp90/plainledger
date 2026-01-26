/**
 * PlainLedger Pricing Engine
 * 
 * Usage-Based Pricing with Quebec Market Positioning
 * ==================================================
 * 
 * MARKET ANALYSIS - QUEBEC ACCOUNTING SOFTWARE LANDSCAPE (2026)
 * 
 * Key Competitors:
 * ┌────────────────────┬──────────────┬───────────────┬─────────────────────────────┐
 * │ Competitor         │ Starting     │ Per User      │ Target Market              │
 * ├────────────────────┼──────────────┼───────────────┼─────────────────────────────┤
 * │ QuickBooks Online  │ $22/mo CAD   │ +$11/user     │ SMB, Self-employed         │
 * │ Xero               │ $20/mo CAD   │ +$5/user      │ SMB, Growing businesses    │
 * │ Sage Business Cloud│ $35/mo CAD   │ +$15/user     │ SMB to Mid-market          │
 * │ FreshBooks         │ $22/mo CAD   │ +$12/user     │ Freelancers, Small teams   │
 * │ Wave               │ Free         │ N/A           │ Micro businesses           │
 * │ Dext               │ $25/mo CAD   │ N/A           │ Receipt capture            │
 * │ Fathom Analytics   │ $59/mo USD   │ Flat          │ Financial reporting        │
 * │ Spotlight          │ $45/mo USD   │ Flat          │ Forecasting                │
 * │ Float              │ $59/mo USD   │ Flat          │ Cash flow                  │
 * └────────────────────┴──────────────┴───────────────┴─────────────────────────────┘
 * 
 * QUEBEC MARKET SPECIFICS:
 * - 98% of businesses are SMBs (< 100 employees)
 * - Strong preference for French-first interfaces
 * - High CPA/accountant involvement in software decisions
 * - Price sensitivity in the $50-200/mo range
 * - GST/QST compliance requirements
 * - Provincial tax credits for digital transformation
 * 
 * PLAINLEDGER POSITIONING:
 * "L'intelligence financière pour les PME québécoises"
 * - Not a replacement for accounting software (QuickBooks, Sage)
 * - A complementary analysis & reporting layer
 * - AI-powered anomaly detection (unique differentiator)
 * - Accountant-focused collaboration features
 * - Quebec-first: French interface, QST compliance, local support
 * 
 * PRICING STRATEGY:
 * - Base tier includes X users, charge per additional user
 * - Usage-based add-ons for high-volume features
 * - Enterprise volume discounts
 * - Annual prepay discount (20%)
 * - CPA partner program pricing
 */

// =====================================================
// TYPES
// =====================================================

export type PricingTier = 'free' | 'starter' | 'professional' | 'enterprise';
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
    name: 'AI Assistant Queries',
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
    id: 'plan_free',
    tier: 'free',
    name: 'Free',
    nameFr: 'Gratuit',
    tagline: 'Get started with financial insights',
    taglineFr: 'Commencez avec des insights financiers',
    description: 'Perfect for trying out PlainLedger',
    descriptionFr: 'Parfait pour essayer PlainLedger',
    
    basePrice: 0,
    yearlyDiscount: 0,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: 1,
      additionalUserPrice: 0,
      maxUsers: 1,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: 10 },
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 25 },
      { ...USAGE_FEATURES.connections, includedQuantity: 1 },
      { ...USAGE_FEATURES.storage, includedQuantity: 1 }, // 1GB
    ],
    
    features: [
      { id: 'dashboard', name: 'Full dashboard', nameFr: 'Tableau de bord complet', included: true },
      { id: 'reports', name: '10 reports/month', nameFr: '10 rapports/mois', included: true },
      { id: 'connection', name: '1 data connection', nameFr: '1 connexion de données', included: true },
      { id: 'ai_queries', name: '25 AI queries/mo', nameFr: '25 requêtes IA/mois', included: true },
      { id: 'export', name: 'Export (PDF)', nameFr: 'Export (PDF)', included: true },
      { id: 'email_support', name: 'Email support', nameFr: 'Support par courriel', included: true },
      { id: 'team', name: 'Team collaboration', nameFr: 'Collaboration d\'équipe', included: false },
      { id: 'alerts', name: 'Slack & Teams alerts', nameFr: 'Alertes Slack & Teams', included: false },
    ],
    
    ctaText: 'Get started free',
    ctaTextFr: 'Commencer gratuitement',
  },
  {
    id: 'plan_starter',
    tier: 'starter',
    name: 'Solo',
    nameFr: 'Solo',
    tagline: 'For freelancers and solopreneurs',
    taglineFr: 'Pour les travailleurs autonomes',
    description: 'Everything you need to manage your finances',
    descriptionFr: 'Tout ce dont vous avez besoin pour gérer vos finances',
    
    basePrice: 29,
    yearlyDiscount: 20,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: 1,
      additionalUserPrice: 0,
      maxUsers: 1,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 }, // Unlimited
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 100, pricePerUnit: 0.05 },
      { ...USAGE_FEATURES.connections, includedQuantity: 2, pricePerUnit: 10 },
      { ...USAGE_FEATURES.storage, includedQuantity: 5 }, // 5GB
    ],
    
    features: [
      { id: 'dashboard', name: 'Full dashboard', nameFr: 'Tableau de bord complet', included: true },
      { id: 'reports', name: 'Unlimited reports', nameFr: 'Rapports illimités', included: true },
      { id: 'connections', name: '2 data connections', nameFr: '2 connexions de données', included: true },
      { id: 'anomaly_basic', name: 'Anomaly detection', nameFr: 'Détection d\'anomalies', included: true },
      { id: 'export', name: 'Export (PDF/Excel)', nameFr: 'Export (PDF/Excel)', included: true },
      { id: 'email_support', name: 'Email support', nameFr: 'Support par courriel', included: true },
      { id: 'ai_queries', name: '100 AI queries/mo', nameFr: '100 requêtes IA/mois', included: true },
      { id: 'team', name: 'Team collaboration', nameFr: 'Collaboration d\'équipe', included: false },
    ],
    
    stripePriceId: 'price_solo_monthly',
    stripeYearlyPriceId: 'price_solo_yearly',
    stripeUserPriceId: '',
    
    ctaText: 'Start 14-day free trial',
    ctaTextFr: 'Essai gratuit de 14 jours',
  },
  {
    id: 'plan_professional',
    tier: 'professional',
    name: 'Team',
    nameFr: 'Équipe',
    tagline: 'For small businesses and teams',
    taglineFr: 'Pour les PME et équipes',
    description: 'Collaborate with your team on financial insights',
    descriptionFr: 'Collaborez avec votre équipe sur les insights financiers',
    
    basePrice: 79,
    yearlyDiscount: 20,
    currency: 'CAD',
    popular: true,
    badge: 'Most Popular',
    badgeFr: 'Plus populaire',
    
    userPricing: {
      includedUsers: 5,
      additionalUserPrice: 0,
      maxUsers: 5,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 }, // Unlimited
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 500, pricePerUnit: 0.04 },
      { ...USAGE_FEATURES.connections, includedQuantity: 5, pricePerUnit: 8 },
      { ...USAGE_FEATURES.storage, includedQuantity: 25 }, // 25GB
    ],
    
    features: [
      { id: 'everything_solo', name: 'Everything in Solo', nameFr: 'Tout de Solo', included: true },
      { id: 'team', name: 'Up to 5 team members', nameFr: 'Jusqu\'à 5 membres', included: true },
      { id: 'connections', name: '5 data connections', nameFr: '5 connexions de données', included: true },
      { id: 'ai_advanced', name: 'Advanced AI insights', nameFr: 'Insights IA avancés', included: true },
      { id: 'ai_queries', name: '500 AI queries/mo', nameFr: '500 requêtes IA/mois', included: true },
      { id: 'alerts', name: 'Slack & Teams alerts', nameFr: 'Alertes Slack & Teams', included: true },
      { id: 'priority_support', name: 'Priority support', nameFr: 'Support prioritaire', included: true },
      { id: 'api', name: 'API access', nameFr: 'Accès API', included: true },
    ],
    
    stripePriceId: 'price_team_monthly',
    stripeYearlyPriceId: 'price_team_yearly',
    stripeUserPriceId: '',
    
    ctaText: 'Start 14-day free trial',
    ctaTextFr: 'Essai gratuit de 14 jours',
  },
  {
    id: 'plan_business',
    tier: 'business',
    name: 'Business',
    nameFr: 'Business',
    tagline: 'For growing companies',
    taglineFr: 'Pour les entreprises en croissance',
    description: 'Advanced features for scaling businesses',
    descriptionFr: 'Fonctionnalités avancées pour les entreprises en croissance',
    
    basePrice: 149,
    yearlyDiscount: 20,
    currency: 'CAD',
    
    userPricing: {
      includedUsers: 15,
      additionalUserPrice: 0,
      maxUsers: 15,
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 }, // Unlimited
      { ...USAGE_FEATURES.aiQueries, includedQuantity: 2000, pricePerUnit: 0.03 },
      { ...USAGE_FEATURES.connections, includedQuantity: -1, pricePerUnit: 0 }, // Unlimited
      { ...USAGE_FEATURES.storage, includedQuantity: 100 }, // 100GB
    ],
    
    features: [
      { id: 'everything_team', name: 'Everything in Team', nameFr: 'Tout de Équipe', included: true },
      { id: 'team', name: 'Up to 15 team members', nameFr: 'Jusqu\'à 15 membres', included: true },
      { id: 'connections', name: 'Unlimited connections', nameFr: 'Connexions illimitées', included: true },
      { id: 'ai_queries', name: '2,000 AI queries/mo', nameFr: '2 000 requêtes IA/mois', included: true },
      { id: 'custom_branding', name: 'Custom branding', nameFr: 'Marque personnalisée', included: true },
      { id: 'budget', name: 'Budget vs Actual', nameFr: 'Budget vs Réel', included: true },
      { id: 'forecasting', name: 'Cash flow forecasting', nameFr: 'Prévisions de trésorerie', included: true },
      { id: 'audit', name: 'Audit logs', nameFr: 'Journaux d\'audit', included: true },
    ],
    
    stripePriceId: 'price_business_monthly',
    stripeYearlyPriceId: 'price_business_yearly',
    stripeUserPriceId: '',
    
    ctaText: 'Start 14-day free trial',
    ctaTextFr: 'Essai gratuit de 14 jours',
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Entreprise',
    tagline: 'For large organizations',
    taglineFr: 'Pour les grandes organisations',
    description: 'Custom solutions with dedicated support',
    descriptionFr: 'Solutions sur mesure avec support dédié',
    
    basePrice: 0, // Custom pricing
    yearlyDiscount: 25,
    currency: 'CAD',
    badge: 'Custom',
    badgeFr: 'Sur mesure',
    
    userPricing: {
      includedUsers: -1, // Unlimited
      additionalUserPrice: 0,
      maxUsers: -1, // Unlimited
    },
    
    usageFeatures: [
      { ...USAGE_FEATURES.reports, includedQuantity: -1, pricePerUnit: 0 }, // Unlimited
      { ...USAGE_FEATURES.aiQueries, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.connections, includedQuantity: -1, pricePerUnit: 0 },
      { ...USAGE_FEATURES.storage, includedQuantity: -1, pricePerUnit: 0 },
    ],
    
    features: [
      { id: 'everything_business', name: 'Everything in Business', nameFr: 'Tout de Business', included: true },
      { id: 'team', name: 'Unlimited team members', nameFr: 'Membres illimités', included: true },
      { id: 'ai_queries', name: 'Unlimited AI queries', nameFr: 'Requêtes IA illimitées', included: true },
      { id: 'sso', name: 'SSO (SAML/OIDC)', nameFr: 'SSO (SAML/OIDC)', included: true },
      { id: 'sla', name: '99.9% SLA', nameFr: 'SLA 99.9%', included: true },
      { id: 'dedicated_support', name: 'Dedicated account manager', nameFr: 'Gestionnaire de compte dédié', included: true },
      { id: 'onboarding', name: 'Custom onboarding', nameFr: 'Intégration personnalisée', included: true },
      { id: 'multi_entity', name: 'Multi-entity consolidation', nameFr: 'Consolidation multi-entités', included: true },
    ],
    
    ctaText: 'Contact sales',
    ctaTextFr: 'Contacter les ventes',
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
  }): PricingTier {
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
// QUEBEC MARKET MESSAGING
// =====================================================

export const QUEBEC_MARKET_MESSAGING = {
  taglines: {
    main: {
      en: 'Financial Intelligence for Quebec Businesses',
      fr: 'L\'intelligence financière pour les entreprises québécoises',
    },
    sub: {
      en: 'Connect your accounting software. Get instant insights. Made in Quebec.',
      fr: 'Connectez votre logiciel comptable. Obtenez des insights instantanés. Fait au Québec.',
    },
  },
  
  valueProps: {
    frenchFirst: {
      en: 'French-first interface designed for Quebec businesses',
      fr: 'Interface française conçue pour les entreprises québécoises',
    },
    localCompliance: {
      en: 'GST/QST compliant reporting out of the box',
      fr: 'Rapports conformes TPS/TVQ inclus',
    },
    localSupport: {
      en: 'Quebec-based support team (Montreal)',
      fr: 'Équipe de support basée au Québec (Montréal)',
    },
    cpaNetwork: {
      en: 'Trusted by Quebec CPAs and accounting firms',
      fr: 'Approuvé par les CPA et cabinets comptables du Québec',
    },
  },
  
  socialProof: {
    stats: {
      businesses: { value: '1,000+', label: { en: 'Quebec businesses', fr: 'entreprises québécoises' } },
      savings: { value: '40%', label: { en: 'time saved on reporting', fr: 'de temps économisé' } },
      anomalies: { value: '$2M+', label: { en: 'anomalies caught', fr: 'd\'anomalies détectées' } },
    },
    regions: [
      'Montréal', 
      'Québec', 
      'Laval', 
      'Gatineau', 
      'Longueuil', 
      'Sherbrooke',
      'Trois-Rivières',
      'Saguenay',
      'Lévis',
      'Terrebonne',
      'Saint-Jean-sur-Richelieu',
      'Repentigny',
      'Drummondville',
      'Granby',
      'Saint-Hyacinthe',
      'Rimouski',
      'Victoriaville',
    ],
  },
  
  competitiveAdvantages: [
    {
      vs: 'QuickBooks/Sage',
      advantage: {
        en: 'PlainLedger adds intelligence on top of your existing accounting software',
        fr: 'PlainLedger ajoute de l\'intelligence à votre logiciel comptable existant',
      },
    },
    {
      vs: 'Excel/Spreadsheets',
      advantage: {
        en: 'Real-time sync, AI anomaly detection, no manual data entry',
        fr: 'Synchronisation en temps réel, détection IA, aucune saisie manuelle',
      },
    },
    {
      vs: 'US-based tools',
      advantage: {
        en: 'Quebec-first: French interface, GST/QST, local support, data in Canada',
        fr: 'Québec d\'abord: interface française, TPS/TVQ, support local, données au Canada',
      },
    },
  ],
};

// =====================================================
// EXPORTS
// =====================================================

export {
  USAGE_FEATURES,
};

export default PricingCalculator;
