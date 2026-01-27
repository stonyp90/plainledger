/**
 * Financial Model Types and Formula Engine
 * 
 * Provides types and evaluation engine for Runway-style financial models
 * with semantic driver names and timeline-based calculations
 */

// =====================================================
// TYPES
// =====================================================

export type DataSource = 'manual' | 'account' | 'formula';
export type ViewMode = 'monthly' | 'quarterly';

export interface Driver {
  id: string;
  name: string;
  nameEn?: string;
  formula?: string; // Formula referencing other drivers (e.g., "Bank Accounts / OPERATING ACTIVITIES")
  values: Record<string, number>; // Map of period key -> value (manual entries)
  dataSource: DataSource;
  accountId?: string; // Link to accounting data if dataSource = 'account'
  accountCode?: string; // Account code for reference
  format?: 'currency' | 'number' | 'percentage' | 'text';
  decimals?: number;
  description?: string;
}

export interface DriverGroup {
  id: string;
  name: string;
  nameEn?: string;
  driverIds: string[];
  collapsed: boolean;
  order: number;
}

export interface FinancialModel {
  id: string;
  name: string;
  nameEn?: string;
  groups: DriverGroup[];
  drivers: Record<string, Driver>; // Map of driverId -> Driver
  timelineStart: string; // ISO date string
  timelineEnd: string; // ISO date string
  viewMode: ViewMode;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// FORMULA FUNCTIONS
// =====================================================

const FORMULA_FUNCTIONS: Record<string, (...args: any[]) => number | string> = {
  SUM: (...args: number[]) => args.flat().reduce((a, b) => a + (Number(b) || 0), 0),
  AVERAGE: (...args: number[]) => {
    const flat = args.flat().filter(x => !isNaN(Number(x)));
    return flat.length > 0 ? flat.reduce((a, b) => a + Number(b), 0) / flat.length : 0;
  },
  MIN: (...args: number[]) => Math.min(...args.flat().map(Number).filter(x => !isNaN(x))),
  MAX: (...args: number[]) => Math.max(...args.flat().map(Number).filter(x => !isNaN(x))),
  ROUND: (num: number, decimals: number = 0) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
  ABS: (num: number) => Math.abs(num),
  IF: (condition: boolean, trueVal: any, falseVal: any) => condition ? trueVal : falseVal,
  SQRT: (num: number) => Math.sqrt(num),
  POWER: (base: number, exp: number) => Math.pow(base, exp),
};

// =====================================================
// PERIOD UTILITIES
// =====================================================

/**
 * Generate period keys for a date range
 */
export function generatePeriodKeys(
  startDate: Date,
  endDate: Date,
  viewMode: ViewMode
): string[] {
  const periods: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (viewMode === 'monthly') {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      periods.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    } else {
      // Quarterly
      const year = current.getFullYear();
      const quarter = Math.floor(current.getMonth() / 3) + 1;
      const periodKey = `${year}-Q${quarter}`;
      if (!periods.includes(periodKey)) {
        periods.push(periodKey);
      }
      current.setMonth(current.getMonth() + 3);
    }
  }
  
  return periods;
}

/**
 * Format period key for display
 */
export function formatPeriodKey(periodKey: string, viewMode: ViewMode): string {
  if (viewMode === 'monthly') {
    const [year, month] = periodKey.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month) - 1];
    return `${monthName} '${year.slice(2)}`;
  } else {
    // Quarterly
    return periodKey.replace('-Q', ' Q');
  }
}

/**
 * Get period key for a specific date
 */
