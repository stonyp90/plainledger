/**
 * Expense Planning Calculation Engine
 * 
 * Focused calculations for expense-based cash flow forecasting
 */

import { PlannedExpense, getExpenseCashImpact } from './strategicPlanning';
import { isProjectionRequestValid, isPlannedExpenseValid } from './planningValidation';

/**
 * Project cash flow based on planned expenses
 */
export function projectCashFlow(
  currentCash: number,
  currentDate: Date,
  expenses: PlannedExpense[],
  baseRevenue: number = 0,
  months: number = 24
): Array<{
  date: string;
  cash: number;
  revenue: number;
  expenses: number;
  confidence: number;
}> {
  if (!isProjectionRequestValid(currentCash, currentDate, months) || !Number.isFinite(baseRevenue) ||
      !Array.isArray(expenses) || !expenses.every(isPlannedExpenseValid)) {
    throw new RangeError('Forecast requires valid amounts, dates, and a horizon from 0 to 1200 months.');
  }
  const projected: Array<{
    date: string;
    cash: number;
    revenue: number;
    expenses: number;
    confidence: number;
  }> = [];
  
  let runningCash = currentCash;
  
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(currentDate);
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth() + i);
    
    let monthExpenses = 0;
    let totalConfidence = 0;
    let expenseCount = 0;
    
    // Calculate expense impact for this month
    expenses.forEach(expense => {
      const impact = getExpenseCashImpact(expense, monthDate);
      if (impact !== 0) {
        monthExpenses += Math.abs(impact);
        totalConfidence += expense.confidence;
        expenseCount++;
      }
    });
    
    const monthRevenue = baseRevenue;
    const netBurn = monthExpenses - monthRevenue;
    runningCash += monthRevenue - monthExpenses;
    
    // Calculate average confidence
    const confidence = expenseCount > 0 
      ? totalConfidence / expenseCount / 100 
      : 0.85;
    
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
  
  return projected;
}
