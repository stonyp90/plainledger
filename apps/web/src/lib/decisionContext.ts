/**
 * Decision Context Types and Utilities
 * 
 * Captures decision context from charts and financial data to build
 * compounding industry intelligence. This is the foundation of the
 * Context Graphs flywheel.
 */

import { INDUSTRY_TEMPLATES } from './industries';

// =====================================================
// CORE TYPES
// =====================================================

export type IndustryType = 
  | 'real_estate'
  | 'construction'
  | 'hospitality'
  | 'restaurant'
  | 'retail'
  | 'professional_services'
  | 'manufacturing'
  | 'agriculture'
  | 'transport'
  | 'healthcare'
  | 'education'
  | 'wholesale'
  | 'automotive'
  | 'beauty_wellness'
  | 'technology'
  | 'other';

export type BusinessSize = 'small' | 'medium' | 'large';

export type ActionType = 
  | 'price_change'
  | 'cost_cut'
  | 'hire'
  | 'invest'
  | 'defer'
  | 'renegotiate'
  | 'expand'
  | 'reduce'
  | 'optimize'
  | 'custom';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DataMetric = 
  | 'revenue'
  | 'gross_margin'
  | 'net_margin'
  | 'cash_flow'
  | 'occupancy_rate'
  | 'food_cost_pct'
  | 'labor_cost_pct'
  | 'prime_cost'
  | 'revpar'
  | 'utilization_rate'
  | 'inventory_turnover'
  | 'dso'
  | 'custom';

// =====================================================
// DECISION EVENT
// =====================================================

export interface DecisionTrigger {
  metricType: DataMetric;
  metricLabel?: string; // Human-readable label
  chartId?: string; // Which chart triggered this
  currentValue: number;
  benchmarkValue?: number;
  gapPercentage?: number;
  period?: string; // e.g., "2024-Q4"
  context?: string; // Additional context from the chart
}

export interface DecisionAction {
  actionType: ActionType;
  actionLabel?: string; // Human-readable label
  description: string;
  expectedImpact: number; // Dollar amount
  expectedImpactPeriod?: 'monthly' | 'quarterly' | 'annual';
  confidence: ConfidenceLevel;
  reasoning?: string;
  tags?: string[];
}

export interface DecisionOutcome {
  actualImpact: number;
  measuredAt: string; // ISO date
  success: boolean;
  variance?: number; // Percentage difference from expected
  learnings?: string;
  verifiedBy?: 'user' | 'system';
}

export interface DecisionEvent {
  id: string;
  organizationId: string;
  industry: IndustryType;
  businessSize: BusinessSize;
  
  // What triggered the decision
  trigger: DecisionTrigger;
  
  // The decision itself
  decision: DecisionAction;
  
  // Outcome tracking (optional, filled in later)
  outcome?: DecisionOutcome;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  source: 'user' | 'ai_suggested' | 'imported';
  
  // For UI state
  reminderScheduled?: boolean;
  reminderDays?: number; // Days until outcome check
}

// =====================================================
// INDUSTRY-SPECIFIC ACTION TEMPLATES
// =====================================================

export interface ActionTemplate {
  actionType: ActionType;
  label: { en: string; fr: string };
  description: { en: string; fr: string };
  commonMetrics: DataMetric[];
  avgImpact?: { min: number; max: number }; // Typical impact range
  successRate?: number; // Historical success rate (0-100)
}

