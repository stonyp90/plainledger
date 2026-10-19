import { isChartDate, isFiniteNumber } from './chartDataValidation';
import type { Assumption, Initiative, PlannedExpense } from './strategicPlanning';

// A bounded monthly horizon keeps accidental unbounded input from freezing the UI.
export const MAX_PROJECTION_MONTHS = 1200;

export function isProjectionRequestValid(cash: number, date: Date, months: number): boolean {
  return isFiniteNumber(cash) && date instanceof Date && Number.isFinite(date.getTime()) &&
    Number.isInteger(months) && months >= 0 && months <= MAX_PROJECTION_MONTHS;
}

export function isInitiativeValid(item: Initiative): boolean {
  return !!item && typeof item.id === 'string' && typeof item.name === 'string' &&
    isChartDate(item.startDate) && isChartDate(item.endDate) &&
    Date.parse(item.startDate) <= Date.parse(item.endDate) &&
    ['growth', 'operations', 'product', 'people', 'infrastructure'].includes(item.category) &&
    !!item.cashImpact && isFiniteNumber(item.cashImpact.amount) &&
    (item.cashImpact.type === 'one_time' || (item.cashImpact.type === 'recurring' &&
      ['monthly', 'quarterly', 'annual'].includes(item.cashImpact.frequency || ''))) &&
    isFiniteNumber(item.confidence) && item.confidence >= 0 && item.confidence <= 100;
}

export function isAssumptionValid(item: Assumption): boolean {
  return !!item && isFiniteNumber(item.baseValue) && isFiniteNumber(item.scenarioValue) &&
    ['revenue', 'expense', 'funding', 'timing'].includes(item.category);
}

export function isPlannedExpenseValid(item: PlannedExpense): boolean {
  return !!item && isChartDate(item.startDate) && isChartDate(item.endDate) &&
    Date.parse(item.startDate) <= Date.parse(item.endDate) && isFiniteNumber(item.amount) && item.amount >= 0 &&
    ['one_time', 'monthly', 'quarterly', 'annual'].includes(item.frequency) &&
    isFiniteNumber(item.confidence) && item.confidence >= 0 && item.confidence <= 100;
}
