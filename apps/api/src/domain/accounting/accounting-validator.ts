/**
 * Accounting Validator
 * 
 * Validates financial calculations against accounting principles.
 * Ensures calculations follow proper accounting rules and equations.
 */

export interface TrialBalanceData {
  entries: Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
    debitBalance: number;
    creditBalance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
}

export interface BalanceSheetData {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface CashFlowData {
  openingCash: number;
  operatingNet: number;
  investingNet: number;
  financingNet: number;
  closingCash: number;
}

export interface IncomeStatementData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Trial Balance
 * 
 * Accounting Principle: Total debits must equal total credits
 * (Double-entry bookkeeping fundamental rule)
 */
export function validateTrialBalance(
  trialBalance: TrialBalanceData,
  tolerance: number = 0.01
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const difference = Math.abs(trialBalance.totalDebits - trialBalance.totalCredits);

  if (difference > tolerance) {
    errors.push(
      `Trial balance does not balance: Debits (${trialBalance.totalDebits.toFixed(2)}) ` +
      `≠ Credits (${trialBalance.totalCredits.toFixed(2)}). Difference: ${difference.toFixed(2)}`
    );
  }

  // Check for accounts with both debits and credits (should be netted)
  const accountsWithBoth = trialBalance.entries.filter(
    (e) => e.debitBalance > 0 && e.creditBalance > 0
  );
  if (accountsWithBoth.length > 0) {
    warnings.push(
      `${accountsWithBoth.length} accounts have both debit and credit balances. ` +
      `Consider netting these balances for clarity.`
    );
  }

  // Check for negative balances (may indicate data issues)
  const negativeDebits = trialBalance.entries.filter((e) => e.debitBalance < 0);
  const negativeCredits = trialBalance.entries.filter((e) => e.creditBalance < 0);
  if (negativeDebits.length > 0 || negativeCredits.length > 0) {
    warnings.push(
      `Found ${negativeDebits.length + negativeCredits.length} accounts with negative balances. ` +
      `Verify account type and transaction direction.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Balance Sheet Equation
 * 
 * Accounting Principle: Assets = Liabilities + Equity
 * (Fundamental accounting equation)
 */
export function validateBalanceSheet(
  balanceSheet: BalanceSheetData,
  tolerance: number = 0.01
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const calculatedEquity = balanceSheet.totalAssets - balanceSheet.totalLiabilities;
  const difference = Math.abs(balanceSheet.totalEquity - calculatedEquity);

  if (difference > tolerance) {
    errors.push(
      `Balance sheet equation violated: Assets (${balanceSheet.totalAssets.toFixed(2)}) ` +
      `≠ Liabilities (${balanceSheet.totalLiabilities.toFixed(2)}) + Equity (${balanceSheet.totalEquity.toFixed(2)}). ` +
      `Expected Equity: ${calculatedEquity.toFixed(2)}, Difference: ${difference.toFixed(2)}`
    );
  }

  // Check for negative values (may indicate data issues)
  if (balanceSheet.totalAssets < 0) {
    warnings.push(`Total Assets is negative: ${balanceSheet.totalAssets.toFixed(2)}`);
  }
  if (balanceSheet.totalLiabilities < 0) {
    warnings.push(`Total Liabilities is negative: ${balanceSheet.totalLiabilities.toFixed(2)}`);
  }
  if (balanceSheet.totalEquity < 0) {
    warnings.push(`Total Equity is negative: ${balanceSheet.totalEquity.toFixed(2)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Cash Flow Statement Reconciliation
 * 
 * Accounting Principle: Opening Cash + Net Change = Closing Cash
 * Where Net Change = Operating + Investing + Financing
 */
export function validateCashFlow(
  cashFlow: CashFlowData,
  tolerance: number = 0.01
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const netChange = cashFlow.operatingNet + cashFlow.investingNet + cashFlow.financingNet;
  const calculatedClosing = cashFlow.openingCash + netChange;
  const difference = Math.abs(cashFlow.closingCash - calculatedClosing);

  if (difference > tolerance) {
    errors.push(
      `Cash flow reconciliation failed: Opening (${cashFlow.openingCash.toFixed(2)}) + ` +
      `Net Change (${netChange.toFixed(2)}) ≠ Closing (${cashFlow.closingCash.toFixed(2)}). ` +
      `Expected Closing: ${calculatedClosing.toFixed(2)}, Difference: ${difference.toFixed(2)}`
    );
  }

  // Check for unusual patterns
  if (cashFlow.closingCash < 0 && cashFlow.openingCash > 0) {
    warnings.push(
      `Cash balance went from positive (${cashFlow.openingCash.toFixed(2)}) to negative ` +
      `(${cashFlow.closingCash.toFixed(2)}). Verify cash flow calculations.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Income Statement
 * 
 * Accounting Principle: Revenue - Expenses = Net Income
 */
export function validateIncomeStatement(
  incomeStatement: IncomeStatementData,
  tolerance: number = 0.01
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const calculatedNetIncome = incomeStatement.totalRevenue - incomeStatement.totalExpenses;
  const difference = Math.abs(incomeStatement.netIncome - calculatedNetIncome);

  if (difference > tolerance) {
    errors.push(
      `Income statement calculation error: Revenue (${incomeStatement.totalRevenue.toFixed(2)}) - ` +
      `Expenses (${incomeStatement.totalExpenses.toFixed(2)}) ≠ Net Income (${incomeStatement.netIncome.toFixed(2)}). ` +
      `Expected Net Income: ${calculatedNetIncome.toFixed(2)}, Difference: ${difference.toFixed(2)}`
    );
  }

  // Check for negative revenue (unusual but possible)
  if (incomeStatement.totalRevenue < 0) {
    warnings.push(`Total Revenue is negative: ${incomeStatement.totalRevenue.toFixed(2)}`);
  }

  // Check for negative expenses (unusual - may indicate credits/refunds)
  if (incomeStatement.totalExpenses < 0) {
    warnings.push(`Total Expenses is negative: ${incomeStatement.totalExpenses.toFixed(2)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Account Type Debit/Credit Rules
 * 
 * Accounting Rules:
 * - Assets: Debit increases, Credit decreases (normal balance: Debit)
 * - Liabilities: Credit increases, Debit decreases (normal balance: Credit)
 * - Equity: Credit increases, Debit decreases (normal balance: Credit)
 * - Revenue: Credit increases, Debit decreases (normal balance: Credit)
 * - Expenses: Debit increases, Credit decreases (normal balance: Debit)
 */
export function validateAccountTypeRules(
  accountType: string,
  debitBalance: number,
  creditBalance: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const netBalance = debitBalance - creditBalance;
  const accountTypeUpper = accountType.toUpperCase();

  switch (accountTypeUpper) {
    case "ASSET":
    case "BANK":
    case "CURRENT ASSET":
    case "FIXED ASSET":
    case "OTHER CURRENT ASSET":
      // Assets: Normal balance is Debit (positive)
      if (netBalance < 0 && Math.abs(netBalance) > 0.01) {
        warnings.push(
          `Asset account has credit balance (${netBalance.toFixed(2)}). ` +
          `Assets normally have debit balances. Verify transactions.`
        );
      }
      break;

    case "LIABILITY":
    case "ACCOUNTS PAYABLE":
    case "CURRENT LIABILITY":
    case "LONG TERM LIABILITY":
    case "OTHER CURRENT LIABILITY":
      // Liabilities: Normal balance is Credit (positive)
      if (netBalance > 0 && Math.abs(netBalance) > 0.01) {
        warnings.push(
          `Liability account has debit balance (${netBalance.toFixed(2)}). ` +
          `Liabilities normally have credit balances. Verify transactions.`
        );
      }
      break;

    case "EQUITY":
    case "OWNERS EQUITY":
      // Equity: Normal balance is Credit (positive)
      if (netBalance > 0 && Math.abs(netBalance) > 0.01) {
        warnings.push(
          `Equity account has debit balance (${netBalance.toFixed(2)}). ` +
          `Equity normally has credit balances. Verify transactions.`
        );
      }
      break;

    case "REVENUE":
    case "INCOME":
      // Revenue: Normal balance is Credit (positive)
      if (netBalance > 0 && Math.abs(netBalance) > 0.01) {
        warnings.push(
          `Revenue account has debit balance (${netBalance.toFixed(2)}). ` +
          `Revenue normally has credit balances. Verify transactions.`
        );
      }
      break;

    case "EXPENSE":
    case "COST OF GOODS SOLD":
      // Expenses: Normal balance is Debit (positive)
      if (netBalance < 0 && Math.abs(netBalance) > 0.01) {
        warnings.push(
          `Expense account has credit balance (${netBalance.toFixed(2)}). ` +
          `Expenses normally have debit balances. Verify transactions.`
        );
      }
      break;

    default:
      // Unknown account type - can't validate rules
      warnings.push(`Unknown account type: ${accountType}. Cannot validate debit/credit rules.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all accounting calculations
 * 
 * Comprehensive validation of all financial statements and calculations
 */
export function validateAllAccountingCalculations(
  trialBalance: TrialBalanceData,
  balanceSheet: BalanceSheetData,
  cashFlow: CashFlowData,
  incomeStatement: IncomeStatementData
): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate each component
  const trialBalanceResult = validateTrialBalance(trialBalance);
  const balanceSheetResult = validateBalanceSheet(balanceSheet);
  const cashFlowResult = validateCashFlow(cashFlow);
  const incomeStatementResult = validateIncomeStatement(incomeStatement);

  allErrors.push(...trialBalanceResult.errors);
  allErrors.push(...balanceSheetResult.errors);
  allErrors.push(...cashFlowResult.errors);
  allErrors.push(...incomeStatementResult.errors);

  allWarnings.push(...trialBalanceResult.warnings);
  allWarnings.push(...balanceSheetResult.warnings);
  allWarnings.push(...cashFlowResult.warnings);
  allWarnings.push(...incomeStatementResult.warnings);

  // Cross-validate relationships
  // Net Income from Income Statement should reconcile with Equity changes
  // (simplified - full reconciliation would require prior period equity)
  if (incomeStatement.netIncome !== 0 && balanceSheet.totalEquity !== 0) {
    // Note: This is a simplified check. Full reconciliation requires:
    // Ending Equity = Beginning Equity + Net Income - Dividends + Other Equity Changes
    // We can't fully validate without prior period data
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