export const INDUSTRY_ACTION_TEMPLATES: Record<IndustryType, ActionTemplate[]> = {
  other: [],
  restaurant: [
    {
      actionType: 'price_change',
      label: { en: 'Raise Menu Prices', fr: 'Augmenter les prix du menu' },
      description: { 
        en: 'Increase menu prices to improve margins', 
        fr: 'Augmenter les prix du menu pour améliorer les marges' 
      },
      commonMetrics: ['food_cost_pct', 'gross_margin', 'prime_cost'],
      avgImpact: { min: 1500, max: 4000 },
      successRate: 72,
    },
    {
      actionType: 'cost_cut',
      label: { en: 'Reduce Food Waste', fr: 'Réduire le gaspillage alimentaire' },
      description: { 
        en: 'Implement portion control and inventory management', 
        fr: 'Mettre en place le contrôle des portions et la gestion des stocks' 
      },
      commonMetrics: ['food_cost_pct', 'gross_margin'],
      avgImpact: { min: 1200, max: 3000 },
      successRate: 85,
    },
    {
      actionType: 'optimize',
      label: { en: 'Optimize Staffing', fr: 'Optimiser le personnel' },
      description: { 
        en: 'Adjust scheduling to match demand patterns', 
        fr: 'Ajuster les horaires selon la demande' 
      },
      commonMetrics: ['labor_cost_pct', 'prime_cost'],
      avgImpact: { min: 800, max: 2500 },
      successRate: 78,
    },
    {
      actionType: 'renegotiate',
      label: { en: 'Renegotiate Suppliers', fr: 'Renégocier avec les fournisseurs' },
      description: { 
        en: 'Negotiate better pricing with food suppliers', 
        fr: 'Négocier de meilleurs prix avec les fournisseurs' 
      },
      commonMetrics: ['food_cost_pct', 'gross_margin'],
      avgImpact: { min: 500, max: 2000 },
      successRate: 65,
    },
  ],
  real_estate: [
    {
      actionType: 'price_change',
      label: { en: 'Raise Rent', fr: 'Augmenter le loyer' },
      description: { 
        en: 'Increase rent to match market rates', 
        fr: 'Augmenter le loyer pour correspondre au marché' 
      },
      commonMetrics: ['revenue', 'occupancy_rate', 'net_margin'],
      avgImpact: { min: 2000, max: 8000 },
      successRate: 68,
    },
    {
      actionType: 'reduce',
      label: { en: 'Reduce Vacancy', fr: 'Réduire les vacances' },
      description: { 
        en: 'Implement marketing or incentives to fill units', 
        fr: 'Mettre en place du marketing ou des incitatifs' 
      },
      commonMetrics: ['occupancy_rate', 'revenue'],
      avgImpact: { min: 3000, max: 10000 },
      successRate: 75,
    },
    {
      actionType: 'cost_cut',
      label: { en: 'Cut Operating Costs', fr: 'Réduire les coûts d\'exploitation' },
      description: { 
        en: 'Reduce maintenance, utilities, or management costs', 
        fr: 'Réduire les coûts d\'entretien, services ou gestion' 
      },
      commonMetrics: ['net_margin', 'cash_flow'],
      avgImpact: { min: 1000, max: 5000 },
      successRate: 80,
    },
    {
      actionType: 'invest',
      label: { en: 'Property Improvements', fr: 'Améliorations immobilières' },
      description: { 
        en: 'Invest in upgrades to justify higher rents', 
        fr: 'Investir dans des améliorations pour justifier des loyers plus élevés' 
      },
      commonMetrics: ['revenue', 'occupancy_rate'],
      avgImpact: { min: 5000, max: 15000 },
      successRate: 70,
    },
  ],
  construction: [
    {
      actionType: 'price_change',
      label: { en: 'Adjust Bid Pricing', fr: 'Ajuster les prix de soumission' },
      description: { 
        en: 'Increase markup on bids to improve margins', 
        fr: 'Augmenter la marge sur les soumissions' 
      },
      commonMetrics: ['gross_margin', 'revenue'],
      avgImpact: { min: 5000, max: 20000 },
      successRate: 60,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Project Efficiency', fr: 'Améliorer l\'efficacité des projets' },
      description: { 
        en: 'Reduce waste and improve scheduling', 
        fr: 'Réduire les pertes et améliorer la planification' 
      },
      commonMetrics: ['gross_margin', 'cash_flow'],
      avgImpact: { min: 3000, max: 12000 },
      successRate: 75,
    },
    {
      actionType: 'renegotiate',
      label: { en: 'Renegotiate Subcontractors', fr: 'Renégocier avec les sous-traitants' },
      description: { 
        en: 'Get better rates from subcontractors', 
        fr: 'Obtenir de meilleurs tarifs des sous-traitants' 
      },
      commonMetrics: ['gross_margin'],
      avgImpact: { min: 2000, max: 8000 },
      successRate: 65,
    },
  ],
  hospitality: [
    {
      actionType: 'price_change',
      label: { en: 'Increase Room Rates', fr: 'Augmenter les tarifs des chambres' },
      description: { 
        en: 'Raise ADR during high-demand periods', 
        fr: 'Augmenter le tarif journalier moyen en haute saison' 
      },
      commonMetrics: ['revpar', 'revenue', 'gross_margin'],
      avgImpact: { min: 3000, max: 10000 },
      successRate: 70,
    },
    {
      actionType: 'optimize',
      label: { en: 'Optimize Revenue Management', fr: 'Optimiser la gestion des revenus' },
      description: { 
        en: 'Implement dynamic pricing strategies', 
        fr: 'Mettre en place des stratégies de prix dynamiques' 
      },
      commonMetrics: ['revpar', 'occupancy_rate'],
      avgImpact: { min: 2000, max: 8000 },
      successRate: 78,
    },
    {
      actionType: 'reduce',
      label: { en: 'Reduce Operational Costs', fr: 'Réduire les coûts opérationnels' },
      description: { 
        en: 'Optimize staffing and energy usage', 
        fr: 'Optimiser le personnel et la consommation d\'énergie' 
      },
      commonMetrics: ['net_margin', 'cash_flow'],
      avgImpact: { min: 1500, max: 6000 },
      successRate: 82,
    },
  ],
  retail: [
    {
      actionType: 'price_change',
      label: { en: 'Adjust Pricing Strategy', fr: 'Ajuster la stratégie de prix' },
      description: { 
        en: 'Optimize pricing for key products', 
        fr: 'Optimiser les prix des produits clés' 
      },
      commonMetrics: ['gross_margin', 'revenue'],
      avgImpact: { min: 1000, max: 5000 },
      successRate: 68,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Inventory Turnover', fr: 'Améliorer la rotation des stocks' },
      description: { 
        en: 'Clear slow-moving inventory, optimize ordering', 
        fr: 'Écouler les stocks lents, optimiser les commandes' 
      },
      commonMetrics: ['inventory_turnover', 'cash_flow'],
      avgImpact: { min: 2000, max: 8000 },
      successRate: 75,
    },
    {
      actionType: 'cost_cut',
      label: { en: 'Reduce Shrinkage', fr: 'Réduire les pertes' },
      description: { 
        en: 'Implement loss prevention measures', 
        fr: 'Mettre en place des mesures de prévention des pertes' 
      },
      commonMetrics: ['gross_margin', 'net_margin'],
      avgImpact: { min: 500, max: 3000 },
      successRate: 80,
    },
  ],
  professional_services: [
    {
      actionType: 'price_change',
      label: { en: 'Increase Rates', fr: 'Augmenter les tarifs' },
      description: { 
        en: 'Raise hourly or project rates', 
        fr: 'Augmenter les tarifs horaires ou de projet' 
      },
      commonMetrics: ['revenue', 'gross_margin', 'utilization_rate'],
      avgImpact: { min: 2000, max: 10000 },
      successRate: 65,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Utilization', fr: 'Améliorer l\'utilisation' },
      description: { 
        en: 'Increase billable hours percentage', 
        fr: 'Augmenter le pourcentage d\'heures facturables' 
      },
      commonMetrics: ['utilization_rate', 'revenue'],
      avgImpact: { min: 3000, max: 12000 },
      successRate: 72,
    },
    {
      actionType: 'hire',
      label: { en: 'Strategic Hiring', fr: 'Embauche stratégique' },
      description: { 
        en: 'Add capacity to take on more clients', 
        fr: 'Augmenter la capacité pour plus de clients' 
      },
      commonMetrics: ['revenue', 'utilization_rate'],
      avgImpact: { min: 5000, max: 25000 },
      successRate: 60,
    },
  ],
  manufacturing: [
    {
      actionType: 'optimize',
      label: { en: 'Improve OEE', fr: 'Améliorer l\'OEE' },
      description: { 
        en: 'Increase equipment effectiveness', 
        fr: 'Augmenter l\'efficacité des équipements' 
      },
      commonMetrics: ['gross_margin', 'revenue'],
      avgImpact: { min: 5000, max: 20000 },
      successRate: 75,
    },
    {
      actionType: 'cost_cut',
      label: { en: 'Reduce Waste', fr: 'Réduire les déchets' },
      description: { 
        en: 'Minimize material waste and defects', 
        fr: 'Minimiser les déchets et les défauts' 
      },
      commonMetrics: ['gross_margin'],
      avgImpact: { min: 3000, max: 15000 },
      successRate: 80,
    },
    {
      actionType: 'renegotiate',
      label: { en: 'Negotiate Raw Materials', fr: 'Négocier les matières premières' },
      description: { 
        en: 'Get better pricing from suppliers', 
        fr: 'Obtenir de meilleurs prix des fournisseurs' 
      },
      commonMetrics: ['gross_margin', 'cash_flow'],
      avgImpact: { min: 2000, max: 10000 },
      successRate: 70,
    },
  ],
  agriculture: [
    {
      actionType: 'optimize',
      label: { en: 'Improve Yield', fr: 'Améliorer le rendement' },
      description: { 
        en: 'Optimize growing conditions and inputs', 
        fr: 'Optimiser les conditions de culture et les intrants' 
      },
      commonMetrics: ['revenue', 'gross_margin'],
      avgImpact: { min: 5000, max: 25000 },
      successRate: 65,
    },
    {
      actionType: 'cost_cut',
      label: { en: 'Reduce Input Costs', fr: 'Réduire les coûts des intrants' },
      description: { 
        en: 'Optimize fertilizer and seed usage', 
        fr: 'Optimiser l\'utilisation d\'engrais et de semences' 
      },
      commonMetrics: ['gross_margin'],
      avgImpact: { min: 2000, max: 10000 },
      successRate: 75,
    },
  ],
  transport: [
    {
      actionType: 'optimize',
      label: { en: 'Optimize Routes', fr: 'Optimiser les routes' },
      description: { 
        en: 'Reduce fuel costs through better routing', 
        fr: 'Réduire les coûts de carburant par de meilleures routes' 
      },
      commonMetrics: ['gross_margin', 'cash_flow'],
      avgImpact: { min: 2000, max: 8000 },
      successRate: 80,
    },
    {
      actionType: 'price_change',
      label: { en: 'Adjust Rates', fr: 'Ajuster les tarifs' },
      description: { 
        en: 'Increase per-km or per-load rates', 
        fr: 'Augmenter les tarifs au km ou à la charge' 
      },
      commonMetrics: ['revenue', 'gross_margin'],
      avgImpact: { min: 3000, max: 12000 },
      successRate: 65,
    },
  ],
  healthcare: [
    {
      actionType: 'optimize',
      label: { en: 'Improve Patient Flow', fr: 'Améliorer le flux de patients' },
      description: { 
        en: 'Reduce wait times, see more patients', 
        fr: 'Réduire les temps d\'attente, voir plus de patients' 
      },
      commonMetrics: ['revenue', 'utilization_rate'],
      avgImpact: { min: 3000, max: 15000 },
      successRate: 72,
    },
    {
      actionType: 'expand',
      label: { en: 'Add Services', fr: 'Ajouter des services' },
      description: { 
        en: 'Offer additional treatments or services', 
        fr: 'Offrir des traitements ou services supplémentaires' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 5000, max: 20000 },
      successRate: 68,
    },
  ],
  education: [
    {
      actionType: 'expand',
      label: { en: 'Add Programs', fr: 'Ajouter des programmes' },
      description: { 
        en: 'Launch new courses or programs', 
        fr: 'Lancer de nouveaux cours ou programmes' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 5000, max: 25000 },
      successRate: 65,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Retention', fr: 'Améliorer la rétention' },
      description: { 
        en: 'Reduce student dropout rates', 
        fr: 'Réduire les taux d\'abandon' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 3000, max: 15000 },
      successRate: 75,
    },
  ],
  wholesale: [
    {
      actionType: 'optimize',
      label: { en: 'Improve Inventory Turns', fr: 'Améliorer la rotation des stocks' },
      description: { 
        en: 'Reduce carrying costs and improve cash flow', 
        fr: 'Réduire les coûts de stockage et améliorer la trésorerie' 
      },
      commonMetrics: ['inventory_turnover', 'cash_flow'],
      avgImpact: { min: 5000, max: 20000 },
      successRate: 78,
    },
    {
      actionType: 'price_change',
      label: { en: 'Adjust Margins', fr: 'Ajuster les marges' },
      description: { 
        en: 'Increase markup on products', 
        fr: 'Augmenter la marge sur les produits' 
      },
      commonMetrics: ['gross_margin', 'revenue'],
      avgImpact: { min: 3000, max: 12000 },
      successRate: 62,
    },
  ],
  automotive: [
    {
      actionType: 'expand',
      label: { en: 'Grow Service Revenue', fr: 'Augmenter les revenus de service' },
      description: { 
        en: 'Increase parts and service sales', 
        fr: 'Augmenter les ventes de pièces et services' 
      },
      commonMetrics: ['revenue', 'gross_margin'],
      avgImpact: { min: 3000, max: 15000 },
      successRate: 75,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Turn Rate', fr: 'Améliorer la rotation' },
      description: { 
        en: 'Reduce days to sell inventory', 
        fr: 'Réduire les jours pour vendre l\'inventaire' 
      },
      commonMetrics: ['inventory_turnover', 'cash_flow'],
      avgImpact: { min: 5000, max: 25000 },
      successRate: 70,
    },
  ],
  beauty_wellness: [
    {
      actionType: 'price_change',
      label: { en: 'Raise Service Prices', fr: 'Augmenter les prix des services' },
      description: { 
        en: 'Increase prices for services', 
        fr: 'Augmenter les prix des services' 
      },
      commonMetrics: ['revenue', 'gross_margin'],
      avgImpact: { min: 1000, max: 4000 },
      successRate: 70,
    },
    {
      actionType: 'expand',
      label: { en: 'Add Product Sales', fr: 'Ajouter des ventes de produits' },
      description: { 
        en: 'Increase retail product offerings', 
        fr: 'Augmenter l\'offre de produits au détail' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 500, max: 3000 },
      successRate: 75,
    },
    {
      actionType: 'optimize',
      label: { en: 'Improve Client Retention', fr: 'Améliorer la fidélisation' },
      description: { 
        en: 'Implement loyalty programs', 
        fr: 'Mettre en place des programmes de fidélité' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 800, max: 3500 },
      successRate: 78,
    },
  ],
  technology: [
    {
      actionType: 'price_change',
      label: { en: 'Increase Pricing', fr: 'Augmenter les prix' },
      description: { 
        en: 'Raise subscription or license prices', 
        fr: 'Augmenter les prix d\'abonnement ou de licence' 
      },
      commonMetrics: ['revenue', 'gross_margin'],
      avgImpact: { min: 5000, max: 30000 },
      successRate: 60,
    },
    {
      actionType: 'reduce',
      label: { en: 'Reduce Churn', fr: 'Réduire le désabonnement' },
      description: { 
        en: 'Improve retention and reduce cancellations', 
        fr: 'Améliorer la rétention et réduire les annulations' 
      },
      commonMetrics: ['revenue'],
      avgImpact: { min: 3000, max: 20000 },
      successRate: 72,
    },
    {
      actionType: 'optimize',
      label: { en: 'Optimize CAC', fr: 'Optimiser le CAC' },
      description: { 
        en: 'Reduce customer acquisition costs', 
        fr: 'Réduire les coûts d\'acquisition client' 
      },
      commonMetrics: ['gross_margin', 'cash_flow'],
      avgImpact: { min: 2000, max: 15000 },
      successRate: 68,
    },
  ],
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Generate a unique decision ID
 */