export function getPeriodKey(date: Date, viewMode: ViewMode): string {
  if (viewMode === 'monthly') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } else {
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${year}-Q${quarter}`;
  }
}

// =====================================================
// FORMULA PARSER AND EVALUATOR
// =====================================================

/**
 * Extract driver names from a formula string
 */
export function extractDriverNames(formula: string): string[] {
  if (!formula || !formula.startsWith('=')) return [];
  
  const driverNames: string[] = [];
  let expr = formula.slice(1).trim();
  
  // Remove only the function names, keep the content inside parentheses
  const functionNames = Object.keys(FORMULA_FUNCTIONS).join('|');
  const funcNameRegex = new RegExp(`\\b(${functionNames})\\s*\\(`, 'gi');
  expr = expr.replace(funcNameRegex, '('); // Keep parentheses content
  
  // Remove operators and parentheses for cleaner parsing
  expr = expr.replace(/[()]/g, ' ');
  
  // Extract potential driver names - sequences of words/letters
  // Match patterns like "Bank Accounts", "OPERATING ACTIVITIES", "Cash Balance", etc.
  const patterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g, // Title Case with spaces (e.g., "Cash Balance")
    /([A-Z][A-Z\s]+[A-Z])/g, // ALL CAPS with spaces
    /([A-Z][a-zA-Z]+)/g, // Single word starting with capital
  ];
  
  patterns.forEach(pattern => {
    const matches = expr.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim();
        // Filter out function names and common operators
        const upper = cleaned.toUpperCase();
        if (!FORMULA_FUNCTIONS[upper] && 
            !['AND', 'OR', 'NOT', 'TRUE', 'FALSE'].includes(upper) &&
            cleaned.length > 1) {
          driverNames.push(cleaned);
        }
      });
    }
  });
  
  return [...new Set(driverNames)]; // Remove duplicates
}

/**
 * Normalize driver name for matching
 */
export function normalizeDriverName(name: string): string {
  return name.toUpperCase().trim().replace(/\s+/g, ' ');
}

/**
 * Find driver by name (case-insensitive, flexible matching)
 */
function findDriverByName(
  name: string,
  drivers: Record<string, Driver>
): Driver | null {
  const normalized = normalizeDriverName(name);
  
  for (const driver of Object.values(drivers)) {
    if (normalizeDriverName(driver.name) === normalized ||
        normalizeDriverName(driver.nameEn || '') === normalized) {
      return driver;
    }
  }
  
  return null;
}

/**
 * Evaluate a formula for a specific period
 */
export function evaluateFormula(
  formula: string,
  periodKey: string,
  drivers: Record<string, Driver>,
  getAccountValue?: (accountId: string, periodKey: string) => number | null,
  visited: Set<string> = new Set()
): number | string {
  if (!formula.startsWith('=')) {
    return formula;
  }
  
  let expr = formula.slice(1).trim();
  
  // Replace driver references with their values
  // We need to do this carefully to handle partial matches
  const driverNames = extractDriverNames(formula);
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedNames = [...driverNames].sort((a, b) => b.length - a.length);
  
  for (const driverName of sortedNames) {
    const driver = findDriverByName(driverName, drivers);
    if (driver) {
      // Check for circular reference
      if (visited.has(driver.id)) {
        return '#CIRCULAR';
      }
      
      // Get value for this period
      let value: number | null = null;
      
      if (driver.formula) {
        // Recursively evaluate formula
        const result = evaluateFormula(
          driver.formula,
          periodKey,
          drivers,
          getAccountValue,
          new Set([...visited, driver.id])
        );
        value = typeof result === 'number' ? result : (typeof result === 'string' && !result.startsWith('#') ? parseFloat(result) : null);
      } else if (driver.dataSource === 'account' && driver.accountId && getAccountValue) {
        value = getAccountValue(driver.accountId, periodKey);
      } else if (driver.dataSource === 'manual') {
        value = driver.values[periodKey] ?? null;
      }
      
      // Replace driver name in expression with value (case-insensitive, whole word)
      const escaped = driverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      expr = expr.replace(regex, value !== null ? String(value) : '0');
    } else {
      // Driver not found, replace with 0
      const escaped = driverName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      expr = expr.replace(regex, '0');
    }
  }
  
  // Replace function calls - evaluate arguments first
  for (const [funcName, func] of Object.entries(FORMULA_FUNCTIONS)) {
    const funcRegex = new RegExp(`${funcName}\\s*\\(([^)]+)\\)`, 'gi');
    expr = expr.replace(funcRegex, (_, args) => {
      const argList = args.split(',').map((arg: string) => {
        const trimmed = arg.trim();
        // Try to evaluate the argument as an expression first
        try {
          const evaluated = new Function(`return ${trimmed}`)();
          return typeof evaluated === 'number' && !isNaN(evaluated) ? evaluated : trimmed;
        } catch {
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
        }
      });
      try {
        return String(func(...argList));
      } catch {
        return '#ERROR';
      }
    });
  }
  
  // Evaluate arithmetic expression
  try {
    // Replace comparison operators
    expr = expr.replace(/([<>]=?|[=!]=)/g, (op) => {
      const ops: Record<string, string> = { '=': '==', '<>': '!=' };
      return ops[op] || op;
    });
    
    // Safe eval using Function constructor
    const result = new Function(`return ${expr}`)();
    return typeof result === 'number' && !isNaN(result) ? result : result;
  } catch {
    return '#ERROR';
  }
}

/**
 * Get driver value for a specific period
 */
export function getDriverValue(
  driver: Driver,
  periodKey: string,
  drivers: Record<string, Driver>,
  getAccountValue?: (accountId: string, periodKey: string) => number | null
): number | string | null {
  if (driver.formula) {
    return evaluateFormula(driver.formula, periodKey, drivers, getAccountValue);
  } else if (driver.dataSource === 'account' && driver.accountId && getAccountValue) {
    return getAccountValue(driver.accountId, periodKey);
  } else if (driver.dataSource === 'manual') {
    return driver.values[periodKey] ?? null;
  }
  
  return null;
}

/**
 * Format driver value based on format type
 */
export function formatDriverValue(
  value: number | string | null,
  format?: 'currency' | 'number' | 'percentage' | 'text',
  decimals?: number,
  currency: string = 'USD'
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    if (value.startsWith('#')) return value; // Error codes
    return value;
  }
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 2,
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(decimals ?? 1)}%`;
    case 'number':
      return value.toFixed(decimals ?? 0);
    default:
      return String(value);
  }
}

// =====================================================
// MODEL UTILITIES
// =====================================================

/**
 * Generate unique ID
 */
export function generateModelId(prefix: string = 'model'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default financial model
 */
export function createDefaultModel(
  name: string = 'Financial Model',
  nameEn: string = 'Financial Model',
  startDate: Date = new Date(),
  endDate: Date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
): FinancialModel {
  const modelId = generateModelId('model');
  const groupId = generateModelId('group');
  
  return {
    id: modelId,
    name,
    nameEn,
    groups: [{
      id: groupId,
      name: 'Financials',
      nameEn: 'Financials',
      driverIds: [],
      collapsed: false,
      order: 0,
    }],
    drivers: {},
    timelineStart: startDate.toISOString(),
    timelineEnd: endDate.toISOString(),
    viewMode: 'monthly',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
