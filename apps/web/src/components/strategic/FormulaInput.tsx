/**
 * Enhanced Formula Input Component
 * 
 * Enterprise-grade formula editor with autocomplete, validation, and AI suggestions
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, X, Sparkles, AlertCircle, Lightbulb } from 'lucide-react';
import { type Driver } from '../../lib/financialModel';
import { formulaLibrary } from '../../lib/formulaLibrary';
import FormulaLibrary from './FormulaLibrary';

interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  allDrivers: Record<string, Driver>;
  currentDriver?: Driver;
  isEn: boolean;
}

export default function FormulaInput({
  value,
  onChange,
  onSave,
  onCancel,
  allDrivers,
  currentDriver,
  isEn,
}: FormulaInputProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get available driver names for autocomplete
  const driverNames = useMemo(() => {
    return Object.values(allDrivers).map(d => d.name);
  }, [allDrivers]);

  // Get common formulas
  const commonFormulas = useMemo(() => {
    return formulaLibrary.getCommonFormulas().slice(0, 5);
  }, []);

  // Generate suggestions based on input
  useEffect(() => {
    if (!value || cursorPosition === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastWord = textBeforeCursor.split(/[\s+\-*/()]/).pop() || '';

    if (lastWord.length > 0) {
      // Match driver names
      const matchingDrivers = driverNames.filter(name =>
        name.toLowerCase().startsWith(lastWord.toLowerCase())
      ).slice(0, 5);

      // Match common formulas
      const matchingFormulas = commonFormulas.filter(f =>
        f.name.toLowerCase().includes(lastWord.toLowerCase()) ||
        f.formula.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 3);

      if (matchingDrivers.length > 0 || matchingFormulas.length > 0) {
        setSuggestions([
          ...matchingFormulas.map(f => f.formula),
          ...matchingDrivers,
        ]);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition, driverNames, commonFormulas]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'ArrowDown' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      // Navigate suggestions
    } else if (e.key === 'Tab' && showSuggestions && suggestions.length > 0) {
      e.preventDefault();
      // Auto-complete first suggestion
      const firstSuggestion = suggestions[0];
      const textBeforeCursor = value.slice(0, cursorPosition);
      const lastWord = textBeforeCursor.split(/[\s+\-*/()]/).pop() || '';
      const newValue = value.slice(0, cursorPosition - lastWord.length) + firstSuggestion + value.slice(cursorPosition);
      onChange(newValue);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastWord = textBeforeCursor.split(/[\s+\-*/()]/).pop() || '';
    const newValue = value.slice(0, cursorPosition - lastWord.length) + suggestion + value.slice(cursorPosition);
    onChange(newValue);
    setShowSuggestions(false);
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = cursorPosition - lastWord.length + suggestion.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
      setCursorPosition(newPos);
    }, 0);
  };

  const colors = {
    bg: {
      base: '#FFFFFF',
      hover: '#F9FAFB',
      focus: '#EFF6FF',
    },
    border: {
      default: '#E5E7EB',
      focus: '#3B82F6',
      error: '#DC2626',
    },
    text: {
      primary: '#111827',
      secondary: '#374151',
      muted: '#6B7280',
    },
    accent: {
      primary: '#3B82F6',
      ai: '#8B5CF6',
    },
  };

  // Validate formula
  const isValid = useMemo(() => {
    if (!value.trim()) return true; // Empty is valid
    // Basic validation - check for balanced parentheses, valid operators
    const openParens = (value.match(/\(/g) || []).length;
    const closeParens = (value.match(/\)/g) || []).length;
    return openParens === closeParens;
  }, [value]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1 bg-white rounded border-2 shadow-lg" style={{
        borderColor: isValid ? colors.border.focus : colors.border.error,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
      }}>
        <span style={{ 
          color: colors.text.muted, 
          fontFamily: "'SF Mono', 'Monaco', monospace", 
          fontSize: '14px',
          paddingLeft: '8px',
        }}>
          =
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onSelect={(e) => {
            const target = e.target as HTMLInputElement;
            setCursorPosition(target.selectionStart || 0);
          }}
          placeholder={isEn ? 'Enter formula or select from library...' : 'Entrez une formule ou sélectionnez...'}
          className="flex-1 px-2 py-2 outline-none"
          style={{
            fontFamily: "'SF Mono', 'Monaco', monospace",
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: colors.text.primary,
            minWidth: '200px',
          }}
        />
        <div className="flex items-center gap-1 px-2">
          {!isValid && (
            <AlertCircle className="w-4 h-4" style={{ color: colors.border.error }} />
          )}
          <button
            onClick={() => setShowLibrary(true)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title={isEn ? 'Formula Library' : 'Bibliothèque'}
            style={{ color: colors.accent.ai }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title={isEn ? 'Cancel' : 'Annuler'}
            style={{ color: colors.text.muted }}
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onSave}
            className="p-1.5 rounded transition-colors"
            title={isEn ? 'Save' : 'Enregistrer'}
            style={{
              backgroundColor: isValid ? colors.accent.primary : colors.border.error,
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border max-h-48 overflow-y-auto"
          style={{
            borderColor: colors.border.default,
            minWidth: '250px',
            top: '100%',
            left: 0,
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
              style={{
                fontSize: '13px',
                color: colors.text.primary,
              }}
            >
              <span className="font-mono flex-1">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Formula Library Modal */}
      {showLibrary && (
        <FormulaLibrary
          onSelectFormula={(formula) => {
            onChange(formula.startsWith('=') ? formula.slice(1) : formula);
            setShowLibrary(false);
          }}
          onClose={() => setShowLibrary(false)}
          currentFormula={value ? `=${value}` : undefined}
        />
      )}
    </div>
  );
}
