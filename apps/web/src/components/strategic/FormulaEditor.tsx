/**
 * Linear/Notion-inspired Formula Editor
 * 
 * Features:
 * - Inline editing with keyboard-first UX
 * - Command palette triggered by `/` or `=`
 * - Autocomplete with driver suggestions
 * - Chip-based formula visualization
 * - Full keyboard navigation
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Hash, 
  Calculator, 
  TrendingUp, 
  Percent, 
  ArrowRight,
  CornerDownLeft,
  Search,
} from 'lucide-react';
import { type Driver } from '../../lib/financialModel';
import { ICON_MAP, type IconType } from './IconPicker';

// Quick formulas for command palette
const QUICK_FORMULAS = [
  { id: 'sum', label: 'Sum', formula: 'SUM()', icon: Plus, description: 'Add values together' },
  { id: 'avg', label: 'Average', formula: 'AVERAGE()', icon: TrendingUp, description: 'Calculate mean value' },
  { id: 'growth', label: 'Growth Rate', formula: 'GROWTH()', icon: Percent, description: 'Period-over-period change' },
  { id: 'round', label: 'Round', formula: 'ROUND()', icon: Hash, description: 'Round to decimals' },
  { id: 'if', label: 'If Condition', formula: 'IF()', icon: ArrowRight, description: 'Conditional logic' },
  { id: 'min', label: 'Minimum', formula: 'MIN()', icon: TrendingUp, description: 'Find lowest value' },
  { id: 'max', label: 'Maximum', formula: 'MAX()', icon: TrendingUp, description: 'Find highest value' },
];

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  allDrivers: Record<string, Driver>;
  currentDriver?: Driver;
  isEn: boolean;
  autoFocus?: boolean;
}

interface FormulaPart {
  type: 'text' | 'driver' | 'function' | 'operator' | 'number';
  value: string;
  driverId?: string;
  driverName?: string;
  driverIcon?: IconType;
}

export default function FormulaEditor({
  value,
  onChange,
  onSave,
  onCancel,
  allDrivers,
  currentDriver,
  isEn,
  autoFocus = true,
}: FormulaEditorProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(value.length);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse formula into visual parts
  const formulaParts = useMemo((): FormulaPart[] => {
    if (!value) return [];
    
    const parts: FormulaPart[] = [];
    let remaining = value;
    
    // Match driver names (case-insensitive)
    const driverNames = Object.values(allDrivers).map(d => d.name);
    
    while (remaining.length > 0) {
      let matched = false;
      
      // Check for driver references
      for (const driver of Object.values(allDrivers)) {
        if (remaining.toLowerCase().startsWith(driver.name.toLowerCase())) {
          parts.push({
            type: 'driver',
            value: driver.name,
            driverId: driver.id,
            driverName: driver.name,
            driverIcon: driver.icon as IconType,
          });
          remaining = remaining.slice(driver.name.length);
          matched = true;
          break;
        }
      }
      
      if (matched) continue;
      
      // Check for functions
      const funcMatch = remaining.match(/^([A-Z]+)\(/i);
      if (funcMatch) {
        parts.push({ type: 'function', value: funcMatch[1] });
        remaining = remaining.slice(funcMatch[1].length);
        continue;
      }
      
      // Check for numbers
      const numMatch = remaining.match(/^[\d,.]+/);
      if (numMatch) {
        parts.push({ type: 'number', value: numMatch[0] });
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
      
      // Check for operators
      const opMatch = remaining.match(/^[+\-*/()=<>!,\s]+/);
      if (opMatch) {
        parts.push({ type: 'operator', value: opMatch[0] });
        remaining = remaining.slice(opMatch[0].length);
        continue;
      }
      
      // Default: single character as text
      parts.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
    
    return parts;
  }, [value, allDrivers]);

  // Get filtered drivers for suggestions
  const filteredDrivers = useMemo(() => {
    const search = driverSearch.toLowerCase();
    return Object.values(allDrivers)
      .filter(d => 
        d.id !== currentDriver?.id && 
        (d.name.toLowerCase().includes(search) || 
         d.prefix?.toLowerCase().includes(search))
      )
      .slice(0, 6);
  }, [allDrivers, driverSearch, currentDriver]);

  // Get filtered formulas for command palette
  const filteredFormulas = useMemo(() => {
    const search = commandSearch.toLowerCase();
    return QUICK_FORMULAS.filter(f =>
      f.label.toLowerCase().includes(search) ||
      f.description.toLowerCase().includes(search)
    );
  }, [commandSearch]);

  // Focus input on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(value.length, value.length);
    }
  }, [autoFocus]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Command palette navigation
    if (showCommandPalette) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredFormulas.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredFormulas[selectedIndex];
        if (selected) {
          insertFormula(selected.formula);
        }
        setShowCommandPalette(false);
        setCommandSearch('');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandPalette(false);
        setCommandSearch('');
      }
      return;
    }

    // Driver suggestions navigation
    if (showDriverSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredDrivers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredDrivers[selectedIndex];
        if (selected) {
          insertDriver(selected.name);
        }
        setShowDriverSuggestions(false);
        setDriverSearch('');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDriverSuggestions(false);
        setDriverSearch('');
      }
      return;
    }

    // Main input shortcuts
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === '/' && value === '') {
      e.preventDefault();
      setShowCommandPalette(true);
      setSelectedIndex(0);
    } else if (e.key === '@') {
      e.preventDefault();
      setShowDriverSuggestions(true);
      setSelectedIndex(0);
      setDriverSearch('');
    }
  }, [showCommandPalette, showDriverSuggestions, filteredFormulas, filteredDrivers, selectedIndex, value, onSave, onCancel]);

  // Insert formula at cursor
  const insertFormula = (formula: string) => {
    const newValue = value + formula;
    onChange(newValue);
    // Position cursor inside parentheses
    setTimeout(() => {
      if (inputRef.current) {
        const pos = newValue.length - 1;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Insert driver reference
  const insertDriver = (driverName: string) => {
    const beforeCursor = value.slice(0, cursorPosition);
    // Remove the @ symbol and any partial search
    const cleanedBefore = beforeCursor.replace(/@\w*$/, '');
    const afterCursor = value.slice(cursorPosition);
    const newValue = cleanedBefore + driverName + afterCursor;
    onChange(newValue);
    setTimeout(() => {
      if (inputRef.current) {
        const newPos = cleanedBefore.length + driverName.length;
        inputRef.current.setSelectionRange(newPos, newPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  // Remove a driver chip
  const removeDriverChip = (driverName: string) => {
    const newValue = value.replace(new RegExp(driverName, 'gi'), '').replace(/\s+/g, ' ').trim();
    onChange(newValue);
    inputRef.current?.focus();
  };

  // Handle input change with @ detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);
    setCursorPosition(cursorPos);
    
    // Check for @ trigger
    const beforeCursor = newValue.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowDriverSuggestions(true);
      setDriverSearch(atMatch[1]);
      setSelectedIndex(0);
    } else {
      setShowDriverSuggestions(false);
    }
    
    // Check for / trigger at start
    if (newValue === '/') {
      setShowCommandPalette(true);
      onChange('');
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
    >
      {/* Main Editor */}
      <div 
        className="flex flex-col rounded-lg border-2 overflow-hidden transition-shadow"
        style={{
          borderColor: '#3B82F6',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 20px -4px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)',
        }}
      >
        {/* Formula chips display */}
        {formulaParts.length > 0 && (
          <div 
            className="flex flex-wrap items-center gap-1 px-3 py-2 border-b"
            style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
          >
            <span className="text-gray-400 font-mono text-sm">=</span>
            {formulaParts.map((part, i) => {
              if (part.type === 'driver') {
                const IconComponent = part.driverIcon && ICON_MAP[part.driverIcon];
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium group cursor-default"
                    style={{
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                    }}
                  >
                    {IconComponent && <IconComponent size={12} />}
                    {part.driverName}
                    <button
                      onClick={() => removeDriverChip(part.value)}
                      className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-blue-200 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              }
              if (part.type === 'function') {
                return (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded text-sm font-mono font-semibold"
                    style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.type === 'number') {
                return (
                  <span key={i} className="text-sm font-mono text-emerald-600">
                    {part.value}
                  </span>
                );
              }
              return (
                <span key={i} className="text-sm font-mono text-gray-500">
                  {part.value}
                </span>
              );
            })}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-gray-400 font-mono text-sm">=</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => setCursorPosition((e.target as HTMLInputElement).selectionStart || 0)}
            placeholder={isEn ? 'Type formula, @ for drivers, / for functions...' : 'Formule, @ pour pilotes, / pour fonctions...'}
            className="flex-1 outline-none text-sm font-mono"
            style={{ color: '#111827' }}
            autoComplete="off"
            spellCheck={false}
          />
          
          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCommandPalette(!showCommandPalette)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title={isEn ? 'Insert function (/)' : 'Insérer fonction (/)'}
            >
              <Calculator size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => setShowDriverSuggestions(!showDriverSuggestions)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title={isEn ? 'Insert driver (@)' : 'Insérer pilote (@)'}
            >
              <Hash size={16} className="text-gray-400" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              onClick={onCancel}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title={isEn ? 'Cancel (Esc)' : 'Annuler (Esc)'}
            >
              <X size={16} className="text-gray-400" />
            </button>
            <button
              onClick={onSave}
              className="p-1.5 rounded bg-blue-500 hover:bg-blue-600 transition-colors"
              title={isEn ? 'Save (Enter)' : 'Enregistrer (Entrée)'}
            >
              <CornerDownLeft size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div 
          className="flex items-center gap-4 px-3 py-1.5 text-xs border-t"
          style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', color: '#6B7280' }}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">@</kbd>
            {isEn ? 'drivers' : 'pilotes'}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">/</kbd>
            {isEn ? 'functions' : 'fonctions'}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">↑↓</kbd>
            {isEn ? 'navigate' : 'naviguer'}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">Enter</kbd>
            {isEn ? 'save' : 'sauver'}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">Esc</kbd>
            {isEn ? 'cancel' : 'annuler'}
          </span>
        </div>
      </div>

      {/* Command Palette (Functions) */}
      {showCommandPalette && (
        <div 
          className="absolute left-0 right-0 top-full mt-2 rounded-lg border shadow-xl overflow-hidden z-50"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5E7EB',
            maxHeight: '320px',
          }}
        >
          <div className="sticky top-0 p-2 border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border" style={{ borderColor: '#E5E7EB' }}>
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                value={commandSearch}
                onChange={(e) => {
                  setCommandSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder={isEn ? 'Search functions...' : 'Rechercher fonctions...'}
                className="flex-1 text-sm outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-64">
            {filteredFormulas.map((formula, i) => {
              const Icon = formula.icon;
              return (
                <button
                  key={formula.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    insertFormula(formula.formula);
                    setShowCommandPalette(false);
                    setCommandSearch('');
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: i === selectedIndex ? '#DBEAFE' : '#F3F4F6' }}
                  >
                    <Icon size={16} className={i === selectedIndex ? 'text-blue-600' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{formula.label}</span>
                      <code className="text-xs text-gray-500 font-mono">{formula.formula}</code>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{formula.description}</p>
                  </div>
                  {i === selectedIndex && (
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">↵</kbd>
                  )}
                </button>
              );
            })}
            {filteredFormulas.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {isEn ? 'No functions found' : 'Aucune fonction trouvée'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Suggestions */}
      {showDriverSuggestions && (
        <div 
          className="absolute left-0 right-0 top-full mt-2 rounded-lg border shadow-xl overflow-hidden z-50"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5E7EB',
            maxHeight: '280px',
          }}
        >
          <div className="sticky top-0 px-3 py-2 border-b bg-gray-50 text-xs font-medium text-gray-500" style={{ borderColor: '#E5E7EB' }}>
            {isEn ? 'Reference a driver' : 'Référencer un pilote'}
          </div>
          <div className="overflow-y-auto max-h-52">
            {filteredDrivers.map((driver, i) => {
              const IconComponent = driver.icon && ICON_MAP[driver.icon as IconType];
              return (
                <button
                  key={driver.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    insertDriver(driver.name);
                    setShowDriverSuggestions(false);
                    setDriverSearch('');
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: i === selectedIndex ? '#DBEAFE' : '#F3F4F6' }}
                  >
                    {IconComponent ? (
                      <IconComponent size={16} className={i === selectedIndex ? 'text-blue-600' : 'text-gray-500'} />
                    ) : (
                      <Hash size={16} className={i === selectedIndex ? 'text-blue-600' : 'text-gray-500'} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {driver.prefix && (
                        <span className="text-xs text-gray-400">{driver.prefix}</span>
                      )}
                      <span className="font-medium text-sm text-gray-900">{driver.name}</span>
                    </div>
                    {driver.formula && (
                      <p className="text-xs text-gray-500 truncate font-mono">= {driver.formula.slice(0, 30)}...</p>
                    )}
                  </div>
                  {i === selectedIndex && (
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono text-[10px]">↵</kbd>
                  )}
                </button>
              );
            })}
            {filteredDrivers.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {isEn ? 'No drivers found' : 'Aucun pilote trouvé'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline formula display (for non-editing state)
export function FormulaDisplay({
  formula,
  allDrivers,
  onClick,
  isEn,
}: {
  formula?: string;
  allDrivers: Record<string, Driver>;
  onClick: () => void;
  isEn: boolean;
}) {
  if (!formula) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors group"
      >
        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <span>{isEn ? 'Add formula' : 'Ajouter'}</span>
      </button>
    );
  }

  // Parse formula into visual parts
  const parts: { type: 'driver' | 'text'; value: string; icon?: IconType }[] = [];
  let remaining = formula.startsWith('=') ? formula.slice(1) : formula;
  
  for (const driver of Object.values(allDrivers)) {
    const regex = new RegExp(driver.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    remaining = remaining.replace(regex, `<<DRIVER:${driver.id}:${driver.name}:${driver.icon || ''}>>`);
  }
  
  const segments = remaining.split(/(<<DRIVER:[^>]+>>)/);
  segments.forEach(seg => {
    const driverMatch = seg.match(/<<DRIVER:([^:]+):([^:]+):([^>]*)>>/);
    if (driverMatch) {
      parts.push({ 
        type: 'driver', 
        value: driverMatch[2],
        icon: driverMatch[3] as IconType || undefined,
      });
    } else if (seg) {
      parts.push({ type: 'text', value: seg });
    }
  });

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 transition-colors group max-w-full overflow-hidden"
    >
      <span className="text-gray-400 font-mono text-sm">=</span>
      <div className="flex items-center gap-0.5 overflow-hidden">
        {parts.map((part, i) => {
          if (part.type === 'driver') {
            const IconComponent = part.icon && ICON_MAP[part.icon];
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium truncate"
                style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}
              >
                {IconComponent && <IconComponent size={10} />}
                <span className="truncate">{part.value}</span>
              </span>
            );
          }
          return (
            <span key={i} className="text-sm font-mono text-gray-600 truncate">
              {part.value}
            </span>
          );
        })}
      </div>
    </button>
  );
}
