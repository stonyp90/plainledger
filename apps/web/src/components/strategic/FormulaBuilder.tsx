/**
 * Formula Builder Component
 * 
 * Visual formula editor with autocomplete and validation
 */

import { useState, useRef, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { type Driver } from '../../lib/financialModel';
import { extractDriverNames } from '../../lib/financialModel';
import { useI18n } from '../../lib/i18n';

interface FormulaBuilderProps {
  value: string;
  drivers: Record<string, Driver>;
  onChange: (formula: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function FormulaBuilder({
  value,
  drivers,
  onChange,
  onSave,
  onCancel,
}: FormulaBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Get available driver names for autocomplete
  const availableDrivers = Object.values(drivers).map(d => 
    isEn ? (d.nameEn || d.name) : d.name
  );
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    
    // Show suggestions if typing after = or space
    const lastWord = inputValue.split(/[\s+\-*/()]/).pop() || '';
    if (lastWord.length > 0 && inputValue.includes('=')) {
      const matches = availableDrivers.filter(name =>
        name.toLowerCase().startsWith(lastWord.toLowerCase())
      );
      setSuggestions(matches.slice(0, 5));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
    
    // Validate formula
    validateFormula(inputValue);
  };
  
  const validateFormula = (formula: string) => {
    if (!formula) {
      setError(null);
      return;
    }
    
    if (!formula.startsWith('=')) {
      setError(isEn ? 'Formula must start with =' : 'La formule doit commencer par =');
      return;
    }
    
    // Check for referenced drivers
    const referencedNames = extractDriverNames(formula);
    const missingDrivers = referencedNames.filter(name => {
      return !availableDrivers.some(d => 
        d.toLowerCase() === name.toLowerCase()
      );
    });
    
    if (missingDrivers.length > 0) {
      setError(
        isEn 
          ? `Unknown drivers: ${missingDrivers.join(', ')}`
          : `Pilotes inconnus: ${missingDrivers.join(', ')}`
      );
      return;
    }
    
    setError(null);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    const currentValue = value || '=';
    const lastWord = currentValue.split(/[\s+\-*/()]/).pop() || '';
    const newValue = currentValue.slice(0, -lastWord.length) + suggestion;
    onChange(newValue);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !error) {
      onSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isEn ? '= Cash Balance / Burn' : '= Solde / Dépenses'}
            className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
            style={{
              borderColor: error ? '#EF4444' : '#E5E7EB',
              fontFamily: 'monospace',
            }}
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
              style={{
                borderColor: '#E5E7EB',
              }}
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  style={{ color: '#111827' }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            disabled={!!error}
            className="p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isEn ? 'Save' : 'Enregistrer'}
          >
            <Check className="w-4 h-4" style={{ color: error ? '#9CA3AF' : '#10B981' }} />
          </button>
          <button
            onClick={onCancel}
            className="p-2 rounded hover:bg-gray-100 transition-colors"
            title={isEn ? 'Cancel' : 'Annuler'}
          >
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: '#EF4444' }}>
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help Text */}
      {!error && value && (
        <div className="mt-2 text-xs" style={{ color: '#6B7280' }}>
          {isEn 
            ? 'Press Enter to save, Esc to cancel'
            : 'Appuyez sur Entrée pour enregistrer, Échap pour annuler'}
        </div>
      )}
    </div>
  );
}