export function generateDecisionId(): string {
  return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get action templates for an industry
 */
export function getActionTemplatesForIndustry(industry: IndustryType): ActionTemplate[] {
  return INDUSTRY_ACTION_TEMPLATES[industry] || [];
}

/**
 * Get action template by type for an industry
 */
export function getActionTemplate(
  industry: IndustryType, 
  actionType: ActionType
): ActionTemplate | undefined {
  const templates = INDUSTRY_ACTION_TEMPLATES[industry];
  return templates?.find(t => t.actionType === actionType);
}

/**
 * Create a new decision event
 */
export function createDecisionEvent(
  params: {
    organizationId: string;
    industry: IndustryType;
    businessSize: BusinessSize;
    trigger: DecisionTrigger;
    decision: DecisionAction;
    source?: 'user' | 'ai_suggested' | 'imported';
  }
): DecisionEvent {
  const now = new Date().toISOString();
  return {
    id: generateDecisionId(),
    organizationId: params.organizationId,
    industry: params.industry,
    businessSize: params.businessSize,
    trigger: params.trigger,
    decision: params.decision,
    source: params.source || 'user',
    createdAt: now,
    updatedAt: now,
    reminderScheduled: false,
  };
}

/**
 * Calculate gap percentage between current and benchmark
 */
export function calculateGapPercentage(current: number, benchmark: number): number {
  if (benchmark === 0) return 0;
  return ((current - benchmark) / Math.abs(benchmark)) * 100;
}

/**
 * Get suggested actions based on metric performance
 */
export function getSuggestedActions(
  industry: IndustryType,
  metric: DataMetric,
  gapPercentage: number
): ActionTemplate[] {
  const templates = INDUSTRY_ACTION_TEMPLATES[industry] || [];
  
  // Filter templates that are relevant to this metric
  const relevant = templates.filter(t => 
    t.commonMetrics.includes(metric) || t.commonMetrics.includes('custom')
  );
  
  // Sort by success rate (highest first)
  return relevant.sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
}

/**
 * Format decision for display
 */
export function formatDecisionSummary(
  decision: DecisionEvent,
  language: 'en' | 'fr' = 'en'
): string {
  const template = getActionTemplate(decision.industry, decision.decision.actionType);
  const actionLabel = template 
    ? (language === 'fr' ? template.label.fr : template.label.en)
    : decision.decision.actionLabel || decision.decision.actionType;
  
  const impact = new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(decision.decision.expectedImpact);
  
  return language === 'fr'
    ? `${actionLabel}: impact attendu de ${impact}`
    : `${actionLabel}: expected impact of ${impact}`;
}

/**
 * Get industry name by ID
 */
export function getIndustryName(
  industryId: IndustryType,
  language: 'en' | 'fr' = 'en'
): string {
  if (industryId === 'other') return language === 'en' ? 'Other' : 'Autre';
  const template = INDUSTRY_TEMPLATES.find(t => t.id === industryId);
  return template ? template.name[language] : industryId;
}

/**
 * Calculate outcome variance
 */
export function calculateOutcomeVariance(expected: number, actual: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return ((actual - expected) / Math.abs(expected)) * 100;
}

/**
 * Determine if outcome was successful
 */
export function isOutcomeSuccessful(
  expected: number,
  actual: number,
  threshold: number = 80 // At least 80% of expected impact
): boolean {
  if (expected <= 0) return actual >= expected;
  return actual >= (expected * threshold / 100);
}
