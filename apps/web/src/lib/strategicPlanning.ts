import { isProjectionRequestValid, isInitiativeValid, isAssumptionValid } from './planningValidation';
/**
 * Strategic Planning Types and Calculation Engine
 * 
 * Core types and calculations for executive cashflow strategic planning
 */

// =====================================================
// TYPES
// =====================================================

export interface Milestone {
  id: string;
  name: string;
  nameEn: string;
  date: string;
  type: 'funding' | 'product' | 'milestone' | 'custom';
  cashImpact?: number; // positive = inflow, negative = outflow
  description?: string;
}

export interface Initiative {
  id: string;
  name: string;
  nameEn: string;
  category: 'growth' | 'operations' | 'product' | 'people' | 'infrastructure';
  startDate: string;
  endDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold';
  cashImpact: {
    type: 'one_time' | 'recurring';
    amount: number;        // positive = inflow, negative = outflow
    frequency?: 'monthly' | 'quarterly' | 'annual';
  };
  milestones: Milestone[];
  dependencies: string[];  // initiative IDs
  owner?: string;
  confidence: number;      // 0-100% confidence in estimates
  description?: string;
}

export interface Assumption {
  id: string;
  category: 'revenue' | 'expense' | 'funding' | 'timing';
  name: string;
  nameEn: string;
  baseValue: number;
  scenarioValue: number;
  unit: 'currency' | 'percentage' | 'months' | 'number';
  notes?: string;
}

export interface Scenario {
  id: string;
  name: string;
  nameEn: string;
  type: 'base' | 'optimistic' | 'pessimistic' | 'custom';
  assumptions: Assumption[];
  initiatives: Initiative[];
  createdAt: string;
  updatedAt: string;
  isLocked: boolean;
  description?: string;
}

export interface RunwayAnalysis {
  currentCash: number;
  monthlyBurnRate: number;
  netBurnRate: number;
  grossBurnRate: number;
  runwayMonths: number;
  zeroDate: string;
  breakEvenDate?: string;
  confidenceLevel: number;
  projectedCashByMonth: Array<{
    date: string;
    cash: number;
    burn: number;
  }>;
}

export interface CashForecast {
  historical: Array<{
    date: string;
    cash: number;
    revenue: number;
    expenses: number;
  }>;
  projected: Array<{
    date: string;
    cash: number;
    revenue: number;
    expenses: number;
    confidence: number;
  }>;
  breakEvenDate?: string;
}

/**
 * Planned Expense - Focused expense planning type
 * Used for executive expense planning with drag-and-drop timeline
 */
export interface PlannedExpense {
  id: string;
  name: string;
  nameEn: string;
  type: 'opex' | 'capex';
  category: string; // 'salaries' | 'marketing' | 'rent' | 'equipment' | 'property' | etc.
  startDate: string;
  endDate: string;
  amount: number; // For OPEX: monthly amount, For CAPEX: total amount
  frequency: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  isLocked: boolean; // Committed expenses can't be moved
  confidence: number; // 0-100%
  notes?: string;
}

// =====================================================
// CONVERSION UTILITIES
// =====================================================

/**
 * Convert Initiative to PlannedExpense
 */
export function initiativeToExpense(initiative: Initiative): PlannedExpense {
  const isOPEX = initiative.cashImpact.type === 'recurring';
  const categoryMap: Record<Initiative['category'], string> = {
    growth: 'marketing',
    operations: 'operations',
    product: 'product',
    people: 'salaries',
    infrastructure: 'infrastructure',
  };

  return {
    id: initiative.id,
    name: initiative.name,
    nameEn: initiative.nameEn,
    type: isOPEX ? 'opex' : 'capex',
    category: categoryMap[initiative.category] || 'other',
    startDate: initiative.startDate,
    endDate: initiative.endDate,
    amount: Math.abs(initiative.cashImpact.amount),
    frequency: initiative.cashImpact.type === 'recurring' 
      ? (initiative.cashImpact.frequency || 'monthly')
      : 'one_time',
    isLocked: initiative.status === 'in_progress' || initiative.status === 'completed',
    confidence: initiative.confidence,
    notes: initiative.description,
  };
}

/**
 * Convert PlannedExpense to Initiative
 */
