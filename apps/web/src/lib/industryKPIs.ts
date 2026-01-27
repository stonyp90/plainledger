/**
 * Industry-Specific KPI Formulas
 * 
 * Pre-built formulas and calculations for each Quebec industry
 */

import { type KPIDefinition } from './industries';

export interface KPIFormula {
  id: string;
  industryId: string;
  name: { en: string; fr: string };
  formula: string;
  description: { en: string; fr: string };
  format: 'currency' | 'number' | 'percentage';
  decimals?: number;
  benchmark?: { min: number; max: number; unit: string };
  category: 'revenue' | 'cost' | 'profitability' | 'efficiency' | 'growth';
}

/**
 * Restaurant Industry KPIs
 */
export const RESTAURANT_KPIS: KPIFormula[] = [
  {
    id: 'food_cost_pct',
    industryId: 'restaurant',
    name: { en: 'Food Cost %', fr: 'Coût nourriture %' },
    formula: '=Food Cost / Food Sales',
    description: {
      en: 'Percentage of food sales spent on food ingredients',
      fr: 'Pourcentage des ventes alimentaires dépensé en ingrédients',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 28, max: 35, unit: '%' },
    category: 'cost',
  },
  {
    id: 'labor_cost_pct',
    industryId: 'restaurant',
    name: { en: 'Labor Cost %', fr: 'Coût main-d\'oeuvre %' },
    formula: '=Labor Cost / Total Revenue',
    description: {
      en: 'Percentage of revenue spent on labor (wages + benefits)',
      fr: 'Pourcentage des revenus dépensé en main-d\'oeuvre (salaires + avantages)',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 25, max: 35, unit: '%' },
    category: 'cost',
  },
  {
    id: 'prime_cost',
    industryId: 'restaurant',
    name: { en: 'Prime Cost', fr: 'Coût principal' },
    formula: '=(Food Cost + Labor Cost) / Total Revenue',
    description: {
      en: 'Combined food and labor costs as percentage of revenue',
      fr: 'Coûts combinés de nourriture et main-d\'oeuvre en pourcentage des revenus',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 55, max: 65, unit: '%' },
    category: 'cost',
  },
  {
    id: 'average_ticket',
    industryId: 'restaurant',
    name: { en: 'Average Ticket', fr: 'Ticket moyen' },
    formula: '=Total Revenue / Number of Covers',
    description: {
      en: 'Average revenue per customer',
      fr: 'Revenu moyen par client',
    },
    format: 'currency',
    decimals: 2,
    category: 'revenue',
  },
  {
    id: 'covers_per_day',
    industryId: 'restaurant',
    name: { en: 'Covers per Day', fr: 'Couvertures par jour' },
    formula: '=Number of Covers / Number of Days',
    description: {
      en: 'Average number of customers served per day',
      fr: 'Nombre moyen de clients servis par jour',
    },
    format: 'number',
    decimals: 0,
    category: 'efficiency',
  },
  {
    id: 'break_even',
    industryId: 'restaurant',
    name: { en: 'Break-Even Revenue', fr: 'Seuil de rentabilité' },
    formula: '=Fixed Costs / (1 - Variable Cost %)',
    description: {
      en: 'Minimum revenue needed to cover all costs',
      fr: 'Revenu minimum nécessaire pour couvrir tous les coûts',
    },
    format: 'currency',
    decimals: 0,
    category: 'profitability',
  },
];

/**
 * Real Estate Industry KPIs
 */
