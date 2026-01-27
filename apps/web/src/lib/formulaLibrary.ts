/**
 * Formula Library
 * 
 * Manages saved formulas that can be reused across the organization
 */

export interface SavedFormula {
  id: string;
  name: string;
  description?: string;
  formula: string;
  category?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  isPublic?: boolean; // Organization-wide vs personal
}

export const FORMULA_CATEGORIES = {
  financial: 'Financial Metrics',
  operations: 'Operations',
  growth: 'Growth & Scaling',
  hiring: 'Hiring & HR',
  revenue: 'Revenue',
  expenses: 'Expenses',
  cashflow: 'Cash Flow',
  ratios: 'Ratios & Percentages',
  custom: 'Custom',
};

const STORAGE_KEY = 'plainledger-formula-library-v1';

export class FormulaLibrary {
  private formulas: Map<string, SavedFormula> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((formula: SavedFormula) => {
          this.formulas.set(formula.id, formula);
        });
      }
    } catch (e) {
      console.error('Failed to load formula library:', e);
    }
  }

  private saveToStorage() {
    try {
      const data = Array.from(this.formulas.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save formula library:', e);
    }
  }

  saveFormula(formula: Omit<SavedFormula, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): SavedFormula {
    const id = `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const savedFormula: SavedFormula = {
      ...formula,
      id,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };
    
    this.formulas.set(id, savedFormula);
    this.saveToStorage();
    return savedFormula;
  }

  updateFormula(id: string, updates: Partial<SavedFormula>): SavedFormula | null {
    const formula = this.formulas.get(id);
    if (!formula) return null;
    
    const updated = {
      ...formula,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.formulas.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  deleteFormula(id: string): boolean {
    const deleted = this.formulas.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  getFormula(id: string): SavedFormula | null {
    return this.formulas.get(id) || null;
  }

  getAllFormulas(): SavedFormula[] {
    return Array.from(this.formulas.values()).sort((a, b) => 
      (b.usageCount || 0) - (a.usageCount || 0) || 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getFormulasByCategory(category: string): SavedFormula[] {
    return this.getAllFormulas().filter(f => f.category === category);
  }

  searchFormulas(query: string): SavedFormula[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllFormulas().filter(f =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.description?.toLowerCase().includes(lowerQuery) ||
      f.formula.toLowerCase().includes(lowerQuery) ||
      f.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  incrementUsage(id: string) {
    const formula = this.formulas.get(id);
    if (formula) {
      formula.usageCount = (formula.usageCount || 0) + 1;
      this.saveToStorage();
    }
  }

  // Get common formulas for quick access
  getCommonFormulas(): SavedFormula[] {
    return this.getAllFormulas()
      .filter(f => (f.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10);
  }
}

export const formulaLibrary = new FormulaLibrary();

// Initialize with some default formulas
if (formulaLibrary.getAllFormulas().length === 0) {
  const defaultFormulas: Omit<SavedFormula, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
    {
      name: 'Runway (Months)',
      description: 'Calculate months of runway: Cash Balance / Monthly Burn',
      formula: 'ROUND(Cash Balance / Burn)',
      category: 'cashflow',
      tags: ['runway', 'burn', 'cash'],
      createdBy: 'system',
      isPublic: true,
    },
    {
      name: 'Burn Rate',
      description: 'Monthly cash burn rate',
      formula: 'Operating Activities',
      category: 'cashflow',
      tags: ['burn', 'expenses'],
      createdBy: 'system',
      isPublic: true,
    },
    {
      name: 'Gross Margin %',
      description: 'Gross margin as percentage: (Revenue - COGS) / Revenue',
      formula: 'ROUND((Revenue - COGS) / Revenue * 100)',
      category: 'ratios',
      tags: ['margin', 'profitability'],
      createdBy: 'system',
      isPublic: true,
    },
    {
      name: 'Headcount Growth Rate',
      description: 'Monthly headcount growth rate',
      formula: '(Current Headcount - Previous Headcount) / Previous Headcount * 100',
      category: 'hiring',
      tags: ['growth', 'hiring'],
      createdBy: 'system',
      isPublic: true,
    },
    {
      name: 'Revenue per Employee',
      description: 'Revenue efficiency metric',
      formula: 'Revenue / Headcount',
      category: 'ratios',
      tags: ['efficiency', 'productivity'],
      createdBy: 'system',
      isPublic: true,
    },
  ];

  defaultFormulas.forEach(formula => {
    formulaLibrary.saveFormula(formula);
  });
}
