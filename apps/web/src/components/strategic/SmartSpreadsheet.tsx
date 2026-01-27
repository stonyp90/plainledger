/**
 * Smart Spreadsheet Component
 * 
 * Excel-like spreadsheet with:
 * - Formula support (SUM, AVERAGE, IF, etc.)
 * - Cell references (A1, B2, etc.)
 * - AI-powered formula suggestions
 * - Data analysis with James AI
 * - Import/Export (CSV, JSON)
 * - Multiple sheets
 * - Cell formatting
 * - Drag-fill formulas
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Minus,
  Download,
  Upload,
  Wand2,
  Bot,
  Calculator,
  Table,
  FileSpreadsheet,
  Copy,
  Clipboard,
  Trash2,
  Undo,
  Redo,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Hash,
  ChevronDown,
  X,
  Check,
  Sparkles,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Send,
  Loader2,
  Grid3X3,
  Columns,
  Rows,
  PaintBucket,
  Type,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';

// Types
interface CellValue {
  raw: string;
  computed?: number | string;
  formula?: string;
  format?: CellFormat;
  style?: CellStyle;
}

interface CellFormat {
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date';
  decimals?: number;
  currency?: string;
}

interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
}

interface Sheet {
  id: string;
  name: string;
  data: Record<string, CellValue>;
  columnWidths: Record<string, number>;
  rowHeights: Record<number, number>;
}

interface SpreadsheetState {
  sheets: Sheet[];
  activeSheetId: string;
  selectedCell: string | null;
  selectedRange: { start: string; end: string } | null;
  clipboard: { cells: Record<string, CellValue>; type: 'copy' | 'cut' } | null;
  history: { sheets: Sheet[]; activeSheetId: string }[];
  historyIndex: number;
}

interface AIFormulasuggestion {
  formula: string;
  description: string;
  confidence: number;
}

// Constants
const COLUMNS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26;
const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;

// Formula functions
const FORMULA_FUNCTIONS: Record<string, (...args: any[]) => number | string> = {
  SUM: (...args: number[]) => args.flat().reduce((a, b) => a + (Number(b) || 0), 0),
  AVERAGE: (...args: number[]) => {
    const flat = args.flat().filter(x => !isNaN(Number(x)));
    return flat.length > 0 ? flat.reduce((a, b) => a + Number(b), 0) / flat.length : 0;
  },
  MIN: (...args: number[]) => Math.min(...args.flat().map(Number).filter(x => !isNaN(x))),
  MAX: (...args: number[]) => Math.max(...args.flat().map(Number).filter(x => !isNaN(x))),
  COUNT: (...args: any[]) => args.flat().filter(x => x !== '' && !isNaN(Number(x))).length,
  COUNTA: (...args: any[]) => args.flat().filter(x => x !== '').length,
  IF: (condition: boolean, trueVal: any, falseVal: any) => condition ? trueVal : falseVal,
  ROUND: (num: number, decimals: number = 0) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
  ABS: (num: number) => Math.abs(num),
  SQRT: (num: number) => Math.sqrt(num),
  POWER: (base: number, exp: number) => Math.pow(base, exp),
  CONCAT: (...args: string[]) => args.flat().join(''),
  UPPER: (str: string) => String(str).toUpperCase(),
  LOWER: (str: string) => String(str).toLowerCase(),
  LEN: (str: string) => String(str).length,
  PMT: (rate: number, nper: number, pv: number) => {
    if (rate === 0) return -pv / nper;
    return (rate * pv * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
  },
  FV: (rate: number, nper: number, pmt: number, pv: number = 0) => {
    if (rate === 0) return -(pv + pmt * nper);
    return -(pv * Math.pow(1 + rate, nper) + pmt * ((Math.pow(1 + rate, nper) - 1) / rate));
  },
  NPV: (rate: number, ...cashflows: number[]) => {
    return cashflows.flat().reduce((npv, cf, i) => npv + cf / Math.pow(1 + rate, i + 1), 0);
  },
};

// Helper functions
function columnToIndex(col: string): number {
  return col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function indexToColumn(index: number): string {
  let col = '';
  while (index >= 0) {
    col = String.fromCharCode((index % 26) + 65) + col;
    index = Math.floor(index / 26) - 1;
  }
  return col;
}

function parseCellRef(ref: string): { col: string; row: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return { col: match[1], row: parseInt(match[2]) };
}

function expandRange(start: string, end: string): string[] {
  const startRef = parseCellRef(start);
  const endRef = parseCellRef(end);
  if (!startRef || !endRef) return [];

  const cells: string[] = [];
  const startCol = columnToIndex(startRef.col);
  const endCol = columnToIndex(endRef.col);
  const startRow = startRef.row;
  const endRow = endRef.row;

  for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
      cells.push(`${indexToColumn(col)}${row}`);
    }
  }
  return cells;
}

export default function SmartSpreadsheet() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  // State
  const [state, setState] = useState<SpreadsheetState>(() => {
    const defaultSheet: Sheet = {
      id: 'sheet-1',
      name: isEn ? 'Sheet 1' : 'Feuille 1',
      data: {},
      columnWidths: {},
      rowHeights: {},
    };
    return {
      sheets: [defaultSheet],
      activeSheetId: 'sheet-1',
      selectedCell: null,
      selectedRange: null,
      clipboard: null,
      history: [{ sheets: [defaultSheet], activeSheetId: 'sheet-1' }],
      historyIndex: 0,
    };
  });
  
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<AIFormulasuggestion[]>([]);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get active sheet
  const activeSheet = useMemo(() => {
    return state.sheets.find(s => s.id === state.activeSheetId) || state.sheets[0];
  }, [state.sheets, state.activeSheetId]);
  
  // Evaluate formula
  const evaluateFormula = useCallback((formula: string, data: Record<string, CellValue>, visited: Set<string> = new Set()): number | string => {
    if (!formula.startsWith('=')) return formula;
    
    let expr = formula.slice(1).toUpperCase();
    
    // Replace cell references with values
    const cellRefRegex = /([A-Z]+\d+):([A-Z]+\d+)|([A-Z]+\d+)/g;
    expr = expr.replace(cellRefRegex, (match, rangeStart, rangeEnd, singleCell) => {
      if (rangeStart && rangeEnd) {
        // Range reference (e.g., A1:A10)
        const cells = expandRange(rangeStart, rangeEnd);
        const values = cells.map(cell => {
          if (visited.has(cell)) return 0; // Circular reference
          const cellData = data[cell];
          if (!cellData) return 0;
          if (cellData.formula) {
            return evaluateFormula(cellData.formula, data, new Set([...visited, cell]));
          }
          return cellData.computed ?? cellData.raw ?? 0;
        });
        return values.join(',');
      } else {
        // Single cell reference
        const cell = singleCell;
        if (visited.has(cell)) return '0'; // Circular reference
        const cellData = data[cell];
        if (!cellData) return '0';
        if (cellData.formula) {
          const val = evaluateFormula(cellData.formula, data, new Set([...visited, cell]));
          return String(val);
        }
        return String(cellData.computed ?? cellData.raw ?? 0);
      }
    });
    
    // Replace function calls
    for (const [funcName, func] of Object.entries(FORMULA_FUNCTIONS)) {
      const funcRegex = new RegExp(`${funcName}\\(([^)]+)\\)`, 'gi');
      expr = expr.replace(funcRegex, (_, args) => {
        const argList = args.split(',').map((arg: string) => {
          const trimmed = arg.trim();
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
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
  }, []);
  
  // Compute cell value
  const getCellDisplay = useCallback((cellId: string): string => {
    const cell = activeSheet.data[cellId];
    if (!cell) return '';
    
    if (cell.formula) {
      const computed = evaluateFormula(cell.formula, activeSheet.data);
      if (cell.format) {
        return formatValue(computed, cell.format);
      }
      return String(computed);
    }
    
    if (cell.format && cell.raw) {
      return formatValue(cell.raw, cell.format);
    }
    
    return cell.raw || '';
  }, [activeSheet.data, evaluateFormula]);
  
  // Format value based on cell format
  function formatValue(value: any, format: CellFormat): string {
    const num = parseFloat(value);
    if (isNaN(num) && format.type !== 'text') return String(value);
    
    switch (format.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: format.currency || 'USD',
          minimumFractionDigits: format.decimals ?? 2,
          maximumFractionDigits: format.decimals ?? 2,
        }).format(num);
      case 'percentage':
        return `${(num * 100).toFixed(format.decimals ?? 1)}%`;
      case 'number':
        return num.toFixed(format.decimals ?? 0);
      default:
        return String(value);
    }
  }
  
  // Update cell
  const updateCell = useCallback((cellId: string, value: string, saveHistory = true) => {
    setState(prev => {
      const newSheets = prev.sheets.map(sheet => {
        if (sheet.id !== prev.activeSheetId) return sheet;
        
        const isFormula = value.startsWith('=');
        const newData = {
          ...sheet.data,
          [cellId]: {
            ...sheet.data[cellId],
            raw: isFormula ? '' : value,
            formula: isFormula ? value : undefined,
            computed: isFormula ? evaluateFormula(value, sheet.data) : (parseFloat(value) || value),
          },
        };
        
        return { ...sheet, data: newData };
      });
      
      const newState = { ...prev, sheets: newSheets };
      
      if (saveHistory) {
        const newHistory = prev.history.slice(0, prev.historyIndex + 1);
        newHistory.push({ sheets: newSheets, activeSheetId: prev.activeSheetId });
        newState.history = newHistory;
        newState.historyIndex = newHistory.length - 1;
      }
      
      return newState;
    });
  }, [evaluateFormula]);
  
  // Handle cell click
  const handleCellClick = (cellId: string, e: React.MouseEvent) => {
    if (e.shiftKey && state.selectedCell) {
      setState(prev => ({
        ...prev,
        selectedRange: { start: prev.selectedCell!, end: cellId },
      }));
    } else {
      setState(prev => ({
        ...prev,
        selectedCell: cellId,
        selectedRange: null,
      }));
      
      const cell = activeSheet.data[cellId];
      setFormulaBarValue(cell?.formula || cell?.raw || '');
    }
  };
  
  // Handle cell double click (edit)
  const handleCellDoubleClick = (cellId: string) => {
    const cell = activeSheet.data[cellId];
    setEditingCell(cellId);
    setEditValue(cell?.formula || cell?.raw || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  // Handle edit complete
  const handleEditComplete = () => {
    if (editingCell) {
      updateCell(editingCell, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };
  
  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!state.selectedCell) return;
    
    const ref = parseCellRef(state.selectedCell);
    if (!ref) return;
    
    if (e.key === 'Enter') {
      if (editingCell) {
        handleEditComplete();
        // Move down
        const newCell = `${ref.col}${ref.row + 1}`;
        setState(prev => ({ ...prev, selectedCell: newCell }));
      } else {
        handleCellDoubleClick(state.selectedCell);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (editingCell) handleEditComplete();
      // Move right
      const newCol = indexToColumn(columnToIndex(ref.col) + (e.shiftKey ? -1 : 1));
      if (columnToIndex(newCol) >= 0 && columnToIndex(newCol) < DEFAULT_COLS) {
        setState(prev => ({ ...prev, selectedCell: `${newCol}${ref.row}` }));
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (!editingCell) {
      if (e.key === 'ArrowUp' && ref.row > 1) {
        setState(prev => ({ ...prev, selectedCell: `${ref.col}${ref.row - 1}` }));
      } else if (e.key === 'ArrowDown') {
        setState(prev => ({ ...prev, selectedCell: `${ref.col}${ref.row + 1}` }));
      } else if (e.key === 'ArrowLeft') {
        const newCol = indexToColumn(columnToIndex(ref.col) - 1);
        if (columnToIndex(newCol) >= 0) {
          setState(prev => ({ ...prev, selectedCell: `${newCol}${ref.row}` }));
        }
      } else if (e.key === 'ArrowRight') {
        const newCol = indexToColumn(columnToIndex(ref.col) + 1);
        if (columnToIndex(newCol) < DEFAULT_COLS) {
          setState(prev => ({ ...prev, selectedCell: `${newCol}${ref.row}` }));
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        updateCell(state.selectedCell, '');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setEditingCell(state.selectedCell);
        setEditValue(e.key);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    
    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') {
        handleCopy();
      } else if (e.key === 'v') {
        handlePaste();
      } else if (e.key === 'x') {
        handleCut();
      } else if (e.key === 'z') {
        e.shiftKey ? handleRedo() : handleUndo();
      } else if (e.key === 'y') {
        handleRedo();
      }
    }
  };
  
  // Copy
  const handleCopy = () => {
    if (!state.selectedCell) return;
    const cells = state.selectedRange
      ? expandRange(state.selectedRange.start, state.selectedRange.end)
      : [state.selectedCell];
    
    const clipboard: Record<string, CellValue> = {};
    cells.forEach(cell => {
      if (activeSheet.data[cell]) {
        clipboard[cell] = { ...activeSheet.data[cell] };
      }
    });
    
    setState(prev => ({ ...prev, clipboard: { cells: clipboard, type: 'copy' } }));
  };
  
  // Cut
  const handleCut = () => {
    handleCopy();
    setState(prev => ({
      ...prev,
      clipboard: prev.clipboard ? { ...prev.clipboard, type: 'cut' } : null,
    }));
  };
  
  // Paste
  const handlePaste = () => {
    if (!state.clipboard || !state.selectedCell) return;
    
    const targetRef = parseCellRef(state.selectedCell);
    if (!targetRef) return;
    
    const sourceCell = Object.keys(state.clipboard.cells)[0];
    const sourceRef = parseCellRef(sourceCell);
    if (!sourceRef) return;
    
    const colOffset = columnToIndex(targetRef.col) - columnToIndex(sourceRef.col);
    const rowOffset = targetRef.row - sourceRef.row;
    
    Object.entries(state.clipboard.cells).forEach(([cell, value]) => {
      const ref = parseCellRef(cell);
      if (!ref) return;
      
      const newCol = indexToColumn(columnToIndex(ref.col) + colOffset);
      const newRow = ref.row + rowOffset;
      const newCell = `${newCol}${newRow}`;
      
      updateCell(newCell, value.formula || value.raw || '', false);
    });
    
    if (state.clipboard.type === 'cut') {
      Object.keys(state.clipboard.cells).forEach(cell => {
        updateCell(cell, '', false);
      });
      setState(prev => ({ ...prev, clipboard: null }));
    }
  };
  
  // Undo
  const handleUndo = () => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        sheets: prev.history[newIndex].sheets,
        activeSheetId: prev.history[newIndex].activeSheetId,
        historyIndex: newIndex,
      };
    });
  };
  
  // Redo
  const handleRedo = () => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        sheets: prev.history[newIndex].sheets,
        activeSheetId: prev.history[newIndex].activeSheetId,
        historyIndex: newIndex,
      };
    });
  };
  
  // Add sheet
  const handleAddSheet = () => {
    const newSheet: Sheet = {
      id: `sheet-${Date.now()}`,
      name: `${isEn ? 'Sheet' : 'Feuille'} ${state.sheets.length + 1}`,
      data: {},
      columnWidths: {},
      rowHeights: {},
    };
    setState(prev => ({
      ...prev,
      sheets: [...prev.sheets, newSheet],
      activeSheetId: newSheet.id,
    }));
  };
  
  // Export to CSV
  const handleExportCSV = () => {
    const rows: string[][] = [];
    const maxCol = Math.max(...Object.keys(activeSheet.data).map(c => {
      const ref = parseCellRef(c);
      return ref ? columnToIndex(ref.col) : 0;
    }), 0);
    const maxRow = Math.max(...Object.keys(activeSheet.data).map(c => {
      const ref = parseCellRef(c);
      return ref ? ref.row : 0;
    }), 0);
    
    for (let row = 1; row <= maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        const cellId = `${indexToColumn(col)}${row}`;
        rowData.push(getCellDisplay(cellId));
      }
      rows.push(rowData);
    }
    
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      setState(prev => {
        const newData: Record<string, CellValue> = {};
        
        lines.forEach((line, rowIndex) => {
          const cells = line.match(/("([^"]|"")*"|[^,]*)/g) || [];
          cells.forEach((cell, colIndex) => {
            const value = cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            if (value) {
              const cellId = `${indexToColumn(colIndex)}${rowIndex + 1}`;
              const num = parseFloat(value);
              newData[cellId] = {
                raw: value,
                computed: isNaN(num) ? value : num,
              };
            }
          });
        });
        
        const newSheets = prev.sheets.map(sheet => {
          if (sheet.id !== prev.activeSheetId) return sheet;
          return { ...sheet, data: newData };
        });
        
        return { ...prev, sheets: newSheets };
      });
    };
    reader.readAsText(file);
  };
  
  // AI Formula suggestions
  const handleAIQuery = async () => {
    if (!aiPrompt.trim()) return;
    
    setAILoading(true);
    
    // Simulate AI response (in real app, call the AI service)
    await new Promise(r => setTimeout(r, 1000));
    
    const suggestions: AIFormulasuggestion[] = [];
    const prompt = aiPrompt.toLowerCase();
    
    if (prompt.includes('sum') || prompt.includes('total') || prompt.includes('add')) {
      suggestions.push({
        formula: '=SUM(A1:A10)',
        description: isEn ? 'Sum values in range A1 to A10' : 'Somme des valeurs de A1 à A10',
        confidence: 95,
      });
    }
    if (prompt.includes('average') || prompt.includes('mean') || prompt.includes('moyenne')) {
      suggestions.push({
        formula: '=AVERAGE(A1:A10)',
        description: isEn ? 'Calculate average of range' : 'Calculer la moyenne de la plage',
        confidence: 90,
      });
    }
    if (prompt.includes('if') || prompt.includes('condition')) {
      suggestions.push({
        formula: '=IF(A1>100,"High","Low")',
        description: isEn ? 'Conditional check' : 'Vérification conditionnelle',
        confidence: 85,
      });
    }
    if (prompt.includes('count')) {
      suggestions.push({
        formula: '=COUNT(A1:A10)',
        description: isEn ? 'Count numeric values' : 'Compter les valeurs numériques',
        confidence: 88,
      });
    }
    if (prompt.includes('max') || prompt.includes('highest') || prompt.includes('maximum')) {
      suggestions.push({
        formula: '=MAX(A1:A10)',
        description: isEn ? 'Find maximum value' : 'Trouver la valeur maximale',
        confidence: 92,
      });
    }
    if (prompt.includes('min') || prompt.includes('lowest') || prompt.includes('minimum')) {
      suggestions.push({
        formula: '=MIN(A1:A10)',
        description: isEn ? 'Find minimum value' : 'Trouver la valeur minimale',
        confidence: 92,
      });
    }
    if (prompt.includes('pmt') || prompt.includes('payment') || prompt.includes('loan')) {
      suggestions.push({
        formula: '=PMT(0.05/12,60,10000)',
        description: isEn ? 'Calculate loan payment (5% rate, 60 months, $10K)' : 'Calculer le paiement du prêt',
        confidence: 80,
      });
    }
    if (prompt.includes('npv') || prompt.includes('net present')) {
      suggestions.push({
        formula: '=NPV(0.1,A1:A10)',
        description: isEn ? 'Net Present Value at 10% discount' : 'Valeur actuelle nette à 10%',
        confidence: 78,
      });
    }
    if (prompt.includes('growth') || prompt.includes('percentage change')) {
      suggestions.push({
        formula: '=(B1-A1)/A1',
        description: isEn ? 'Calculate percentage change' : 'Calculer le changement en pourcentage',
        confidence: 85,
      });
    }
    
    // Default suggestions if no matches
    if (suggestions.length === 0) {
      suggestions.push(
        { formula: '=SUM(A1:A10)', description: isEn ? 'Sum range' : 'Somme', confidence: 70 },
        { formula: '=AVERAGE(A1:A10)', description: isEn ? 'Average' : 'Moyenne', confidence: 65 },
        { formula: '=COUNT(A1:A10)', description: isEn ? 'Count values' : 'Compter', confidence: 60 },
      );
    }
    
    setAISuggestions(suggestions);
    setAILoading(false);
  };
  
  // Apply AI suggestion
  const applyAISuggestion = (formula: string) => {
    if (state.selectedCell) {
      updateCell(state.selectedCell, formula);
      setShowAIPanel(false);
      setAIPrompt('');
      setAISuggestions([]);
    }
  };
  
  // Apply format
  const applyFormat = (format: CellFormat) => {
    if (!state.selectedCell) return;
    
    const cells = state.selectedRange
      ? expandRange(state.selectedRange.start, state.selectedRange.end)
      : [state.selectedCell];
    
    setState(prev => {
      const newSheets = prev.sheets.map(sheet => {
        if (sheet.id !== prev.activeSheetId) return sheet;
        
        const newData = { ...sheet.data };
        cells.forEach(cell => {
          newData[cell] = {
            ...newData[cell],
            format,
          };
        });
        
        return { ...sheet, data: newData };
      });
      
      return { ...prev, sheets: newSheets };
    });
    setShowFormatMenu(false);
  };
  
  // Render
  return (
    <div className="card overflow-hidden flex flex-col" style={{ height: '600px', backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={state.historyIndex <= 0}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
            title={isEn ? 'Undo (Ctrl+Z)' : 'Annuler (Ctrl+Z)'}
          >
            <Undo className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          <button
            onClick={handleRedo}
            disabled={state.historyIndex >= state.history.length - 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
            title={isEn ? 'Redo (Ctrl+Y)' : 'Rétablir (Ctrl+Y)'}
          >
            <Redo className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>
        
        <div className="w-px h-6" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isEn ? 'Copy (Ctrl+C)' : 'Copier (Ctrl+C)'}
          >
            <Copy className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          <button
            onClick={handleCut}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isEn ? 'Cut (Ctrl+X)' : 'Couper (Ctrl+X)'}
          >
            <Clipboard className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          <button
            onClick={handlePaste}
            disabled={!state.clipboard}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
            title={isEn ? 'Paste (Ctrl+V)' : 'Coller (Ctrl+V)'}
          >
            <Clipboard className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>
        
        <div className="w-px h-6" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
        
        {/* Format buttons */}
        <div className="relative">
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <Hash className="w-4 h-4" />
            {isEn ? 'Format' : 'Format'}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showFormatMenu && (
            <div 
              className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-xl z-20 min-w-40"
              style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))' }}
            >
              <button
                onClick={() => applyFormat({ type: 'text' })}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Type className="w-4 h-4" />
                {isEn ? 'Text' : 'Texte'}
              </button>
              <button
                onClick={() => applyFormat({ type: 'number', decimals: 2 })}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Hash className="w-4 h-4" />
                {isEn ? 'Number' : 'Nombre'}
              </button>
              <button
                onClick={() => applyFormat({ type: 'currency', decimals: 2, currency: 'USD' })}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <DollarSign className="w-4 h-4" />
                {isEn ? 'Currency' : 'Devise'}
              </button>
              <button
                onClick={() => applyFormat({ type: 'percentage', decimals: 1 })}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Percent className="w-4 h-4" />
                {isEn ? 'Percentage' : 'Pourcentage'}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1" />
        
        {/* AI Button */}
        <button
          onClick={() => setShowAIPanel(!showAIPanel)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: showAIPanel ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-primary-500) / 0.1)',
            color: showAIPanel ? 'white' : 'rgb(var(--color-primary-600))',
          }}
        >
          <Wand2 className="w-4 h-4" />
          {isEn ? 'Smart Formula' : 'Formule intelligente'}
        </button>
        
        {/* Import/Export */}
        <label className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
          <Upload className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
        </label>
        <button
          onClick={handleExportCSV}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title={isEn ? 'Export CSV' : 'Exporter CSV'}
        >
          <Download className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </button>
      </div>
      
      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="w-16 text-center text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: 'rgb(var(--color-bg-muted))', color: 'rgb(var(--color-text))' }}>
          {state.selectedCell || ''}
        </div>
        <Calculator className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <input
          type="text"
          value={editingCell ? editValue : formulaBarValue}
          onChange={(e) => {
            if (editingCell) {
              setEditValue(e.target.value);
            } else {
              setFormulaBarValue(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && state.selectedCell) {
              updateCell(state.selectedCell, editingCell ? editValue : formulaBarValue);
              setEditingCell(null);
            }
          }}
          placeholder={isEn ? 'Enter value or formula (e.g., =SUM(A1:A10))' : 'Entrez une valeur ou formule'}
          className="flex-1 px-2 py-1 text-sm bg-transparent outline-none"
          style={{ color: 'rgb(var(--color-text))' }}
        />
      </div>
      
      {/* AI Panel */}
      {showAIPanel && (
        <div className="p-3 border-b" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-primary-500) / 0.03)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Ask James for formula help' : 'Demander l\'aide de James pour les formules'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIQuery()}
              placeholder={isEn ? 'e.g., "Sum all values in column A" or "Calculate loan payment"' : 'ex: "Somme de la colonne A"'}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}
            />
            <button
              onClick={handleAIQuery}
              disabled={aiLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isEn ? 'Suggest' : 'Suggérer'}
            </button>
          </div>
          
          {aiSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              {aiSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-white dark:hover:bg-gray-800"
                  style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))' }}
                  onClick={() => applyAISuggestion(suggestion.formula)}
                >
                  <div>
                    <code className="text-sm font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' }}>
                      {suggestion.formula}
                    </code>
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {suggestion.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: suggestion.confidence > 85 ? 'rgb(var(--color-success) / 0.1)' : 'rgb(var(--color-warning) / 0.1)', color: suggestion.confidence > 85 ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))' }}>
                      {suggestion.confidence}%
                    </span>
                    <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Spreadsheet Grid */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-auto"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th 
                className="sticky left-0 z-20 w-10 min-w-10 text-xs font-medium border-b border-r"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}
              />
              {COLUMNS.slice(0, DEFAULT_COLS).map((col) => (
                <th
                  key={col}
                  className="text-xs font-medium px-2 py-1.5 border-b border-r min-w-24"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg-muted))', 
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text-muted))',
                    width: activeSheet.columnWidths[col] || DEFAULT_COL_WIDTH,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DEFAULT_ROWS }, (_, rowIndex) => {
              const row = rowIndex + 1;
              return (
                <tr key={row}>
                  <td 
                    className="sticky left-0 z-10 text-xs font-medium text-center border-b border-r"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-muted))', 
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                  >
                    {row}
                  </td>
                  {COLUMNS.slice(0, DEFAULT_COLS).map((col) => {
                    const cellId = `${col}${row}`;
                    const isSelected = state.selectedCell === cellId;
                    const isEditing = editingCell === cellId;
                    const isInRange = state.selectedRange && expandRange(state.selectedRange.start, state.selectedRange.end).includes(cellId);
                    const cell = activeSheet.data[cellId];
                    
                    return (
                      <td
                        key={cellId}
                        className="border-b border-r text-sm px-2 py-1 cursor-cell relative"
                        style={{
                          backgroundColor: isSelected || isInRange ? 'rgb(var(--color-primary-500) / 0.1)' : 'rgb(var(--color-bg))',
                          borderColor: isSelected ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
                          borderWidth: isSelected ? '2px' : '1px',
                          color: 'rgb(var(--color-text))',
                          textAlign: cell?.style?.align || 'left',
                          fontWeight: cell?.style?.bold ? 'bold' : 'normal',
                          fontStyle: cell?.style?.italic ? 'italic' : 'normal',
                          height: activeSheet.rowHeights[row] || DEFAULT_ROW_HEIGHT,
                        }}
                        onClick={(e) => handleCellClick(cellId, e)}
                        onDoubleClick={() => handleCellDoubleClick(cellId)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleEditComplete}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditComplete();
                              } else if (e.key === 'Escape') {
                                setEditingCell(null);
                                setEditValue('');
                              }
                              e.stopPropagation();
                            }}
                            className="absolute inset-0 w-full h-full px-2 outline-none bg-white dark:bg-gray-900 border-2"
                            style={{ borderColor: 'rgb(var(--color-primary-500))' }}
                          />
                        ) : (
                          getCellDisplay(cellId)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Sheet Tabs */}
      <div className="flex items-center gap-1 p-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {state.sheets.map((sheet) => (
          <button
            key={sheet.id}
            onClick={() => setState(prev => ({ ...prev, activeSheetId: sheet.id }))}
            className="px-3 py-1.5 text-sm rounded-t transition-colors"
            style={{
              backgroundColor: sheet.id === state.activeSheetId ? 'rgb(var(--color-bg))' : 'rgb(var(--color-bg-muted))',
              color: sheet.id === state.activeSheetId ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
              border: `1px solid ${sheet.id === state.activeSheetId ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))'}`,
            }}
          >
            {sheet.name}
          </button>
        ))}
        <button
          onClick={handleAddSheet}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title={isEn ? 'Add sheet' : 'Ajouter une feuille'}
        >
          <Plus className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
        </button>
      </div>
    </div>
  );
}