export function expenseToInitiative(expense: PlannedExpense): Initiative {
  const categoryMap: Record<string, Initiative['category']> = {
    marketing: 'growth',
    salaries: 'people',
    operations: 'operations',
    product: 'product',
    infrastructure: 'infrastructure',
    equipment: 'infrastructure',
    property: 'infrastructure',
    other: 'operations',
  };

  return {
    id: expense.id,
    name: expense.name,
    nameEn: expense.nameEn,
    category: categoryMap[expense.category] || 'operations',
    startDate: expense.startDate,
    endDate: expense.endDate,
    status: expense.isLocked ? 'in_progress' : 'planned',
    cashImpact: {
      type: expense.frequency === 'one_time' ? 'one_time' : 'recurring',
      amount: expense.type === 'opex' ? -expense.amount : -expense.amount,
      frequency: expense.frequency !== 'one_time' ? expense.frequency : undefined,
    },
    milestones: [],
    dependencies: [],
    confidence: expense.confidence,
    description: expense.notes,
  };
}

/**
 * Calculate cash impact of a planned expense for a given month
 */
export function getExpenseCashImpact(
  expense: PlannedExpense,
  monthDate: Date
): number {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const expStart = new Date(expense.startDate);
  const expEnd = new Date(expense.endDate);
  
  // Check if expense is active in this month
  if (expStart >= nextMonthStart || expEnd < monthStart) {
    return 0;
  }
  
  if (expense.frequency === 'one_time') {
    // One-time impact only in the first month
    if (expStart >= monthStart && expStart < nextMonthStart) {
      return -expense.amount; // Negative = outflow
    }
    return 0;
  }
  
  // Recurring impact
  const frequencyMonths = {
    monthly: 1,
    quarterly: 3,
    annual: 12,
  };
  
  const monthsSinceStart = 
    (monthDate.getFullYear() - expStart.getFullYear()) * 12 +
    (monthDate.getMonth() - expStart.getMonth());
  
  if (monthsSinceStart < 0) return 0;
  
  const frequency = frequencyMonths[expense.frequency];
  if (monthsSinceStart % frequency === 0) {
    return -expense.amount; // Negative = outflow
  }
  
  return 0;
}

/**
 * Calculate runway from planned expenses
 */
export function calculateRunwayFromExpenses(
  currentCash: number,
  currentDate: Date,
  expenses: PlannedExpense[],
  baseRevenue: number = 0,
  months: number = 24
): {
  runwayMonths: number;
  zeroDate: string;
  monthlyBurnRate: number;
  projectedCashByMonth: Array<{ date: string; cash: number; burn: number }>;
} {
  let runningCash = currentCash;
  const projected: Array<{ date: string; cash: number; burn: number }> = [];
  
  let totalMonthlyExpenses = 0;
  
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(currentDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    
    let monthExpenses = 0;
    
    // Calculate expense impact for this month
    expenses.forEach(expense => {
      monthExpenses += Math.abs(getExpenseCashImpact(expense, monthDate));
    });
    
    // Track average monthly expenses
    if (i < 12) {
      totalMonthlyExpenses += monthExpenses;
    }
    
    const netBurn = monthExpenses - baseRevenue;
    runningCash += baseRevenue - monthExpenses;
    
    projected.push({
      date: monthDate.toISOString(),
      cash: Math.max(0, runningCash),
      burn: netBurn,
    });
    
    // Stop if we hit zero
    if (runningCash <= 0 && i > 0) {
      break;
    }
  }
  
  const avgMonthlyBurn = totalMonthlyExpenses / Math.min(12, months);
  const monthlyBurnRate = avgMonthlyBurn - baseRevenue;
  const runwayMonths = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : Infinity;
  
  // Find zero date
  const zeroIndex = projected.findIndex(p => p.cash <= 0);
  const zeroDate = zeroIndex >= 0 
    ? projected[zeroIndex].date 
    : new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    runwayMonths,
    zeroDate,
    monthlyBurnRate: Math.abs(monthlyBurnRate),
    projectedCashByMonth: projected,
  };
}

// =====================================================
// CALCULATION ENGINE
// =====================================================

/**
 * Calculate monthly burn rate from historical data
 */
export function calculateBurnRate(
  historicalCash: Array<{ date: string; cash: number }>,
  months: number = 3
): number {
  if (historicalCash.length < 2) return 0;
  
  const sorted = [...historicalCash].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const recent = sorted.slice(-Math.min(months, sorted.length));
  if (recent.length < 2) return 0;
  
  const first = recent[0].cash;
  const last = recent[recent.length - 1].cash;
  const daysDiff = (new Date(recent[recent.length - 1].date).getTime() - 
                   new Date(recent[0].date).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff === 0) return 0;
  
  const monthlyBurn = ((first - last) / daysDiff) * 30;
  return monthlyBurn;
}

