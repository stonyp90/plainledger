/**
 * Driver Row Component - Runway-style Design
 * 
 * Compact, data-dense row with:
 * - Inline formula display with driver tags
 * - Clean editing states
 * - Professional styling
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import {
  type Driver,
  type FinancialModel,
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
import IconPicker, { type IconType, ICON_MAP } from './IconPicker';
import ContextMenu from './ContextMenu';
import { selectionManager, type CellAddress } from './SelectionManager';
import { dragManager } from './DragAndDrop';
import FormulaLibrary from './FormulaLibrary';
import { formulaLibrary } from '../../lib/formulaLibrary';
import CellTooltip from './CellTooltip';
import FormulaInput from './FormulaInput';
import FormulaEditor, { FormulaDisplay } from './FormulaEditor';
import AIInsights from './AIInsights';

// Runway-inspired color palette with improved readability
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    code: '#F3F4F6',
    hover: '#F9FAFB',
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
  prefix: {
    bg: '#F3F4F6',
    text: '#6B7280',
  },
};

// Ensure consistent vertical alignment - increased row height for better readability
const ROW_HEIGHT = '36px'; // Increased from 32px for better readability
const CELL_STYLE = {
  verticalAlign: 'middle',
  lineHeight: '24px', // 36px row height - 6px top padding - 6px bottom padding = 24px
};

interface DriverRowProps {
  driver: Driver;
  periods: string[];
  viewMode: ViewMode;
  allDrivers: Record<string, Driver>;
  model?: FinancialModel;
  columnWidths?: {
    driver?: number;
    formula?: number;
    period?: number;
  };
  onUpdate: (driver: Driver) => void;
  onDelete?: (driverId: string) => void;
  onDuplicate?: (driver: Driver) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddAbove?: () => void;
  onAddBelow?: () => void;
  getAccountValue?: (accountId: string, periodKey: string) => number | null;
  currency?: string;
}

export default function DriverRow({
  driver,
  periods,
  viewMode,
  allDrivers,
  model,
  columnWidths,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddAbove,
  onAddBelow,
  getAccountValue,
  currency = 'USD',
}: DriverRowProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [formulaInput, setFormulaInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(driver.name);
  const [isEditingPrefix, setIsEditingPrefix] = useState(false);
  const [prefixInput, setPrefixInput] = useState(driver.prefix || '');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showFormulaLibrary, setShowFormulaLibrary] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [periodInput, setPeriodInput] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<CellAddress | null>(null);
  const [dragState, setDragState] = useState(dragManager.getDragState());
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const periodInputRef = useRef<HTMLInputElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);
  
  // Subscribe to drag state
  useEffect(() => {
    const unsubscribe = dragManager.subscribe(setDragState);
    return unsubscribe;
  }, []);
  
  // Global mouse up handler to stop selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionStart(null);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
  
  // Focus inputs when editing starts
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
  
  const handlePrefixSave = () => {
    const trimmed = prefixInput.trim();
    onUpdate({ ...driver, prefix: trimmed || undefined });
    setIsEditingPrefix(false);
  };
  
  const handleIconSelect = (iconType: IconType) => {
    onUpdate({ ...driver, icon: iconType === 'none' ? undefined : iconType });
  };
  
  // Keyboard shortcuts - handle when row is clicked/focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field (except Escape)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          setIsEditingFormula(false);
          setIsEditingName(false);
          setIsEditingPrefix(false);
          setEditingPeriod(null);
          setShowIconPicker(false);
        }
        return;
      }
      
      // Check if this row is focused/selected
      const isRowFocused = document.activeElement === rowRef.current || 
                          rowRef.current?.contains(document.activeElement) ||
                          rowRef.current?.classList.contains('row-focused');
      
      if (!isRowFocused) return;
      
      // Copy driver
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        handleCopy();
      }
      
      // Duplicate driver
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }
      
      // Delete driver
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingName && !isEditingFormula) {
        e.preventDefault();
        handleDelete();
      }
      
      // Edit name (E key)
      if (e.key === 'e' || e.key === 'E') {
        if (!e.ctrlKey && !e.metaKey && !isEditingName && !isEditingFormula) {
          e.preventDefault();
          setIsEditingName(true);
        }
      }
      
      // Edit formula (F key)
      if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && !isEditingName && !isEditingFormula) {
          e.preventDefault();
          startEditingFormula();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [driver, isEditingName, isEditingFormula]);
  
  // Handle row click to focus it
  const handleRowClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    rowRef.current?.focus();
    // Remove focus from other rows
    document.querySelectorAll('.row-focused').forEach(el => el.classList.remove('row-focused'));
    rowRef.current?.classList.add('row-focused');
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(driver)).catch(() => {});
  };
  
  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(driver);
    }
  };
  
  const handleDelete = () => {
    if (onDelete && window.confirm(isEn ? `Delete "${driver.name}"?` : `Supprimer "${driver.name}"?`)) {
      onDelete(driver.id);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };
  
  // Close context menu when clicking outside
  useEffect(() => {
    if (!showContextMenu) return;
    
    const handleClick = () => setShowContextMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showContextMenu]);
  
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
  
  const handleSaveToLibrary = () => {
    const trimmed = formulaInput.trim();
    if (!trimmed) return;
    
    const formula = trimmed.startsWith('=') ? trimmed.slice(1) : trimmed;
    const name = `${driver.name} Formula`;
    
    formulaLibrary.saveFormula({
      name,
      description: `Formula for ${driver.name}`,
      formula,
      category: 'custom',
      tags: [driver.name.toLowerCase().replace(/\s+/g, '-')],
      createdBy: 'user', // Would come from auth context
      isPublic: true,
    });
    
    // Show feedback (could use a toast notification)
    alert(isEn ? 'Formula saved to library!' : 'Formule enregistrée dans la bibliothèque!');
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
  
  const handleFormulaLibrarySelect = (formula: string) => {
    setFormulaInput(formula.startsWith('=') ? formula.slice(1) : formula);
    setIsEditingFormula(true);
    setShowFormulaLibrary(false);
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
          className="cursor-pointer hover:text-gray-500 transition-colors"
          style={{ 
            color: colors.text.muted, 
            fontSize: '14px', // Increased from 13px
            whiteSpace: 'nowrap' 
          }}
        >
          {isEn ? 'Add formula' : 'Formule'}
        </span>
      );
    }
    
    return (
      <div 
        className="flex items-center gap-0.5"
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '24px' }}
      >
        <span style={{ color: colors.text.muted, fontFamily: "'SF Mono', 'Monaco', monospace", fontSize: '14px' }}>=</span>
        {formulaParts.map((part, i) => (
          <FormulaPartDisplay key={i} part={part} />
        ))}
      </div>
    );
  };
  
  const IconComponent = driver.icon && driver.icon !== 'none' ? ICON_MAP[driver.icon as IconType] : null;
  
  return (
    <>
      <tr
        ref={rowRef}
        className="group transition-colors cursor-pointer"
        style={{
          height: ROW_HEIGHT,
          maxHeight: ROW_HEIGHT,
          borderBottom: `1px solid ${colors.border.default}`,
        }}
        onClick={handleRowClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F9FAFB';
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== rowRef.current) {
            e.currentTarget.style.backgroundColor = colors.bg.base;
          }
        }}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onFocus={(e) => {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
          e.currentTarget.classList.add('row-focused');
        }}
        onBlur={(e) => {
          e.currentTarget.style.backgroundColor = colors.bg.base;
          e.currentTarget.classList.remove('row-focused');
        }}
      >
      {/* Row Number / Selector */}
      <td
        className="relative cursor-pointer select-none"
        style={{
          padding: '6px 8px',
          borderRight: `1px solid ${colors.border.default}`,
          width: '40px',
          minWidth: '40px',
          backgroundColor: selectionManager.isRowSelected(driver.id) ? '#EFF6FF' : colors.bg.muted,
          textAlign: 'center',
          fontSize: '12px',
          color: colors.text.muted,
          ...CELL_STYLE,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            // Multi-select rows
            const currentSel = selectionManager.getSelection();
            if (currentSel?.type === 'row' && currentSel.driverId) {
              // Find driver indices
              const allDriverIds = Object.values(allDrivers).map(d => d.id);
              const currentIndex = allDriverIds.indexOf(currentSel.driverId);
              const newIndex = allDriverIds.indexOf(driver.id);
              if (currentIndex !== -1 && newIndex !== -1) {
                const start = Math.min(currentIndex, newIndex);
                const end = Math.max(currentIndex, newIndex);
                selectionManager.selectMultipleRows(allDriverIds.slice(start, end + 1));
              }
            } else {
              selectionManager.selectRow(driver.id);
            }
          } else {
            selectionManager.selectRow(driver.id);
          }
        }}
        onMouseEnter={(e) => {
          if (!selectionManager.isRowSelected(driver.id)) {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }
        }}
        onMouseLeave={(e) => {
          if (!selectionManager.isRowSelected(driver.id)) {
            e.currentTarget.style.backgroundColor = colors.bg.muted;
          }
        }}
      >
        {selectionManager.isRowSelected(driver.id) ? '✓' : '•'}
      </td>
      
      {/* Driver Name Cell */}
      <td
        className="relative"
        style={{
          padding: '6px 12px',
          borderRight: `1px solid ${colors.border.default}`,
          width: `${columnWidths?.driver ?? 200}px`,
          minWidth: `${columnWidths?.driver ?? 200}px`,
          maxWidth: `${columnWidths?.driver ?? 200}px`,
          backgroundColor: selectionManager.isRowSelected(driver.id) ? '#EFF6FF' : 'transparent',
          overflow: isEditingName ? 'visible' : 'hidden',
          zIndex: isEditingName ? 50 : 1,
          ...CELL_STYLE,
        }}
      >
        {isEditingName ? (
          <div 
            className="absolute left-0 top-0 z-[100] bg-white rounded-lg shadow-xl border-2"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: `${Math.max(columnWidths?.driver ?? 200, 280)}px`,
              borderColor: colors.border.focus,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)',
              padding: '6px',
              marginTop: '-2px',
            }}
          >
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
                className="flex-1 px-3 py-2 rounded outline-none"
                style={{
                  fontSize: '15px',
                  backgroundColor: 'transparent',
                  color: colors.text.primary,
                }}
                autoFocus
              />
              <button
                onClick={handleNameSave}
                className="p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: '#FFFFFF',
                }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setNameInput(driver.name);
                }}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                style={{ color: colors.text.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <CellTooltip content={driver.name} showOnlyIfTruncated={true}>
            <div className="flex items-center gap-2 truncate truncate-check">
              {isEditingPrefix ? (
              <input
                type="text"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePrefixSave();
                  if (e.key === 'Escape') {
                    setIsEditingPrefix(false);
                    setPrefixInput(driver.prefix || '');
                  }
                }}
                onBlur={handlePrefixSave}
                autoFocus
                className="px-1.5 py-0.5 rounded outline-none w-20"
                style={{
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  color: colors.text.primary,
                  border: `1px solid ${colors.border.focus}`,
                  boxShadow: `0 0 0 2px ${colors.border.focus}20`,
                }}
                placeholder={isEn ? 'Prefix' : 'Préfixe'}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: driver.prefix ? colors.prefix.bg : 'transparent',
                  color: colors.prefix.text,
                  fontSize: '12px',
                  border: driver.prefix ? 'none' : `1px dashed ${colors.border.default}`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPrefixInput(driver.prefix || '');
                  setIsEditingPrefix(true);
                }}
                title={isEn ? 'Click to edit prefix' : 'Cliquez pour modifier le préfixe'}
              >
                {driver.prefix || (isEn ? '+ Prefix' : '+ Préfixe')}
              </span>
            )}
            <div className="relative">
              <button
                ref={iconButtonRef}
                className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center justify-center w-6 h-6 rounded"
                style={{ 
                  lineHeight: '24px',
                  backgroundColor: IconComponent ? 'transparent' : colors.bg.muted,
                  color: IconComponent ? colors.accent.primary : colors.text.muted,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIconPicker(!showIconPicker);
                }}
                title={isEn ? 'Click to select icon' : 'Cliquez pour sélectionner l\'icône'}
              >
                {IconComponent ? (
                  <IconComponent size={16} />
                ) : (
                  <span style={{ fontSize: '12px' }}>🎯</span>
                )}
              </button>
              {showIconPicker && iconButtonRef.current && (
                <div
                  className="absolute"
                  style={{
                    left: iconButtonRef.current.offsetLeft,
                    top: iconButtonRef.current.offsetTop + iconButtonRef.current.offsetHeight + 4,
                    zIndex: 1000,
                  }}
                >
                  <IconPicker
                    selectedIcon={(driver.icon as IconType) || 'none'}
                    onSelect={handleIconSelect}
                    onClose={() => setShowIconPicker(false)}
                  />
                </div>
              )}
            </div>
            <span
              className="font-medium cursor-pointer hover:text-blue-600 transition-colors truncate"
              style={{ 
                color: colors.text.primary, 
                fontSize: '15px', // Increased from 14px
                fontWeight: 500,
                lineHeight: '24px' 
              }}
              onClick={() => {
                setNameInput(driver.name);
                setIsEditingName(true);
              }}
            >
              {driver.name}
            </span>
            </div>
          </CellTooltip>
        )}
      </td>
      
      {/* Formula Cell - Linear/Notion style */}
      <td
        className="relative group/formula"
        style={{
          padding: '4px 8px',
          borderRight: `1px solid ${colors.border.default}`,
          backgroundColor: driver.formula ? 'rgba(243, 244, 246, 0.5)' : 'transparent',
          width: `${columnWidths?.formula ?? 300}px`,
          minWidth: `${columnWidths?.formula ?? 300}px`,
          overflow: isEditingFormula ? 'visible' : 'hidden',
          zIndex: isEditingFormula ? 50 : 1,
          ...CELL_STYLE,
        }}
      >
        {isEditingFormula ? (
          <div 
            className="absolute left-0 top-0 z-[100]"
            style={{ 
              width: `${Math.max(columnWidths?.formula ?? 300, 500)}px`,
              marginTop: '-4px',
              marginLeft: '-4px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <FormulaEditor
              value={formulaInput}
              onChange={setFormulaInput}
              onSave={handleFormulaSave}
              onCancel={() => {
                setIsEditingFormula(false);
                setFormulaInput(driver.formula?.startsWith('=') ? driver.formula.slice(1) : driver.formula || '');
              }}
              allDrivers={allDrivers}
              currentDriver={driver}
              isEn={isEn}
              autoFocus={true}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1" style={{ lineHeight: '24px' }}>
            <div className="flex-1 min-w-0">
              <FormulaDisplay
                formula={driver.formula}
                allDrivers={allDrivers}
                onClick={startEditingFormula}
                isEn={isEn}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFormulaLibrary(true);
              }}
              className="p-1 rounded opacity-0 group-hover/formula:opacity-100 hover:bg-gray-200 transition-all"
              style={{ color: colors.text.muted }}
              title={isEn ? 'Formula library' : 'Bibliothèque'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
          </div>
        )}
      </td>
      
      {/* Period Value Cells */}
      {values.map(({ periodKey, value, formatted }) => {
        // Get driver order for proper range checking
        const driverOrder = Object.values(allDrivers).map(d => d.id);
        const isSelected = selectionManager.isCellSelected(driver.id, periodKey, driverOrder, periods);
        const isRowSelected = selectionManager.isRowSelected(driver.id);
        const isColumnSelected = selectionManager.isColumnSelected(periodKey);
        const isDraggingOver = dragState.isDragging && 
                               dragState.currentCell?.driverId === driver.id &&
                               dragState.currentCell?.periodKey === periodKey;
        const isDragSource = dragState.isDragging &&
                            dragState.sourceCell?.driverId === driver.id &&
                            dragState.sourceCell?.periodKey === periodKey;
        
        return (
          <td
            key={periodKey}
            data-driver-id={driver.id}
            data-period-key={periodKey}
            className="relative text-right"
            style={{
              padding: '6px 12px',
              borderRight: `1px solid ${colors.border.default}`,
              width: `${columnWidths?.period ?? 110}px`,
              minWidth: `${columnWidths?.period ?? 110}px`,
              color: isNegative(value) ? colors.accent.error : colors.text.primary,
              overflow: editingPeriod === periodKey ? 'visible' : 'hidden',
              zIndex: editingPeriod === periodKey ? 50 : 1,
              backgroundColor: isDragSource 
                ? '#DBEAFE'
                : isDraggingOver
                  ? '#EFF6FF'
                  : isSelected || (isRowSelected && isColumnSelected) 
                    ? '#EFF6FF' 
                    : isRowSelected || isColumnSelected 
                      ? '#F9FAFB' 
                      : 'transparent',
              borderLeft: isSelected ? `2px solid ${colors.accent.primary}` : 'none',
              borderRight: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border.default}`,
              borderTop: isSelected ? `2px solid ${colors.accent.primary}` : 'none',
              borderBottom: isSelected ? `2px solid ${colors.accent.primary}` : `1px solid ${colors.border.default}`,
              cursor: driver.formula ? 'default' : 'cell',
              position: 'relative',
              userSelect: 'none',
              ...CELL_STYLE,
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return; // Only left click
              if (e.target instanceof HTMLInputElement) return;
              
              const cellAddr: CellAddress = { driverId: driver.id, periodKey };
              setSelectionStart(cellAddr);
              setIsSelecting(true);
              
              if (e.shiftKey) {
                // Range selection
                const currentSel = selectionManager.getSelection();
                if (currentSel?.type === 'cell' && currentSel.cell) {
                  selectionManager.selectRange(currentSel.cell, cellAddr);
                } else {
                  selectionManager.selectCell(driver.id, periodKey);
                }
              } else {
                selectionManager.selectCell(driver.id, periodKey);
              }
            }}
            onMouseEnter={(e) => {
              if (isSelecting && selectionStart) {
                selectionManager.selectRange(selectionStart, { driverId: driver.id, periodKey });
              }
              
              if (dragState.isDragging) {
                dragManager.updateDrag({ driverId: driver.id, periodKey });
              }
            }}
            onMouseUp={(e) => {
              if (e.button !== 0) return;
              setIsSelecting(false);
              setSelectionStart(null);
              
              if (dragState.isDragging && dragState.sourceCell && dragState.currentCell) {
                const source = dragState.sourceCell;
                const target = dragState.currentCell;
                
                if (source.driverId !== target.driverId || source.periodKey !== target.periodKey) {
                  // Handle drag drop
                  const sourceDriver = allDrivers[source.driverId];
                  if (sourceDriver && sourceDriver.values[source.periodKey] !== undefined) {
                    const targetDriver = allDrivers[target.driverId];
                    if (targetDriver && !targetDriver.formula) {
                      const sourceValue = sourceDriver.values[source.periodKey];
                      const updatedDriver = {
                        ...targetDriver,
                        values: {
                          ...targetDriver.values,
                          [target.periodKey]: dragState.mode === 'copy' ? sourceValue : sourceValue,
                        },
                      };
                      onUpdate(updatedDriver);
                      
                      // If move mode, clear source
                      if (dragState.mode === 'move') {
                        const updatedSourceValues = { ...sourceDriver.values };
                        delete updatedSourceValues[source.periodKey];
                        const updatedSourceDriver = {
                          ...sourceDriver,
                          values: updatedSourceValues,
                        };
                        onUpdate(updatedSourceDriver);
                      }
                    }
                  }
                }
                dragManager.endDrag();
              }
            }}
            draggable={!driver.formula && value !== null && value !== undefined}
            onDragStart={(e) => {
              if (driver.formula) {
                e.preventDefault();
                return;
              }
              dragManager.startDrag({ driverId: driver.id, periodKey }, e.ctrlKey || e.metaKey ? 'copy' : 'move');
              e.dataTransfer.effectAllowed = e.ctrlKey || e.metaKey ? 'copy' : 'move';
              e.dataTransfer.setData('text/plain', String(value || ''));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = dragState.mode === 'copy' ? 'copy' : 'move';
            }}
            onDragEnd={() => {
              dragManager.endDrag();
            }}
            >
            {/* Fill Handle */}
            {isSelected && !driver.formula && value !== null && value !== undefined && (
              <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
                style={{
                  backgroundColor: colors.accent.primary,
                  border: `2px solid ${colors.bg.base}`,
                  borderRadius: '4px 0 0 0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const cellAddr: CellAddress = { driverId: driver.id, periodKey };
                  setSelectionStart(cellAddr);
                  setIsSelecting(true);
                  selectionManager.selectCell(driver.id, periodKey);
                }}
                onMouseMove={(e) => {
                  if (isSelecting && selectionStart) {
                    // Find which cell we're hovering over
                    const rect = e.currentTarget.closest('td')?.getBoundingClientRect();
                    if (rect) {
                      const table = e.currentTarget.closest('table');
                      if (table) {
                        const allCells = table.querySelectorAll('td');
                        allCells.forEach(cell => {
                          const cellRect = cell.getBoundingClientRect();
                          if (e.clientX >= cellRect.left && e.clientX <= cellRect.right &&
                              e.clientY >= cellRect.top && e.clientY <= cellRect.bottom) {
                            const driverId = cell.getAttribute('data-driver-id');
                            const periodKey = cell.getAttribute('data-period-key');
                            if (driverId && periodKey) {
                              selectionManager.selectRange(selectionStart, { driverId, periodKey });
                            }
                          }
                        });
                      }
                    }
                  }
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  if (isSelecting && selectionStart) {
                    const sel = selectionManager.getSelection();
                    if (sel?.type === 'range' && sel.startCell && sel.endCell) {
                      // Fill the range
                      const sourceValue = allDrivers[sel.startCell.driverId]?.values[sel.startCell.periodKey];
                      if (sourceValue !== undefined) {
                        const driverOrder = Object.values(allDrivers).map(d => d.id);
                        const startDriverIdx = driverOrder.indexOf(sel.startCell.driverId);
                        const endDriverIdx = driverOrder.indexOf(sel.endCell.driverId);
                        const startPeriodIdx = periods.indexOf(sel.startCell.periodKey);
                        const endPeriodIdx = periods.indexOf(sel.endCell.periodKey);
                        
                        if (startDriverIdx !== -1 && endDriverIdx !== -1 && 
                            startPeriodIdx !== -1 && endPeriodIdx !== -1) {
                          const minDriverIdx = Math.min(startDriverIdx, endDriverIdx);
                          const maxDriverIdx = Math.max(startDriverIdx, endDriverIdx);
                          const minPeriodIdx = Math.min(startPeriodIdx, endPeriodIdx);
                          const maxPeriodIdx = Math.max(startPeriodIdx, endPeriodIdx);
                          
                          const updatedDrivers: Record<string, Driver> = {};
                          
                          for (let d = minDriverIdx; d <= maxDriverIdx; d++) {
                            const targetDriverId = driverOrder[d];
                            const targetDriver = allDrivers[targetDriverId];
                            if (targetDriver && !targetDriver.formula) {
                              const updatedValues = { ...targetDriver.values };
                              const sourceDriverId = driverOrder[minDriverIdx];
                              const sourceDriver = allDrivers[sourceDriverId];
                              const sourceValue = sourceDriver?.values[periods[minPeriodIdx]];
                              
                              if (sourceValue !== undefined) {
                                for (let p = minPeriodIdx; p <= maxPeriodIdx; p++) {
                                  updatedValues[periods[p]] = sourceValue;
                                }
                                updatedDrivers[targetDriverId] = { ...targetDriver, values: updatedValues };
                              }
                            }
                          }
                          
                          // Update all affected drivers
                          Object.values(updatedDrivers).forEach(updatedDriver => {
                            onUpdate(updatedDriver);
                          });
                        }
                      }
                    }
                    setIsSelecting(false);
                    setSelectionStart(null);
                  }
                }}
                title={isEn ? 'Drag to fill range' : 'Glisser pour remplir la plage'}
              />
            )}
          {editingPeriod === periodKey ? (
            <div 
              className="absolute right-0 top-0 z-[100] bg-white rounded-lg shadow-xl border-2"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: `${Math.max(columnWidths?.period ?? 110, 200)}px`,
                borderColor: colors.border.focus,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)',
                padding: '6px',
                marginTop: '-2px',
              }}
            >
              <div className="flex items-center gap-1">
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
                  className="flex-1 px-3 py-2 text-right rounded outline-none"
                  style={{
                    fontSize: '15px',
                    backgroundColor: 'transparent',
                    color: colors.text.primary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  autoFocus
                />
                <button
                  onClick={() => handlePeriodSave(periodKey)}
                  className="p-1.5 rounded transition-colors"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: '#FFFFFF',
                  }}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingPeriod(null)}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  style={{ color: colors.text.muted }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <CellTooltip 
                content={formatted || (driver.formula ? '' : '-')}
                showOnlyIfTruncated={true}
              >
                <span
                  className={`${!driver.formula ? 'cursor-pointer hover:bg-gray-100 px-1 -mx-1 rounded transition-colors' : ''} truncate truncate-check`}
                  style={{
                    fontSize: '15px', // Increased from 14px
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: '24px',
                    display: 'inline-block',
                    maxWidth: '100%',
                  }}
                  onClick={() => startEditingPeriod(periodKey, value)}
                >
                  {formatted || (driver.formula ? '' : '-')}
                </span>
              </CellTooltip>
              {/* AI Insights on hover */}
              {!editingPeriod && value !== null && value !== undefined && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <AIInsights
                    driver={driver}
                    value={typeof value === 'number' ? value : parseFloat(String(value)) || 0}
                    periodKey={periodKey}
                    allDrivers={allDrivers}
                    isEn={isEn}
                  />
                </div>
              )}
            </div>
          )}
        </td>
        );
      })}
      </tr>
      
      {/* Context Menu */}
      {showContextMenu && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          driver={driver}
          onClose={() => setShowContextMenu(false)}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onEdit={() => {
            setIsEditingName(true);
            setNameInput(driver.name);
          }}
          onDuplicate={handleDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onAddAbove={onAddAbove}
          onAddBelow={onAddBelow}
        />
      )}
      
      {/* Formula Library */}
      {showFormulaLibrary && (
        <FormulaLibrary
          onSelectFormula={handleFormulaLibrarySelect}
          onClose={() => setShowFormulaLibrary(false)}
          currentFormula={driver.formula}
        />
      )}
    </>
  );
}

// Formula Part Display Component
function FormulaPartDisplay({ part }: { part: FormulaPart }) {
  const color = getFormulaPartColor(part.type);
  const bg = getFormulaPartBg(part.type);
  
  if (part.type === 'driver') {
      const DriverIconComponent = part.driverIcon && part.driverIcon !== 'none' 
        ? ICON_MAP[part.driverIcon as IconType] 
        : null;
      
      return (
        <span
          className="inline-flex items-center gap-1 rounded font-medium"
          style={{
            backgroundColor: bg,
            color: color,
            padding: '2px 8px',
            margin: '0 2px',
            fontSize: '13px', // Increased from 12px
            lineHeight: '18px',
            fontWeight: 500,
            borderRadius: '4px',
          }}
        >
          {DriverIconComponent && (
            <DriverIconComponent size={12} style={{ color: color }} />
          )}
          {part.driverPrefix && (
            <span
              style={{
                fontSize: '10px',
                opacity: 0.8,
                fontWeight: 400,
              }}
            >
              {part.driverPrefix}:
            </span>
          )}
          {part.value}
        </span>
      );
    }
  
  return (
    <span
      style={{
        color: color,
        fontFamily: "'SF Mono', 'Monaco', monospace",
        fontSize: '14px', // Increased from 13px
        lineHeight: '18px',
      }}
    >
      {part.value}
    </span>
  );
}
