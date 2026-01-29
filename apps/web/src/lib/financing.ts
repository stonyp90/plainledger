/**
 * Financing Sources and Montage Financier
 * 
 * Quebec-specific financing options for businesses
 */

export type FinancingType = 'debt' | 'equity' | 'grant';

export interface FinancingSource {
  id: string;
  type: FinancingType;
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  amount: number;
  interestRate?: number; // Annual percentage rate
  term?: number; // Months
  gracePeriod?: number; // Months before first payment
  conditions?: string[];
  disbursementSchedule?: DisbursementEvent[];
  repaymentSchedule?: RepaymentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface DisbursementEvent {
  date: string; // ISO date
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface RepaymentEvent {
  date: string; // ISO date
  principal: number;
  interest: number;
  total: number;
  status: 'pending' | 'completed' | 'missed';
}

export interface FinancingUse {
  id: string;
  category: string;
  description: string;
  amount: number;
  percentage: number; // Percentage of total project cost
}

export interface MontageFinancier {
  id: string;
  projectName: string;
  totalCost: number;
  sources: FinancingSource[];
  uses: FinancingUse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Financing Templates - Common Quebec Financing Options
 */
export const FINANCING_TEMPLATES: Omit<FinancingSource, 'id' | 'amount' | 'createdAt' | 'updatedAt'>[] = [
  // Debt Financing
  {
    type: 'debt',
    name: { en: 'Term Loan', fr: 'Prêt terme' },
    description: {
      en: 'Traditional bank term loan with fixed repayment schedule',
      fr: 'Prêt bancaire traditionnel avec échéancier de remboursement fixe',
    },
    interestRate: 5.5,
    term: 60,
    gracePeriod: 0,
    conditions: [
      'Personal guarantee required',
      'Business plan required',
      'Financial statements required',
    ],
  },
  {
    type: 'debt',
    name: { en: 'Line of Credit', fr: 'Marge de crédit' },
    description: {
      en: 'Revolving credit facility for working capital',
      fr: 'Facilité de crédit renouvelable pour fonds de roulement',
    },
    interestRate: 7.0,
    conditions: [
      'Annual review required',
      'Collateral may be required',
    ],
  },
  {
    type: 'debt',
    name: { en: 'BDC Loan', fr: 'Prêt BDC' },
    description: {
      en: 'Business Development Bank of Canada financing',
      fr: 'Financement de la Banque de développement du Canada',
    },
    interestRate: 6.0,
    term: 84,
    gracePeriod: 6,
    conditions: [
      'Canadian business required',
      'Business plan required',
      'Financial projections required',
    ],
  },
  {
    type: 'debt',
    name: { en: 'Commercial Mortgage', fr: 'Prêt hypothécaire commercial' },
    description: {
      en: 'Long-term financing secured by commercial property',
      fr: 'Financement à long terme garanti par propriété commerciale',
    },
    interestRate: 4.5,
    term: 240,
    gracePeriod: 0,
    conditions: [
      'Property appraisal required',
      'Down payment typically 20-30%',
    ],
  },
  {
    type: 'debt',
    name: { en: 'Equipment Financing', fr: 'Financement d\'équipement' },
    description: {
      en: 'Financing for equipment purchase',
      fr: 'Financement pour achat d\'équipement',
    },
    interestRate: 6.5,
    term: 60,
    gracePeriod: 0,
    conditions: [
      'Equipment serves as collateral',
      'Equipment appraisal required',
    ],
  },
  
  // Government Programs
  {
    type: 'grant',
    name: { en: 'Investissement Québec', fr: 'Investissement Québec' },
    description: {
      en: 'Quebec government financing and investment programs',
      fr: 'Programmes de financement et d\'investissement du gouvernement du Québec',
    },
    conditions: [
      'Quebec-based business',
      'Job creation potential',
      'Innovation or export potential',
    ],
  },
  {
    type: 'grant',
    name: { en: 'ESSOR Program', fr: 'Programme ESSOR' },
    description: {
      en: 'Quebec program for business start-ups and expansions',
      fr: 'Programme québécois pour démarrages et expansions d\'entreprises',
    },
    conditions: [
      'Quebec-based business',
      'Less than 5 years old',
      'Job creation required',
    ],
  },
  {
    type: 'grant',
    name: { en: 'SR&ED Tax Credit', fr: 'Crédit d\'impôt R&D' },
    description: {
      en: 'Scientific Research and Experimental Development tax credit',
      fr: 'Crédit d\'impôt pour recherche et développement',
    },
    conditions: [
      'R&D activities in Canada',
      'Technical documentation required',
      'Annual filing required',
    ],
  },
  {
    type: 'grant',
    name: { en: 'Canada-Quebec PCIC', fr: 'Subvention Canada-Québec PCIC' },
    description: {
      en: 'Canada-Quebec Partnership for Innovation and Competitiveness',
      fr: 'Partenariat Canada-Québec pour l\'innovation et la compétitivité',
    },
    conditions: [
      'Innovation project',
      'Partnership with research institution',
      'Commercialization potential',
    ],
  },
  {
    type: 'grant',
    name: { en: 'MAPAQ Programs', fr: 'Programmes MAPAQ' },
    description: {
      en: 'Quebec Agriculture Ministry funding programs',
      fr: 'Programmes de financement du ministère de l\'agriculture du Québec',
    },
    conditions: [
      'Agriculture or agri-food business',
      'Quebec-based',
      'Compliance with regulations',
    ],
  },
  
  // Equity Financing
  {
    type: 'equity',
    name: { en: 'Personal Investment', fr: 'Apport personnel' },
    description: {
      en: 'Owner\'s personal capital investment',
      fr: 'Investissement en capital personnel du propriétaire',
    },
    conditions: [
      'No repayment required',
      'Dilution of ownership',
    ],
  },
  {
    type: 'equity',
    name: { en: 'Angel Investment', fr: 'Investissement anges' },
    description: {
      en: 'Early-stage investment from angel investors',
      fr: 'Investissement en phase de démarrage d\'investisseurs anges',
    },
    conditions: [
      'Equity stake required',
      'Business plan and pitch required',
      'Growth potential required',
    ],
  },
  {
    type: 'equity',
    name: { en: 'Venture Capital', fr: 'Capital de risque' },
    description: {
      en: 'VC funding for high-growth startups',
      fr: 'Financement VC pour startups à forte croissance',
    },
    conditions: [
      'Significant equity stake required',
      'High growth potential',
      'Exit strategy required',
    ],
  },
  {
    type: 'equity',
    name: { en: 'Love Money', fr: 'Love money' },
    description: {
      en: 'Investment from friends and family',
      fr: 'Investissement d\'amis et de la famille',
    },
    conditions: [
      'Personal relationships',
      'Flexible terms possible',
    ],
  },
];

/**
 * Common financing use categories
 */
export const FINANCING_USE_CATEGORIES = [
  { id: 'equipment', name: { en: 'Equipment', fr: 'Équipement' } },
  { id: 'working_capital', name: { en: 'Working Capital', fr: 'Fonds de roulement' } },
  { id: 'real_estate', name: { en: 'Real Estate', fr: 'Immobilier' } },
  { id: 'inventory', name: { en: 'Inventory', fr: 'Inventaire' } },
  { id: 'marketing', name: { en: 'Marketing & Sales', fr: 'Marketing et ventes' } },
  { id: 'rd', name: { en: 'Research & Development', fr: 'Recherche et développement' } },
  { id: 'debt_consolidation', name: { en: 'Debt Consolidation', fr: 'Consolidation de dettes' } },
  { id: 'expansion', name: { en: 'Expansion', fr: 'Expansion' } },
  { id: 'acquisition', name: { en: 'Acquisition', fr: 'Acquisition' } },
  { id: 'other', name: { en: 'Other', fr: 'Autre' } },
];

/**
 * Calculate monthly payment for a loan
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (termMonths === 0) return 0;
  
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return payment;
}

/**
 * Generate repayment schedule for a loan
 */
export function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  startDate: Date,
  gracePeriodMonths: number = 0
): RepaymentEvent[] {
  const schedule: RepaymentEvent[] = [];
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  const monthlyRate = annualRate / 100 / 12;
  
  let remainingPrincipal = principal;
  const currentDate = new Date(startDate);
  
  // Add grace period months (interest only or no payment)
  for (let i = 0; i < gracePeriodMonths; i++) {
    const interest = remainingPrincipal * monthlyRate;
    schedule.push({
      date: currentDate.toISOString(),
      principal: 0,
      interest,
      total: interest,
      status: 'pending',
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  // Generate regular payments
  for (let i = 0; i < termMonths; i++) {
    const interest = remainingPrincipal * monthlyRate;
    const principalPayment = monthlyPayment - interest;
    remainingPrincipal -= principalPayment;
    
    schedule.push({
      date: currentDate.toISOString(),
      principal: principalPayment,
      interest,
      total: monthlyPayment,
      status: 'pending',
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
    
    if (remainingPrincipal <= 0.01) break;
  }
  
  return schedule;
}

/**
 * Calculate debt service coverage ratio
 */
export function calculateDebtServiceCoverage(
  netOperatingIncome: number,
  totalDebtService: number
): number {
  if (totalDebtService === 0) return Infinity;
  return netOperatingIncome / totalDebtService;
}

/**
 * Calculate total project cost from uses
 */
export function calculateTotalProjectCost(uses: FinancingUse[]): number {
  return uses.reduce((sum, use) => sum + use.amount, 0);
}

/**
 * Calculate total financing from sources
 */
export function calculateTotalFinancing(sources: FinancingSource[]): number {
  return sources.reduce((sum, source) => sum + source.amount, 0);
}

/**
 * Calculate equity percentage
 */
export function calculateEquityPercentage(
  sources: FinancingSource[],
  totalCost: number
): number {
  const equityAmount = sources
    .filter(s => s.type === 'equity')
    .reduce((sum, s) => sum + s.amount, 0);
  
  return totalCost > 0 ? (equityAmount / totalCost) * 100 : 0;
}

/**
 * Calculate debt-to-equity ratio
 */
export function calculateDebtToEquityRatio(sources: FinancingSource[]): number {
  const debtAmount = sources
    .filter(s => s.type === 'debt')
    .reduce((sum, s) => sum + s.amount, 0);
  
  const equityAmount = sources
    .filter(s => s.type === 'equity')
    .reduce((sum, s) => sum + s.amount, 0);
  
  return equityAmount > 0 ? debtAmount / equityAmount : Infinity;
}

/**
 * Calculate total monthly debt service
 */
export function calculateTotalMonthlyDebtService(sources: FinancingSource[]): number {
  return sources
    .filter(s => s.type === 'debt' && s.interestRate && s.term)
    .reduce((sum, source) => {
      const monthlyPayment = calculateMonthlyPayment(
        source.amount,
        source.interestRate!,
        source.term!
      );
      return sum + monthlyPayment;
    }, 0);
}

/**
 * Create financing source from template
 */
export function createFinancingSourceFromTemplate(
  template: Omit<FinancingSource, 'id' | 'createdAt' | 'updatedAt'>,
  amount: number
): FinancingSource {
  return {
    ...template,
    id: `financing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