/**
 * Calculate net burn rate (expenses - revenue)
 */
export function calculateNetBurnRate(
  monthlyRevenue: number,
  monthlyExpenses: number
): number {
  return monthlyExpenses - monthlyRevenue;
}

/**
 * Calculate runway in months
 */
export function calculateRunway(
  currentCash: number,
  monthlyBurnRate: number
): number {
  if (monthlyBurnRate <= 0) return Infinity;
  return currentCash / monthlyBurnRate;
}

/**
 * Calculate zero cash date
 */
export function calculateZeroDate(
  currentCash: number,
  monthlyBurnRate: number,
  startDate: Date = new Date()
): Date {
  if (monthlyBurnRate <= 0) {
    return new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year out
  }
  
  const months = calculateRunway(currentCash, monthlyBurnRate);
  const result = new Date(startDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate cash impact of an initiative for a given month
 */
export function getInitiativeCashImpact(
  initiative: Initiative,
  monthDate: Date
): number {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const nextMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  const initStart = new Date(initiative.startDate);
  const initEnd = new Date(initiative.endDate);
  
  // Check if initiative is active in this month
  if (initStart >= nextMonthStart || initEnd < monthStart) {
    return 0;
  }
  
  if (initiative.cashImpact.type === 'one_time') {
    // One-time impact only in the first month
    if (initStart >= monthStart && initStart < nextMonthStart) {
      return initiative.cashImpact.amount;
    }
    return 0;
  }
  
  // Recurring impact
  if (!initiative.cashImpact.frequency) {
    return 0;
  }
  
  const frequencyMonths = {
    monthly: 1,
    quarterly: 3,
    annual: 12,
  };
  
  const monthsSinceStart = 
    (monthDate.getFullYear() - initStart.getFullYear()) * 12 +
    (monthDate.getMonth() - initStart.getMonth());
  
  if (monthsSinceStart < 0) return 0;
  
  const frequency = frequencyMonths[initiative.cashImpact.frequency];
  if (monthsSinceStart % frequency === 0) {
    return initiative.cashImpact.amount;
  }
  
  return 0;
}

/**
 * Calculate projected cash position for a scenario
 */
export function calculateCashForecast(
  currentCash: number,
  currentDate: Date,
  initiatives: Initiative[],
  assumptions: Assumption[],
  months: number = 24
): CashForecast {
  if (!isProjectionRequestValid(currentCash, currentDate, months) || !Array.isArray(initiatives) ||
      !initiatives.every(isInitiativeValid) || !Array.isArray(assumptions) || !assumptions.every(isAssumptionValid)) {
    throw new RangeError('Forecast requires valid amounts, dates, and a horizon from 0 to 1200 months.');
  }
  const projected: CashForecast['projected'] = [];
  
  // Extract base assumptions
  const baseRevenue = assumptions.find(a => 
    a.category === 'revenue' && a.name === 'Monthly Revenue'
  )?.baseValue || 0;
  
  const baseExpenses = assumptions.find(a => 
    a.category === 'expense' && a.name === 'Monthly Expenses'
  )?.baseValue || 0;
  
  let runningCash = currentCash;
  
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(currentDate);
    // Anchor monthly buckets before advancing to avoid Jan 31 skipping February.
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth() + i);
    
    // Base revenue and expenses
    let monthRevenue = baseRevenue;
    let monthExpenses = baseExpenses;
    
    // Apply scenario assumptions
    assumptions.forEach(assumption => {
      if (assumption.category === 'revenue') {
        monthRevenue = assumption.scenarioValue;
      } else if (assumption.category === 'expense') {
        monthExpenses = assumption.scenarioValue;
      }
    });
    
    // Add initiative impacts
    initiatives.forEach(initiative => {
      const impact = getInitiativeCashImpact(initiative, monthDate);
      if (impact > 0) {
        monthRevenue += impact;
      } else {
        monthExpenses += Math.abs(impact);
      }
    });
    
    // Calculate net burn
    const netBurn = monthExpenses - monthRevenue;
    runningCash += monthRevenue - monthExpenses;
    
    // Calculate confidence (simplified - could be more sophisticated)
    const confidence = initiatives.reduce((acc, init) => {
      if (init.startDate <= monthDate.toISOString() && 
          init.endDate >= monthDate.toISOString()) {
        return acc * (init.confidence / 100);
      }
      return acc;
    }, 0.85);
    
    if (![runningCash, monthRevenue, monthExpenses, confidence].every(Number.isFinite)) {
      throw new RangeError('Forecast amounts exceed the supported numeric range.');
    }
    projected.push({
      date: monthDate.toISOString(),
      cash: runningCash,
      revenue: monthRevenue,
      expenses: monthExpenses,
      confidence: Math.min(1, confidence),
    });
    
  }
  
  // Operating break-even is the first modeled month whose revenue covers its
  // expenses. A positive opening cash balance alone does not imply break-even.
  const breakEvenIndex = projected.findIndex(point =>
    point.revenue >= point.expenses && (point.revenue > 0 || point.expenses > 0));
  
  return {
    historical: [],
    projected,
    breakEvenDate: breakEvenIndex >= 0 ? projected[breakEvenIndex].date : undefined,
  };
}

