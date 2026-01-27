/**
 * Driver Row Component - Runway-style Design
 * 
 * Compact, data-dense row with:
 * - Inline formula display with driver tags
 * - Clean editing states
 * - Professional styling
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import {
  type Driver,
  type ViewMode,
  getDriverValue,
  formatDriverValue,
} from '../../lib/financialModel';
import {
  parseFormulaForDisplay,
  getFormulaPartColor,
  getFormulaPartBg,
  type FormulaPart,
} from '../../lib/formulaParser';
import { useI18n } from '../../lib/i18n';

// Runway-inspired color palette
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    code: '#F8F9FA',
    hover: '#FAFBFC',
  },
  border: {
    default: '#E5E7EB',
    focus: '#3B82F6',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
  },
  accent: {
    primary: '#3B82F6',
    error: '#DC2626',
  },
  tag: {
    bg: '#DBEAFE',
    text: '#1E40AF',
  },
};

// Ensure consistent vertical alignment
const CELL_STYLE = {
  verticalAlign: 'middle',
  lineHeight: '32px',
};

interface DriverRowProps {
  driver: Driver;
  periods: string[];
  viewMode: ViewMode;
  allDrivers: Record<string, Driver>;
  onUpdate: (driver: Driver) => void;
  onDelete?: (driverId: string) => void;
  getAccountValue?: (accountId: string, periodKey: string) => number | null;
  currency?: string;
}

export default function DriverRow({
  driver,
  periods,
  viewMode,
  allDrivers,
  onUpdate,
  onDelete,
  getAccountValue,
  currency = 'USD',
}: DriverRowProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [formulaInput, setFormulaInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(driver.name);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [periodInput, setPeriodInput] = useState('');
  
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const periodInputRef = useRef<HTMLInputElement>(null);
  
  // Focus inputs when editing starts
  useEffect(() => {
    if (isEditingFormula && formulaInputRef.current) {
      formulaInputRef.current.focus();
      formulaInputRef.current.select();
    }
  }, [isEditingFormula]);
  
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);
  
  useEffect(() => {
    if (editingPeriod && periodInputRef.current) {
      periodInputRef.current.focus();
      periodInputRef.current.select();
    }
  }, [editingPeriod]);
  
  // Calculate values for each period
  const values = useMemo(() => {
    return periods.map(periodKey => {
      const value = getDriverValue(driver, periodKey, allDrivers, getAccountValue);
      return {
        periodKey,
        value,
        formatted: formatDriverValue(value, driver.format, driver.decimals, currency),
      };
    });
  }, [driver, periods, allDrivers, getAccountValue, currency]);
  
  // Parse formula for display
  const formulaParts = useMemo(() => {
    if (!driver.formula) return [];
    return parseFormulaForDisplay(driver.formula, allDrivers);
  }, [driver.formula, allDrivers]);
  
  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== driver.name) {
      onUpdate({ ...driver, name: trimmed });
    }
    setIsEditingName(false);
  };
  
  const handleFormulaSave = () => {
    const trimmed = formulaInput.trim();
    const formula = trimmed ? (trimmed.startsWith('=') ? trimmed : `=${trimmed}`) : undefined;
    onUpdate({
      ...driver,
      formula,
      dataSource: formula ? 'formula' : driver.dataSource,
    });
    setIsEditingFormula(false);
  };
  
  const handlePeriodSave = (periodKey: string) => {
    const numValue = parseFloat(periodInput);
    if (!isNaN(numValue)) {
      onUpdate({
        ...driver,
        values: { ...driver.values, [periodKey]: numValue },
        dataSource: 'manual',
      });
    }
    setEditingPeriod(null);
  };
  
  const startEditingFormula = () => {
    const currentFormula = driver.formula || '';
    setFormulaInput(currentFormula.startsWith('=') ? currentFormula.slice(1) : currentFormula);
    setIsEditingFormula(true);
  };
  
  const startEditingPeriod = (periodKey: string, currentValue: number | string | null) => {
    if (driver.formula) return; // Can't edit formula-driven values
    setPeriodInput(typeof currentValue === 'number' ? String(currentValue) : '');
    setEditingPeriod(periodKey);
  };
  
  const isNegative = (val: number | string | null): boolean => {
    if (typeof val === 'number') return val < 0;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return !isNaN(num) && num < 0;
    }
    return false;
  };
  
  // Render formula with syntax highlighting
  const renderFormula = () => {
    if (formulaParts.length === 0) {
      return (
        <span 
          className="text-xs cursor-pointer hover:text-gray-500 transition-colors"
          style={{ color: colors.text.muted, whiteSpace: 'nowrap' }}
        >
          {isEn ? 'Add formula' : 'Formule'}
        </span>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-0.5"
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '32px' }}
      >
        <span style={{ color: colors.text.muted, fontFamily: 'monospace', fontSize: '11px' }}>=</span>
        {formulaParts.map((part, i) => (
          <FormulaPartDisplay key={i} part={part} />
        ))}
      </div>
    );
  };
  
  return (
    <tr
      className="group transition-colors"
      style={{
        height: '32px',
        maxHeight: '32px',
        borderBottom: `1px solid ${colors.border.default}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg.base;
      }}
    >
      {/* Driver Name Cell */}
      <td
        className="relative"
        style={{
          padding: '0 10px',
          borderRight: `1px solid ${colors.border.default}`,
          width: '200px',
          minWidth: '200px',
          maxWidth: '200px',
          ...CELL_STYLE,
        }}
      >
        {isEditingName ? (
          <div className="flex items-center gap-1">
            <input
              ref={nameInputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') {
                  setIsEditingName(false);
                  setNameInput(driver.name);
                }
              }}
              onBlur={handleNameSave}
              className="w-full px-1.5 py-0.5 text-xs rounded outline-none"
              style={{
                border: `1px solid ${colors.border.focus}`,
                boxShadow: `0 0 0 2px ${colors.border.focus}20`,
              }}
            />
          </div>
        ) : (
          <span
            className="text-xs font-medium cursor-pointer hover:text-blue-600 transition-colors truncate block"
            style={{ color: colors.text.primary, lineHeight: '32px' }}
            onClick={() => {
              setNameInput(driver.name);
              setIsEditingName(true);
            }}
          >
            {driver.name}
          </span>
        )}
      </td>
      
      {/* Formula Cell */}
      <td
        className="relative"
        style={{
          padding: '0 10px',
          borderRight: `1px solid ${colors.border.default}`,
          backgroundColor: driver.formula ? colors.bg.code : 'transparent',
          minWidth: '280px',
          maxWidth: '350px',
          overflow: 'hidden',
          ...CELL_STYLE,
        }}
      >
        {isEditingFormula ? (
          <div className="flex items-center gap-1">
            <span style={{ color: colors.text.muted, fontFamily: 'monospace', fontSize: '13px' }}>=</span>
            <input
              ref={formulaInputRef}
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFormulaSave();
                if (e.key === 'Escape') {
                  setIsEditingFormula(false);
                }
              }}
              onBlur={handleFormulaSave}
              placeholder={isEn ? 'Cash Balance / Burn' : 'Solde / Dépenses'}
              className="flex-1 px-1.5 py-0.5 text-xs rounded outline-none"
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                border: `1px solid ${colors.border.focus}`,
                boxShadow: `0 0 0 2px ${colors.border.focus}20`,
                minWidth: '200px',
              }}
            />
            <button
              onClick={handleFormulaSave}
              className="p-0.5 rounded hover:bg-gray-200"
            >
              <Check className="w-3 h-3" style={{ color: colors.accent.primary }} />
            </button>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={startEditingFormula}
            style={{ lineHeight: '32px' }}
          >
            {renderFormula()}
          </div>
        )}
      </td>
      
      {/* Period Value Cells */}
      {values.map(({ periodKey, value, formatted }) => (
        <td
          key={periodKey}
          className="relative text-right"
          style={{
            padding: '0 10px',
            borderRight: `1px solid ${colors.border.default}`,
            width: '110px',
            minWidth: '110px',
            color: isNegative(value) ? colors.accent.error : colors.text.primary,
            ...CELL_STYLE,
          }}
        >
          {editingPeriod === periodKey ? (
            <input
              ref={periodInputRef}
              type="text"
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePeriodSave(periodKey);
                if (e.key === 'Escape') setEditingPeriod(null);
              }}
              onBlur={() => handlePeriodSave(periodKey)}
              className="w-full px-1.5 py-0.5 text-xs text-right rounded outline-none"
              style={{
                border: `1px solid ${colors.border.focus}`,
                boxShadow: `0 0 0 2px ${colors.border.focus}20`,
              }}
            />
          ) : (
            <span
              className={`text-xs ${!driver.formula ? 'cursor-pointer hover:bg-gray-100 px-1 -mx-1 rounded transition-colors' : ''}`}
              style={{
                fontVariantNumeric: 'tabular-nums',
                lineHeight: '32px',
                display: 'inline-block',
              }}
              onClick={() => startEditingPeriod(periodKey, value)}
            >
              {formatted || (driver.formula ? '' : '-')}
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}

// Formula Part Display Component
function FormulaPartDisplay({ part }: { part: FormulaPart }) {
  const color = getFormulaPartColor(part.type);
  const bg = getFormulaPartBg(part.type);
  
  if (part.type === 'driver') {
    return (
      <span
        className="inline-flex items-center rounded font-medium"
        style={{
          backgroundColor: bg,
          color: color,
          padding: '1px 5px',
          margin: '0 1px',
          fontSize: '11px',
          lineHeight: '16px',
        }}
      >
        {part.value}
      </span>
    );
  }
  
  return (
    <span
      style={{
        color: color,
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '16px',
      }}
    >
      {part.value}
    </span>
  );
}