export const REAL_ESTATE_KPIS: KPIFormula[] = [
  {
    id: 'occupancy_rate',
    industryId: 'real_estate',
    name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
    formula: '=Occupied Units / Total Units',
    description: {
      en: 'Percentage of units that are occupied',
      fr: 'Pourcentage d\'unités occupées',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 85, max: 95, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'noi',
    industryId: 'real_estate',
    name: { en: 'Net Operating Income', fr: 'Résultat d\'exploitation net' },
    formula: '=Gross Rental Income - Operating Expenses',
    description: {
      en: 'Income after operating expenses but before financing',
      fr: 'Revenus après dépenses d\'exploitation mais avant financement',
    },
    format: 'currency',
    decimals: 0,
    category: 'profitability',
  },
  {
    id: 'cap_rate',
    industryId: 'real_estate',
    name: { en: 'Cap Rate', fr: 'Taux de capitalisation' },
    formula: '=Net Operating Income / Property Value',
    description: {
      en: 'Return on investment based on property value',
      fr: 'Rendement sur investissement basé sur la valeur de la propriété',
    },
    format: 'percentage',
    decimals: 2,
    benchmark: { min: 4, max: 8, unit: '%' },
    category: 'profitability',
  },
  {
    id: 'cash_on_cash',
    industryId: 'real_estate',
    name: { en: 'Cash-on-Cash Return', fr: 'Rendement cash-on-cash' },
    formula: '=(Net Operating Income - Debt Service) / Cash Invested',
    description: {
      en: 'Return on actual cash invested',
      fr: 'Rendement sur l\'argent réellement investi',
    },
    format: 'percentage',
    decimals: 2,
    category: 'profitability',
  },
  {
    id: 'rent_per_sqft',
    industryId: 'real_estate',
    name: { en: 'Rent per Square Foot', fr: 'Loyer par pied carré' },
    formula: '=Gross Rental Income / Total Square Feet',
    description: {
      en: 'Average rental income per square foot',
      fr: 'Revenu locatif moyen par pied carré',
    },
    format: 'currency',
    decimals: 2,
    category: 'revenue',
  },
];

/**
 * Construction Industry KPIs
 */
export const CONSTRUCTION_KPIS: KPIFormula[] = [
  {
    id: 'gross_margin',
    industryId: 'construction',
    name: { en: 'Gross Margin', fr: 'Marge brute' },
    formula: '=(Project Revenue - Direct Costs) / Project Revenue',
    description: {
      en: 'Profit margin after direct project costs',
      fr: 'Marge bénéficiaire après coûts directs de projet',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 15, max: 30, unit: '%' },
    category: 'profitability',
  },
  {
    id: 'backlog_months',
    industryId: 'construction',
    name: { en: 'Backlog (Months)', fr: 'Carnet de commandes (mois)' },
    formula: '=Backlog Value / Average Monthly Revenue',
    description: {
      en: 'Months of work in pipeline',
      fr: 'Mois de travail en pipeline',
    },
    format: 'number',
    decimals: 1,
    benchmark: { min: 3, max: 12, unit: 'months' },
    category: 'growth',
  },
  {
    id: 'bid_win_rate',
    industryId: 'construction',
    name: { en: 'Bid Win Rate', fr: 'Taux de soumissions gagnées' },
    formula: '=Contracts Won / Total Bids',
    description: {
      en: 'Percentage of bids that result in contracts',
      fr: 'Pourcentage de soumissions qui résultent en contrats',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 20, max: 40, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'days_to_bill',
    industryId: 'construction',
    name: { en: 'Days to Bill', fr: 'Jours de facturation' },
    formula: '=Accounts Receivable / (Revenue / 30)',
    description: {
      en: 'Average days to collect payment',
      fr: 'Jours moyens pour collecter les paiements',
    },
    format: 'number',
    decimals: 0,
    benchmark: { min: 30, max: 60, unit: 'days' },
    category: 'efficiency',
  },
];

/**
 * Hospitality Industry KPIs
 */
export const HOSPITALITY_KPIS: KPIFormula[] = [
  {
    id: 'revpar',
    industryId: 'hospitality',
    name: { en: 'RevPAR', fr: 'RevPAR' },
    formula: '=Occupancy Rate * Average Daily Rate',
    description: {
      en: 'Revenue per available room',
      fr: 'Revenu par chambre disponible',
    },
    format: 'currency',
    decimals: 2,
    benchmark: { min: 80, max: 150, unit: 'CAD' },
    category: 'revenue',
  },
  {
    id: 'adr',
    industryId: 'hospitality',
    name: { en: 'Average Daily Rate', fr: 'Tarif journalier moyen' },
    formula: '=Room Revenue / Rooms Sold',
    description: {
      en: 'Average room rate per night',
      fr: 'Tarif moyen par chambre par nuit',
    },
    format: 'currency',
    decimals: 2,
    category: 'revenue',
  },
  {
    id: 'occupancy_rate',
    industryId: 'hospitality',
    name: { en: 'Occupancy Rate', fr: 'Taux d\'occupation' },
    formula: '=Rooms Sold / Rooms Available',
    description: {
      en: 'Percentage of rooms occupied',
      fr: 'Pourcentage de chambres occupées',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 60, max: 85, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'goppar',
    industryId: 'hospitality',
    name: { en: 'GOPPAR', fr: 'GOPPAR' },
    formula: '=Gross Operating Profit / Rooms Available',
    description: {
      en: 'Gross operating profit per available room',
      fr: 'Profit d\'exploitation brut par chambre disponible',
    },
    format: 'currency',
    decimals: 2,
    category: 'profitability',
  },
  {
    id: 'cost_per_occupied_room',
    industryId: 'hospitality',
    name: { en: 'Cost per Occupied Room', fr: 'Coût par chambre occupée' },
    formula: '=Operating Costs / Rooms Sold',
    description: {
      en: 'Operating cost per occupied room',
      fr: 'Coût d\'exploitation par chambre occupée',
    },
    format: 'currency',
    decimals: 2,
    category: 'cost',
  },
];

/**
 * Retail Industry KPIs
 */
export const RETAIL_KPIS: KPIFormula[] = [
  {
    id: 'sales_per_sqft',
    industryId: 'retail',
    name: { en: 'Sales per Square Foot', fr: 'Ventes par pied carré' },
    formula: '=Total Sales / Square Feet',
    description: {
      en: 'Revenue generated per square foot of retail space',
      fr: 'Revenus générés par pied carré d\'espace de vente',
    },
    format: 'currency',
    decimals: 2,
    benchmark: { min: 200, max: 500, unit: 'CAD/sqft' },
    category: 'revenue',
  },
  {
    id: 'inventory_turnover',
    industryId: 'retail',
    name: { en: 'Inventory Turnover', fr: 'Rotation des stocks' },
    formula: '=Cost of Goods Sold / Average Inventory',
    description: {
      en: 'How many times inventory is sold and replaced per year',
      fr: 'Nombre de fois que l\'inventaire est vendu et remplacé par année',
    },
    format: 'number',
    decimals: 1,
    benchmark: { min: 4, max: 12, unit: 'times/year' },
    category: 'efficiency',
  },
  {
    id: 'gross_margin',
    industryId: 'retail',
    name: { en: 'Gross Margin', fr: 'Marge brute' },
    formula: '=(Total Sales - Cost of Goods Sold) / Total Sales',
    description: {
      en: 'Profit margin after cost of goods sold',
      fr: 'Marge bénéficiaire après coût des marchandises vendues',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 30, max: 50, unit: '%' },
    category: 'profitability',
  },
  {
    id: 'shrinkage',
    industryId: 'retail',
    name: { en: 'Shrinkage %', fr: 'Rétrécissement %' },
    formula: '=(Recorded Inventory - Actual Inventory) / Recorded Inventory',
    description: {
      en: 'Inventory loss due to theft, damage, or errors',
      fr: 'Perte d\'inventaire due au vol, dommages ou erreurs',
    },
    format: 'percentage',
    decimals: 2,
    benchmark: { min: 0, max: 2, unit: '%' },
    category: 'cost',
  },
  {
    id: 'average_basket',
    industryId: 'retail',
    name: { en: 'Average Basket', fr: 'Panier moyen' },
    formula: '=Total Sales / Number of Transactions',
    description: {
      en: 'Average transaction value',
      fr: 'Valeur moyenne des transactions',
    },
    format: 'currency',
    decimals: 2,
    category: 'revenue',
  },
];

/**
 * Professional Services KPIs
 */
export const PROFESSIONAL_SERVICES_KPIS: KPIFormula[] = [
  {
    id: 'utilization_rate',
    industryId: 'professional_services',
    name: { en: 'Utilization Rate', fr: 'Taux d\'utilisation' },
    formula: '=Billable Hours / Total Available Hours',
    description: {
      en: 'Percentage of available hours that are billable',
      fr: 'Pourcentage d\'heures disponibles qui sont facturables',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 70, max: 85, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'revenue_per_employee',
    industryId: 'professional_services',
    name: { en: 'Revenue per Employee', fr: 'Revenu par employé' },
    formula: '=Total Revenue / Number of Employees',
    description: {
      en: 'Average revenue generated per employee',
      fr: 'Revenu moyen généré par employé',
    },
    format: 'currency',
    decimals: 0,
    benchmark: { min: 150000, max: 300000, unit: 'CAD' },
    category: 'efficiency',
  },
  {
    id: 'effective_hourly_rate',
    industryId: 'professional_services',
    name: { en: 'Effective Hourly Rate', fr: 'Taux horaire effectif' },
    formula: '=Total Revenue / Total Billable Hours',
    description: {
      en: 'Average rate charged per billable hour',
      fr: 'Taux moyen facturé par heure facturable',
    },
    format: 'currency',
    decimals: 2,
    category: 'revenue',
  },
  {
    id: 'billable_days',
    industryId: 'professional_services',
    name: { en: 'Billable Days per Year', fr: 'Jours facturables par année' },
    formula: '=Billable Hours / 8',
    description: {
      en: 'Number of billable days per year',
      fr: 'Nombre de jours facturables par année',
    },
    format: 'number',
    decimals: 0,
    benchmark: { min: 180, max: 220, unit: 'days' },
    category: 'efficiency',
  },
];

/**
 * Manufacturing KPIs
 */
export const MANUFACTURING_KPIS: KPIFormula[] = [
  {
    id: 'oee',
    industryId: 'manufacturing',
    name: { en: 'OEE', fr: 'Efficacité globale des équipements' },
    formula: '=Availability * Performance * Quality',
    description: {
      en: 'Overall Equipment Effectiveness',
      fr: 'Efficacité globale des équipements',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 70, max: 85, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'unit_cost',
    industryId: 'manufacturing',
    name: { en: 'Cost per Unit', fr: 'Coût par unité' },
    formula: '=Total Production Cost / Units Produced',
    description: {
      en: 'Average cost to produce one unit',
      fr: 'Coût moyen pour produire une unité',
    },
    format: 'currency',
    decimals: 2,
    category: 'cost',
  },
  {
    id: 'rejection_rate',
    industryId: 'manufacturing',
    name: { en: 'Rejection Rate', fr: 'Taux de rejet' },
    formula: '=Rejected Units / Total Units Produced',
    description: {
      en: 'Percentage of units that fail quality control',
      fr: 'Pourcentage d\'unités qui échouent le contrôle qualité',
    },
    format: 'percentage',
    decimals: 2,
    benchmark: { min: 0, max: 5, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'production_cycle_time',
    industryId: 'manufacturing',
    name: { en: 'Production Cycle Time', fr: 'Délai de production' },
    formula: '=Total Production Time / Units Produced',
    description: {
      en: 'Average time to produce one unit',
      fr: 'Temps moyen pour produire une unité',
    },
    format: 'number',
    decimals: 1,
    category: 'efficiency',
  },
];

/**
 * Technology KPIs
 */
export const TECHNOLOGY_KPIS: KPIFormula[] = [
  {
    id: 'mrr',
    industryId: 'technology',
    name: { en: 'Monthly Recurring Revenue', fr: 'Revenus récurrents mensuels' },
    formula: '=Monthly Recurring Revenue',
    description: {
      en: 'Predictable monthly revenue from subscriptions',
      fr: 'Revenus mensuels prévisibles provenant d\'abonnements',
    },
    format: 'currency',
    decimals: 0,
    category: 'revenue',
  },
  {
    id: 'arr',
    industryId: 'technology',
    name: { en: 'Annual Recurring Revenue', fr: 'Revenus récurrents annuels' },
    formula: '=Monthly Recurring Revenue * 12',
    description: {
      en: 'Annualized recurring revenue',
      fr: 'Revenus récurrents annualisés',
    },
    format: 'currency',
    decimals: 0,
    category: 'revenue',
  },
  {
    id: 'churn_rate',
    industryId: 'technology',
    name: { en: 'Churn Rate', fr: 'Taux d\'attrition' },
    formula: '=Churned Customers / Total Customers',
    description: {
      en: 'Percentage of customers lost per period',
      fr: 'Pourcentage de clients perdus par période',
    },
    format: 'percentage',
    decimals: 2,
    benchmark: { min: 0, max: 5, unit: '%' },
    category: 'growth',
  },
  {
    id: 'cac',
    industryId: 'technology',
    name: { en: 'Customer Acquisition Cost', fr: 'Coût d\'acquisition client' },
    formula: '=Marketing & Sales Costs / New Customers',
    description: {
      en: 'Average cost to acquire one customer',
      fr: 'Coût moyen pour acquérir un client',
    },
    format: 'currency',
    decimals: 0,
    category: 'cost',
  },
  {
    id: 'ltv',
    industryId: 'technology',
    name: { en: 'Lifetime Value', fr: 'Valeur à vie' },
    formula: '=Average Revenue per Customer / Churn Rate',
    description: {
      en: 'Total revenue expected from average customer',
      fr: 'Revenus totaux attendus d\'un client moyen',
    },
    format: 'currency',
    decimals: 0,
    category: 'profitability',
  },
  {
    id: 'ltv_cac_ratio',
    industryId: 'technology',
    name: { en: 'LTV:CAC Ratio', fr: 'Ratio LTV:CAC' },
    formula: '=Lifetime Value / Customer Acquisition Cost',
    description: {
      en: 'Ratio of customer lifetime value to acquisition cost',
      fr: 'Ratio de la valeur à vie du client au coût d\'acquisition',
    },
    format: 'number',
    decimals: 1,
    benchmark: { min: 3, max: 5, unit: 'ratio' },
    category: 'profitability',
  },
  {
    id: 'runway',
    industryId: 'technology',
    name: { en: 'Runway (Months)', fr: 'Piste (mois)' },
    formula: '=Cash Balance / Monthly Burn Rate',
    description: {
      en: 'Months of cash remaining at current burn rate',
      fr: 'Mois de trésorerie restants au taux de consommation actuel',
    },
    format: 'number',
    decimals: 1,
    category: 'profitability',
  },
];

/**
 * Agriculture KPIs
 */
export const AGRICULTURE_KPIS: KPIFormula[] = [
  {
    id: 'yield_per_hectare',
    industryId: 'agriculture',
    name: { en: 'Yield per Hectare', fr: 'Rendement par hectare' },
    formula: '=Total Production / Total Hectares',
    description: {
      en: 'Production output per hectare',
      fr: 'Production par hectare',
    },
    format: 'number',
    decimals: 2,
    category: 'efficiency',
  },
  {
    id: 'cost_per_unit',
    industryId: 'agriculture',
    name: { en: 'Cost per Unit', fr: 'Coût par unité' },
    formula: '=Total Production Cost / Total Production',
    description: {
      en: 'Average cost to produce one unit',
      fr: 'Coût moyen pour produire une unité',
    },
    format: 'currency',
    decimals: 2,
    category: 'cost',
  },
  {
    id: 'contribution_margin',
    industryId: 'agriculture',
    name: { en: 'Contribution Margin', fr: 'Marge de contribution' },
    formula: '=(Price per Unit - Variable Cost per Unit) / Price per Unit',
    description: {
      en: 'Margin after variable costs',
      fr: 'Marge après coûts variables',
    },
    format: 'percentage',
    decimals: 1,
    category: 'profitability',
  },
];

/**
 * Transport & Logistics KPIs
 */
export const TRANSPORT_KPIS: KPIFormula[] = [
  {
    id: 'cost_per_km',
    industryId: 'transport',
    name: { en: 'Cost per Kilometer', fr: 'Coût par kilomètre' },
    formula: '=Total Operating Costs / Total Kilometers',
    description: {
      en: 'Average cost per kilometer driven',
      fr: 'Coût moyen par kilomètre parcouru',
    },
    format: 'currency',
    decimals: 2,
    category: 'cost',
  },
  {
    id: 'fleet_utilization',
    industryId: 'transport',
    name: { en: 'Fleet Utilization Rate', fr: 'Taux d\'utilisation de la flotte' },
    formula: '=Vehicles in Use / Total Vehicles',
    description: {
      en: 'Percentage of fleet actively generating revenue',
      fr: 'Pourcentage de la flotte générant activement des revenus',
    },
    format: 'percentage',
    decimals: 1,
    benchmark: { min: 80, max: 95, unit: '%' },
    category: 'efficiency',
  },
  {
    id: 'revenue_per_truck',
    industryId: 'transport',
    name: { en: 'Revenue per Truck', fr: 'Revenu par camion' },
    formula: '=Total Revenue / Number of Trucks',
    description: {
      en: 'Average revenue generated per truck',
      fr: 'Revenu moyen généré par camion',
    },
    format: 'currency',
    decimals: 0,
    category: 'revenue',
  },
];

/**
 * Get all KPIs for an industry
 */
export function getKPIsForIndustry(industryId: string): KPIFormula[] {
  const allKPIs = [
    ...RESTAURANT_KPIS,
    ...REAL_ESTATE_KPIS,
    ...CONSTRUCTION_KPIS,
    ...HOSPITALITY_KPIS,
    ...RETAIL_KPIS,
    ...PROFESSIONAL_SERVICES_KPIS,
    ...MANUFACTURING_KPIS,
    ...TECHNOLOGY_KPIS,
    ...AGRICULTURE_KPIS,
    ...TRANSPORT_KPIS,
  ];
  
  return allKPIs.filter(kpi => kpi.industryId === industryId);
}

/**
 * Get KPI by ID
 */
export function getKPIById(kpiId: string): KPIFormula | undefined {
  const allKPIs = [
    ...RESTAURANT_KPIS,
    ...REAL_ESTATE_KPIS,
    ...CONSTRUCTION_KPIS,
    ...HOSPITALITY_KPIS,
    ...RETAIL_KPIS,
    ...PROFESSIONAL_SERVICES_KPIS,
    ...MANUFACTURING_KPIS,
    ...TECHNOLOGY_KPIS,
    ...AGRICULTURE_KPIS,
    ...TRANSPORT_KPIS,
  ];
  
  return allKPIs.find(kpi => kpi.id === kpiId);
}