/**
 * Calculate runway analysis for a scenario
 */
export function calculateRunwayAnalysis(
  currentCash: number,
  currentDate: Date,
  initiatives: Initiative[],
  assumptions: Assumption[],
  historicalCash?: Array<{ date: string; cash: number }>
): RunwayAnalysis {
  // Calculate base burn rate from historical or assumptions
  let monthlyBurnRate = 0;
  
  if (historicalCash && historicalCash.length > 0) {
    monthlyBurnRate = calculateBurnRate(historicalCash, 3);
  } else {
    const baseExpenses = assumptions.find(a => 
      a.category === 'expense' && a.name === 'Monthly Expenses'
    )?.scenarioValue || 0;
    
    const baseRevenue = assumptions.find(a => 
      a.category === 'revenue' && a.name === 'Monthly Revenue'
    )?.scenarioValue || 0;
    
    monthlyBurnRate = baseExpenses - baseRevenue;
  }
  
  // Calculate gross burn (expenses only)
  const grossBurn = assumptions.find(a => 
    a.category === 'expense' && a.name === 'Monthly Expenses'
  )?.scenarioValue || monthlyBurnRate;
  
  // Project forward to get more accurate burn rate
  const forecast = calculateCashForecast(
    currentCash,
    currentDate,
    initiatives,
    assumptions,
    12
  );
  
  if (forecast.projected.length > 1) {
    const firstMonth = forecast.projected[0];
    const lastMonth = forecast.projected[forecast.projected.length - 1];
    const monthsDiff = forecast.projected.length - 1;
    
    if (monthsDiff > 0) {
      monthlyBurnRate = (firstMonth.cash - lastMonth.cash) / monthsDiff;
    }
  }
  
  const netBurnRate = monthlyBurnRate;
  const runwayMonths = calculateRunway(currentCash, monthlyBurnRate);
  const zeroDate = calculateZeroDate(currentCash, monthlyBurnRate, currentDate);
  
  // Calculate confidence based on initiative confidence levels
  const avgConfidence = initiatives.length > 0
    ? initiatives.reduce((sum, init) => sum + init.confidence, 0) / initiatives.length
    : 85;
  
  return {
    currentCash,
    monthlyBurnRate: Math.abs(monthlyBurnRate),
    netBurnRate: Math.abs(netBurnRate),
    grossBurnRate: grossBurn,
    runwayMonths,
    zeroDate: zeroDate.toISOString(),
    confidenceLevel: avgConfidence,
    projectedCashByMonth: forecast.projected.map(p => ({
      date: p.date,
      cash: p.cash,
      burn: p.expenses - p.revenue,
    })),
  };
}

/**
 * Generate unique ID for planning entities
 */
export function generatePlanningId(prefix: string = 'plan'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default base scenario
 */
export function createBaseScenario(
  currentCash: number,
  monthlyRevenue: number = 0,
  monthlyExpenses: number = 0
): Scenario {
  return {
    id: generatePlanningId('scenario'),
    name: 'Scénario de base',
    nameEn: 'Base Scenario',
    type: 'base',
    assumptions: [
      {
        id: generatePlanningId('assumption'),
        category: 'revenue',
        name: 'Revenus mensuels',
        nameEn: 'Monthly Revenue',
        baseValue: monthlyRevenue,
        scenarioValue: monthlyRevenue,
        unit: 'currency',
      },
      {
        id: generatePlanningId('assumption'),
        category: 'expense',
        name: 'Dépenses mensuelles',
        nameEn: 'Monthly Expenses',
        baseValue: monthlyExpenses,
        scenarioValue: monthlyExpenses,
        unit: 'currency',
      },
    ],
    initiatives: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLocked: false,
  };
}
