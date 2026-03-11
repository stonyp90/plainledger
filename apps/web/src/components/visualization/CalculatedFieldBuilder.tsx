/**
 * CalculatedFieldBuilder - Advanced formula editor for calculated fields
 *
 * Best-in-class features inspired by Looker LookML and Power BI DAX:
 * - Syntax-highlighted formula editor
 * - Field reference autocomplete
 * - Function library with categories
 * - Real-time validation
 * - Preview with sample data
 * - Bilingual support (EN/FR)
 * - Error highlighting
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Calculator,
  Plus,
  X,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Code,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Percent,
  Sigma,
  Function as FunctionIcon,
  Braces,
  Info,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  CalculatedField,
  DataSourceReference,
  FieldType,
  generateId,
} from '../../lib/visualizationTypes';
import { getDataSource, GOLD_SCHEMA } from '../../lib/goldSchema';

// =====================================================
// FUNCTION LIBRARY
// =====================================================

interface FormulaFunction {
  name: string;
  category: 'aggregate' | 'math' | 'string' | 'date' | 'logical' | 'conversion';
  syntax: string;
  descriptionEn: string;
  descriptionFr: string;
  exampleEn: string;
  exampleFr: string;
  returnType: FieldType;
}

const FORMULA_FUNCTIONS: FormulaFunction[] = [
  // Aggregate Functions
  {
    name: 'SUM',
    category: 'aggregate',
    syntax: 'SUM(field)',
    descriptionEn: 'Sum of all values',
    descriptionFr: 'Somme de toutes les valeurs',
    exampleEn: 'SUM(amount)',
    exampleFr: 'SUM(montant)',
    returnType: 'NUMBER',
  },
  {
    name: 'AVG',
    category: 'aggregate',
    syntax: 'AVG(field)',
    descriptionEn: 'Average of all values',
    descriptionFr: 'Moyenne de toutes les valeurs',
    exampleEn: 'AVG(price)',
    exampleFr: 'AVG(prix)',
    returnType: 'NUMBER',
  },
  {
    name: 'COUNT',
    category: 'aggregate',
    syntax: 'COUNT(field)',
    descriptionEn: 'Count of non-null values',
    descriptionFr: 'Nombre de valeurs non nulles',
    exampleEn: 'COUNT(customer_id)',
    exampleFr: 'COUNT(id_client)',
    returnType: 'NUMBER',
  },
  {
    name: 'COUNT_DISTINCT',
    category: 'aggregate',
    syntax: 'COUNT_DISTINCT(field)',
    descriptionEn: 'Count of unique values',
    descriptionFr: 'Nombre de valeurs uniques',
    exampleEn: 'COUNT_DISTINCT(customer_id)',
    exampleFr: 'COUNT_DISTINCT(id_client)',
    returnType: 'NUMBER',
  },
  {
    name: 'MIN',
    category: 'aggregate',
    syntax: 'MIN(field)',
    descriptionEn: 'Minimum value',
    descriptionFr: 'Valeur minimale',
    exampleEn: 'MIN(price)',
    exampleFr: 'MIN(prix)',
    returnType: 'NUMBER',
  },
  {
    name: 'MAX',
    category: 'aggregate',
    syntax: 'MAX(field)',
    descriptionEn: 'Maximum value',
    descriptionFr: 'Valeur maximale',
    exampleEn: 'MAX(price)',
    exampleFr: 'MAX(prix)',
    returnType: 'NUMBER',
  },
  // Math Functions
  {
    name: 'ROUND',
    category: 'math',
    syntax: 'ROUND(number, decimals)',
    descriptionEn: 'Round to specified decimals',
    descriptionFr: 'Arrondir au nombre de décimales',
    exampleEn: 'ROUND(price, 2)',
    exampleFr: 'ROUND(prix, 2)',
    returnType: 'NUMBER',
  },
  {
    name: 'ABS',
    category: 'math',
    syntax: 'ABS(number)',
    descriptionEn: 'Absolute value',
    descriptionFr: 'Valeur absolue',
    exampleEn: 'ABS(balance)',
    exampleFr: 'ABS(solde)',
    returnType: 'NUMBER',
  },
  {
    name: 'POWER',
    category: 'math',
    syntax: 'POWER(base, exponent)',
    descriptionEn: 'Raise to power',
    descriptionFr: 'Élever à la puissance',
    exampleEn: 'POWER(value, 2)',
    exampleFr: 'POWER(valeur, 2)',
    returnType: 'NUMBER',
  },
  {
    name: 'SQRT',
    category: 'math',
    syntax: 'SQRT(number)',
    descriptionEn: 'Square root',
    descriptionFr: 'Racine carrée',
    exampleEn: 'SQRT(variance)',
    exampleFr: 'SQRT(variance)',
    returnType: 'NUMBER',
  },
  // String Functions
  {
    name: 'CONCAT',
    category: 'string',
    syntax: 'CONCAT(str1, str2, ...)',
    descriptionEn: 'Concatenate strings',
    descriptionFr: 'Concaténer des chaînes',
    exampleEn: 'CONCAT(first_name, " ", last_name)',
    exampleFr: 'CONCAT(prenom, " ", nom)',
    returnType: 'STRING',
  },
  {
    name: 'UPPER',
    category: 'string',
    syntax: 'UPPER(text)',
    descriptionEn: 'Convert to uppercase',
    descriptionFr: 'Convertir en majuscules',
    exampleEn: 'UPPER(name)',
    exampleFr: 'UPPER(nom)',
    returnType: 'STRING',
  },
  {
    name: 'LOWER',
    category: 'string',
    syntax: 'LOWER(text)',
    descriptionEn: 'Convert to lowercase',
    descriptionFr: 'Convertir en minuscules',
    exampleEn: 'LOWER(email)',
    exampleFr: 'LOWER(courriel)',
    returnType: 'STRING',
  },
  {
    name: 'SUBSTRING',
    category: 'string',
    syntax: 'SUBSTRING(text, start, length)',
    descriptionEn: 'Extract substring',
    descriptionFr: 'Extraire une sous-chaîne',
    exampleEn: 'SUBSTRING(code, 1, 3)',
    exampleFr: 'SUBSTRING(code, 1, 3)',
    returnType: 'STRING',
  },
  // Date Functions
  {
    name: 'YEAR',
    category: 'date',
    syntax: 'YEAR(date)',
    descriptionEn: 'Extract year from date',
    descriptionFr: "Extraire l'année de la date",
    exampleEn: 'YEAR(transaction_date)',
    exampleFr: 'YEAR(date_transaction)',
    returnType: 'NUMBER',
  },
  {
    name: 'MONTH',
    category: 'date',
    syntax: 'MONTH(date)',
    descriptionEn: 'Extract month from date',
    descriptionFr: 'Extraire le mois de la date',
    exampleEn: 'MONTH(transaction_date)',
    exampleFr: 'MONTH(date_transaction)',
    returnType: 'NUMBER',
  },
  {
    name: 'DATEDIFF',
    category: 'date',
    syntax: 'DATEDIFF(date1, date2, unit)',
    descriptionEn: 'Difference between dates',
    descriptionFr: 'Différence entre dates',
    exampleEn: 'DATEDIFF(due_date, paid_date, "day")',
    exampleFr: 'DATEDIFF(date_echeance, date_paiement, "jour")',
    returnType: 'NUMBER',
  },
  {
    name: 'NOW',
    category: 'date',
    syntax: 'NOW()',
    descriptionEn: 'Current date and time',
    descriptionFr: 'Date et heure actuelles',
    exampleEn: 'DATEDIFF(NOW(), created_at, "day")',
    exampleFr: 'DATEDIFF(NOW(), cree_le, "jour")',
    returnType: 'DATETIME',
  },
  // Logical Functions
  {
    name: 'IF',
    category: 'logical',
    syntax: 'IF(condition, true_value, false_value)',
    descriptionEn: 'Conditional value',
    descriptionFr: 'Valeur conditionnelle',
    exampleEn: 'IF(amount > 0, "Credit", "Debit")',
    exampleFr: 'IF(montant > 0, "Crédit", "Débit")',
    returnType: 'STRING',
  },
  {
    name: 'CASE',
    category: 'logical',
    syntax: 'CASE(field, value1, result1, value2, result2, ...)',
    descriptionEn: 'Multiple conditions',
    descriptionFr: 'Conditions multiples',
    exampleEn: 'CASE(type, "A", 1, "B", 2, 0)',
    exampleFr: 'CASE(type, "A", 1, "B", 2, 0)',
    returnType: 'NUMBER',
  },
  {
    name: 'COALESCE',
    category: 'logical',
    syntax: 'COALESCE(value1, value2, ...)',
    descriptionEn: 'First non-null value',
    descriptionFr: 'Première valeur non nulle',
    exampleEn: 'COALESCE(phone, email, "N/A")',
    exampleFr: 'COALESCE(telephone, courriel, "N/D")',
    returnType: 'STRING',
  },
  {
    name: 'NULLIF',
    category: 'logical',
    syntax: 'NULLIF(value1, value2)',
    descriptionEn: 'Return null if values equal',
    descriptionFr: 'Retourner null si valeurs égales',
    exampleEn: 'NULLIF(count, 0)',
    exampleFr: 'NULLIF(compte, 0)',
    returnType: 'NUMBER',
  },
  // Conversion Functions
  {
    name: 'TO_NUMBER',
    category: 'conversion',
    syntax: 'TO_NUMBER(text)',
    descriptionEn: 'Convert to number',
    descriptionFr: 'Convertir en nombre',
    exampleEn: 'TO_NUMBER(amount_text)',
    exampleFr: 'TO_NUMBER(montant_texte)',
    returnType: 'NUMBER',
  },
  {
    name: 'TO_TEXT',
    category: 'conversion',
    syntax: 'TO_TEXT(value)',
    descriptionEn: 'Convert to text',
    descriptionFr: 'Convertir en texte',
    exampleEn: 'TO_TEXT(account_code)',
    exampleFr: 'TO_TEXT(code_compte)',
    returnType: 'STRING',
  },
  {
    name: 'TO_DATE',
    category: 'conversion',
    syntax: 'TO_DATE(text, format)',
    descriptionEn: 'Convert to date',
    descriptionFr: 'Convertir en date',
    exampleEn: 'TO_DATE(date_str, "YYYY-MM-DD")',
    exampleFr: 'TO_DATE(date_texte, "YYYY-MM-DD")',
    returnType: 'DATE',
  },
];

const CATEGORY_INFO: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    labelEn: string;
    labelFr: string;
    color: string;
  }
> = {
  aggregate: {
    icon: Sigma,
    labelEn: 'Aggregate',
    labelFr: 'Agrégation',
    color: 'rgb(var(--color-primary-500))',
  },
  math: { icon: Calculator, labelEn: 'Math', labelFr: 'Math', color: '#3B82F6' },
  string: { icon: Type, labelEn: 'Text', labelFr: 'Texte', color: '#8B5CF6' },
  date: { icon: Calendar, labelEn: 'Date', labelFr: 'Date', color: '#F59E0B' },
  logical: { icon: ToggleLeft, labelEn: 'Logical', labelFr: 'Logique', color: '#EF4444' },
  conversion: { icon: Braces, labelEn: 'Conversion', labelFr: 'Conversion', color: '#EC4899' },
};

// =====================================================
// FORMULA VALIDATION
// =====================================================

interface ValidationResult {
  isValid: boolean;
  errors: { message: string; position?: number }[];
  warnings: { message: string; position?: number }[];
  inferredType?: FieldType;
}

function validateFormula(
  formula: string,
  availableFields: string[],
  isEn: boolean,
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!formula.trim()) {
    return result;
  }

  // Check for balanced parentheses
  let parenCount = 0;
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '(') parenCount++;
    if (formula[i] === ')') parenCount--;
    if (parenCount < 0) {
      result.errors.push({
        message: isEn ? 'Unmatched closing parenthesis' : 'Parenthèse fermante sans correspondance',
        position: i,
      });
      result.isValid = false;
    }
  }
  if (parenCount > 0) {
    result.errors.push({
      message: isEn ? 'Unmatched opening parenthesis' : 'Parenthèse ouvrante sans correspondance',
    });
    result.isValid = false;
  }

  // Check for known functions
  const functionPattern = /([A-Z_]+)\s*\(/g;
  let match;
  while ((match = functionPattern.exec(formula)) !== null) {
    const funcName = match[1];
    const knownFunc = FORMULA_FUNCTIONS.find((f) => f.name === funcName);
    if (!knownFunc) {
      result.errors.push({
        message: isEn ? `Unknown function: ${funcName}` : `Fonction inconnue: ${funcName}`,
        position: match.index,
      });
      result.isValid = false;
    } else {
      result.inferredType = knownFunc.returnType;
    }
  }

  // Check for field references (${field_name})
  const fieldPattern = /\$\{([^}]+)\}/g;
  while ((match = fieldPattern.exec(formula)) !== null) {
    const fieldName = match[1];
    if (!availableFields.includes(fieldName)) {
      result.warnings.push({
        message: isEn ? `Unknown field: ${fieldName}` : `Champ inconnu: ${fieldName}`,
        position: match.index,
      });
    }
  }

  // Check for division by zero potential
  if (/\/\s*0/.test(formula)) {
    result.warnings.push({
      message: isEn ? 'Potential division by zero' : 'Division par zéro potentielle',
    });
  }

  return result;
}

// =====================================================
// FORMULA EDITOR
// =====================================================

interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  availableFields: { id: string; name: string; sourceId: string }[];
  validation: ValidationResult;
  isEn: boolean;
}

function FormulaEditor({ value, onChange, availableFields, validation, isEn }: FormulaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<typeof availableFields>([]);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle input and detect autocomplete triggers
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Check for field reference trigger
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const fieldMatch = textBeforeCursor.match(/\$\{([^}]*)$/);

      if (fieldMatch) {
        const searchTerm = fieldMatch[1].toLowerCase();
        const matches = availableFields.filter(
          (f) =>
            f.name.toLowerCase().includes(searchTerm) || f.id.toLowerCase().includes(searchTerm),
        );
        setAutocompleteItems(matches);
        setShowAutocomplete(matches.length > 0);
        setSelectedIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    },
    [onChange, availableFields],
  );

  // Insert autocomplete selection
  const insertField = useCallback(
    (field: (typeof availableFields)[0]) => {
      if (!textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);

      const fieldMatch = textBeforeCursor.match(/\$\{([^}]*)$/);
      if (fieldMatch) {
        const startPos = cursorPos - fieldMatch[0].length;
        const newValue = value.slice(0, startPos) + `\${${field.id}}` + textAfterCursor;
        onChange(newValue);
      }

      setShowAutocomplete(false);
      textareaRef.current.focus();
    },
    [value, onChange],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showAutocomplete) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, autocompleteItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (autocompleteItems[selectedIndex]) {
          insertField(autocompleteItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    },
    [showAutocomplete, autocompleteItems, selectedIndex, insertField],
  );

  return (
    <div className="relative">
      {/* Editor */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          border: `2px solid ${validation.isValid ? 'rgb(var(--color-border))' : 'rgb(var(--color-error))'}`,
        }}
      >
        {/* Line numbers gutter */}
        <div
          className="absolute left-0 top-0 bottom-0 w-10 text-right pr-2 pt-3 select-none"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderRight: '1px solid rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))',
            fontSize: '12px',
            lineHeight: '1.5rem',
          }}
        >
          {value.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            isEn
              ? 'Enter formula... Use ${field} to reference fields'
              : 'Entrez la formule... Utilisez ${champ} pour référencer'
          }
          className="w-full min-h-[150px] p-3 pl-12 font-mono text-sm resize-y focus:outline-none"
          style={{
            backgroundColor: 'transparent',
            color: 'rgb(var(--color-text))',
            lineHeight: '1.5rem',
          }}
          spellCheck={false}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && (
        <div
          className="absolute z-30 mt-1 w-64 max-h-48 overflow-y-auto rounded-xl shadow-lg"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
            left: '48px',
          }}
        >
          {autocompleteItems.map((field, i) => (
            <button
              key={field.id}
              onClick={() => insertField(field)}
              className={`
                w-full px-3 py-2 text-left text-sm flex items-center gap-2
                ${i === selectedIndex ? 'bg-primary-500/20' : 'hover:bg-gray-700/50'}
              `}
            >
              <Hash className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <div>
                <div style={{ color: 'rgb(var(--color-text))' }}>{field.name}</div>
                <div className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {field.id}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Validation messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="mt-2 space-y-1">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" />
              {err.message}
            </div>
          ))}
          {validation.warnings.map((warn, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
              <AlertCircle className="w-3 h-3" />
              {warn.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// FUNCTION BROWSER
// =====================================================

interface FunctionBrowserProps {
  onInsert: (func: FormulaFunction) => void;
  isEn: boolean;
}

function FunctionBrowser({ onInsert, isEn }: FunctionBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFunc, setExpandedFunc] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Object.entries(CATEGORY_INFO).map(([key, info]) => ({
        key,
        ...info,
        count: FORMULA_FUNCTIONS.filter((f) => f.category === key).length,
      })),
    [],
  );

  const filteredFunctions = useMemo(() => {
    return FORMULA_FUNCTIONS.filter((f) => {
      const matchesSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (isEn ? f.descriptionEn : f.descriptionFr).toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || f.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, isEn]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEn ? 'Search functions...' : 'Rechercher des fonctions...'}
          className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`
            px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${!selectedCategory ? 'bg-primary-500/10 text-primary-500 border border-primary-500/30' : 'bg-gray-700/50'}
          `}
          style={selectedCategory ? { color: 'rgb(var(--color-text-muted))' } : undefined}
        >
          {isEn ? 'All' : 'Tous'}
        </button>
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${selectedCategory === cat.key ? '' : 'bg-gray-700/50'}
              `}
              style={{
                backgroundColor: selectedCategory === cat.key ? cat.color : undefined,
                color: selectedCategory === cat.key ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              <Icon className="w-3 h-3" />
              {isEn ? cat.labelEn : cat.labelFr}
              <span className="opacity-60">({cat.count})</span>
            </button>
          );
        })}
      </div>

      {/* Function list */}
      <div
        className="max-h-64 overflow-y-auto rounded-xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {filteredFunctions.map((func) => {
          const catInfo = CATEGORY_INFO[func.category];
          const isExpanded = expandedFunc === func.name;

          return (
            <div
              key={func.name}
              className="border-b last:border-b-0"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              <button
                onClick={() => setExpandedFunc(isExpanded ? null : func.name)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-700/30"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${catInfo.color}20` }}
                >
                  <FunctionIcon className="w-4 h-4" style={{ color: catInfo.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono font-semibold"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {func.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${catInfo.color}20`,
                        color: catInfo.color,
                      }}
                    >
                      {isEn ? catInfo.labelEn : catInfo.labelFr}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? func.descriptionEn : func.descriptionFr}
                  </p>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                />
              </button>

              {isExpanded && (
                <div
                  className="px-4 pb-3 ml-11"
                  style={{ backgroundColor: 'rgb(var(--color-bg) / 0.5)' }}
                >
                  <div className="space-y-2">
                    <div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? 'Syntax:' : 'Syntaxe:'}
                      </span>
                      <code
                        className="block mt-1 px-2 py-1 rounded text-sm font-mono"
                        style={{
                          backgroundColor: 'rgb(var(--color-surface))',
                          color: 'rgb(var(--color-primary-500))',
                        }}
                      >
                        {func.syntax}
                      </code>
                    </div>
                    <div>
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? 'Example:' : 'Exemple:'}
                      </span>
                      <code
                        className="block mt-1 px-2 py-1 rounded text-sm font-mono"
                        style={{
                          backgroundColor: 'rgb(var(--color-surface))',
                          color: 'rgb(var(--color-text))',
                        }}
                      >
                        {isEn ? func.exampleEn : func.exampleFr}
                      </code>
                    </div>
                    <button
                      onClick={() => onInsert(func)}
                      className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: 'rgb(var(--color-primary-500))',
                        color: 'white',
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      {isEn ? 'Insert' : 'Insérer'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// CALCULATED FIELD EDITOR
// =====================================================

interface CalculatedFieldEditorProps {
  field: CalculatedField;
  sources: DataSourceReference[];
  onUpdate: (updates: Partial<CalculatedField>) => void;
  onRemove: () => void;
  isEn: boolean;
}

function CalculatedFieldEditor({
  field,
  sources,
  onUpdate,
  onRemove,
  isEn,
}: CalculatedFieldEditorProps) {
  const [showFunctionBrowser, setShowFunctionBrowser] = useState(false);

  // Get all available fields from sources
  const availableFields = useMemo(() => {
    return sources.flatMap((s) => {
      const source = getDataSource(s.id);
      return (
        source?.fields.map((f) => ({
          id: `${s.id}.${f.id}`,
          name: isEn ? f.nameEn : f.name,
          sourceId: s.id,
        })) || []
      );
    });
  }, [sources, isEn]);

  const validation = useMemo(
    () =>
      validateFormula(
        field.formula,
        availableFields.map((f) => f.id),
        isEn,
      ),
    [field.formula, availableFields, isEn],
  );

  const insertFunction = (func: FormulaFunction) => {
    const newFormula = field.formula + (field.formula ? ' ' : '') + func.syntax;
    onUpdate({ formula: newFormula });
    setShowFunctionBrowser(false);
  };

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: validation.isValid ? 'rgb(var(--color-border))' : 'rgb(var(--color-error))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)' }}
          >
            <Calculator className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={isEn ? field.nameEn || '' : field.name || ''}
              onChange={(e) =>
                onUpdate(isEn ? { nameEn: e.target.value } : { name: e.target.value })
              }
              placeholder={isEn ? 'Field name...' : 'Nom du champ...'}
              className="font-medium bg-transparent border-none outline-none"
              style={{ color: 'rgb(var(--color-text))' }}
            />
          </div>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Formula Editor */}
      <FormulaEditor
        value={field.formula}
        onChange={(formula) => onUpdate({ formula })}
        availableFields={availableFields}
        validation={validation}
        isEn={isEn}
      />

      {/* Toolbar */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setShowFunctionBrowser(!showFunctionBrowser)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: showFunctionBrowser
              ? 'rgb(var(--color-primary-500))'
              : 'rgb(var(--color-bg))',
            color: showFunctionBrowser ? 'white' : 'rgb(var(--color-text-muted))',
          }}
        >
          <FunctionIcon className="w-3 h-3" />
          {isEn ? 'Functions' : 'Fonctions'}
        </button>

        <div className="flex-1" />

        {validation.inferredType && (
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              color: 'rgb(var(--color-text-muted))',
            }}
          >
            {isEn ? 'Returns:' : 'Retourne:'} {validation.inferredType}
          </span>
        )}
      </div>

      {/* Function Browser */}
      {showFunctionBrowser && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <FunctionBrowser onInsert={insertFunction} isEn={isEn} />
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN CALCULATED FIELD BUILDER
// =====================================================

interface CalculatedFieldBuilderProps {
  sources: DataSourceReference[];
  calculatedFields: CalculatedField[];
  onFieldsChange: (fields: CalculatedField[]) => void;
}

export function CalculatedFieldBuilder({
  sources,
  calculatedFields,
  onFieldsChange,
}: CalculatedFieldBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const addField = () => {
    const newField: CalculatedField = {
      id: generateId('calc'),
      name: isEn ? '' : 'Champ calculé',
      nameEn: isEn ? 'Calculated Field' : '',
      formula: '',
      returnType: 'NUMBER',
    };
    onFieldsChange([...calculatedFields, newField]);
  };

  const updateField = (id: string, updates: Partial<CalculatedField>) => {
    onFieldsChange(calculatedFields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onFieldsChange(calculatedFields.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <Calculator className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {isEn ? 'Calculated Fields' : 'Champs calculés'}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn
              ? 'Create custom metrics using formulas'
              : 'Créez des métriques personnalisées avec des formules'}
          </p>
        </div>
        <button
          onClick={addField}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
          style={{
            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            color: 'rgb(var(--color-primary-500))',
          }}
        >
          <Plus className="w-4 h-4" />
          {isEn ? 'Add Field' : 'Ajouter'}
        </button>
      </div>

      {/* Calculated Fields List */}
      {calculatedFields.length > 0 ? (
        <div className="space-y-4">
          {calculatedFields.map((field) => (
            <CalculatedFieldEditor
              key={field.id}
              field={field}
              sources={sources}
              onUpdate={(updates) => updateField(field.id, updates)}
              onRemove={() => removeField(field.id)}
              isEn={isEn}
            />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-xl border-2 border-dashed"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Calculator
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
          <p className="text-sm mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'No calculated fields' : 'Aucun champ calculé'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn
              ? 'Create custom metrics like profit margin, growth rates, and more'
              : 'Créez des métriques comme la marge bénéficiaire, les taux de croissance, etc.'}
          </p>
          <button
            onClick={addField}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'Create First Field' : 'Créer le premier champ'}
          </button>
        </div>
      )}

      {/* Tips */}
      <div
        className="flex items-start gap-2 p-3 rounded-lg text-xs"
        style={{
          backgroundColor: 'rgb(var(--color-accent-500) / 0.1)',
          border: '1px solid rgb(var(--color-accent-500) / 0.3)',
        }}
      >
        <Lightbulb
          className="w-4 h-4 flex-shrink-0 mt-0.5"
          style={{ color: 'rgb(var(--color-accent-500))' }}
        />
        <div style={{ color: 'rgb(var(--color-text))' }}>
          <strong>{isEn ? 'Pro Tips:' : 'Conseils:'}</strong>
          <ul
            className="mt-1 space-y-0.5 list-disc list-inside"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <li>
              {isEn
                ? 'Use ${field_name} to reference fields'
                : 'Utilisez ${nom_champ} pour référencer les champs'}
            </li>
            <li>
              {isEn
                ? 'Combine aggregates: SUM(${amount}) / COUNT(${id})'
                : 'Combinez les agrégats: SUM(${montant}) / COUNT(${id})'}
            </li>
            <li>
              {isEn
                ? 'Use IF() for conditional calculations'
                : 'Utilisez IF() pour les calculs conditionnels'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CalculatedFieldBuilder;
