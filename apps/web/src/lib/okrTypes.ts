/**
 * OKR (Objectives and Key Results) Types
 * 
 * Data model for linking strategic initiatives to quarterly OKRs
 */

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface KeyResult {
  id: string;
  description: string;
  descriptionEn: string;
  targetValue: number;
  currentValue: number;
  unit: string; // e.g., 'currency', 'percentage', 'number', 'days'
  dueDate: string; // ISO date string
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  confidence?: number; // 0-100% confidence in achieving this KR
}

export interface OKR {
  id: string;
  objective: string;
  objectiveEn: string;
  quarter: Quarter;
  year: number;
  keyResults: KeyResult[];
  linkedInitiatives: string[]; // Initiative IDs from strategicPlanning.ts
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  owner?: string;
  description?: string;
  descriptionEn?: string;
}

export interface OKRSet {
  id: string;
  name: string;
  nameEn: string;
  year: number;
  quarters: {
    Q1?: OKR;
    Q2?: OKR;
    Q3?: OKR;
    Q4?: OKR;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate unique ID for OKR entities
 */
export function generateOKRId(prefix: string = 'okr'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get quarter from date
 */
export function getQuarterFromDate(date: Date): Quarter {
  const month = date.getMonth(); // 0-11
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

/**
 * Get quarter dates (start and end)
 */
export function getQuarterDates(quarter: Quarter, year: number): { start: Date; end: Date } {
  const quarterMonths = {
    Q1: { start: 0, end: 2 },   // Jan-Mar
    Q2: { start: 3, end: 5 },   // Apr-Jun
    Q3: { start: 6, end: 8 },   // Jul-Sep
    Q4: { start: 9, end: 11 },  // Oct-Dec
  };
  
  const { start: startMonth, end: endMonth } = quarterMonths[quarter];
  
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0), // Last day of the month
  };
}

/**
 * Get current quarter
 */
export function getCurrentQuarter(): { quarter: Quarter; year: number } {
  const now = new Date();
  return {
    quarter: getQuarterFromDate(now),
    year: now.getFullYear(),
  };
}

/**
 * Get next quarter
 */
export function getNextQuarter(quarter: Quarter, year: number): { quarter: Quarter; year: number } {
  if (quarter === 'Q1') return { quarter: 'Q2', year };
  if (quarter === 'Q2') return { quarter: 'Q3', year };
  if (quarter === 'Q3') return { quarter: 'Q4', year };
  return { quarter: 'Q1', year: year + 1 };
}

/**
 * Calculate OKR progress percentage
 */
export function calculateOKRProgress(okr: OKR): number {
  if (okr.keyResults.length === 0) return 0;
  
  const totalProgress = okr.keyResults.reduce((sum, kr) => {
    if (kr.targetValue === 0) return sum;
    const progress = Math.min(100, (kr.currentValue / kr.targetValue) * 100);
    return sum + progress;
  }, 0);
  
  return totalProgress / okr.keyResults.length;
}

/**
 * Check if OKR is on track
 */
export function isOKROnTrack(okr: OKR): boolean {
  const progress = calculateOKRProgress(okr);
  const now = new Date();
  const { start, end } = getQuarterDates(okr.quarter, okr.year);
  const quarterProgress = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  
  // OKR should be at least 80% of quarter progress
  return progress >= quarterProgress * 0.8;
}
