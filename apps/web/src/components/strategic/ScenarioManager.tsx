/**
 * Scenario Manager Component - Linear/Notion Inspired
 * 
 * Clean dropdown-based scenario management with:
 * - Compact toggle button showing current scenario
 * - Dropdown for switching scenarios
 * - Inline actions for duplicate/delete
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, Check, ChevronDown, MoreHorizontal, Layers, Edit2, X } from 'lucide-react';
import { type FinancialModel } from '../../lib/financialModel';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  color: string;
  isBase: boolean;
}

interface ScenarioManagerProps {
  model: FinancialModel;
  onModelUpdate: (model: FinancialModel) => void;
  isEn: boolean;
}

const DEFAULT_SCENARIOS: Omit<Scenario, 'id'>[] = [
  { name: 'Base Case', description: 'Most likely outcome', color: '#3B82F6', isBase: true },
  { name: 'Best Case', description: 'Optimistic scenario', color: '#10B981', isBase: false },
  { name: 'Worst Case', description: 'Pessimistic scenario', color: '#EF4444', isBase: false },
];

const SCENARIO_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
];

export default function ScenarioManager({ model, onModelUpdate, isEn }: ScenarioManagerProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const stored = localStorage.getItem('plainledger-scenarios');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SCENARIOS.map((s, i) => ({ ...s, id: `scenario-${i}` }));
      }
    }
    return DEFAULT_SCENARIOS.map((s, i) => ({ ...s, id: `scenario-${i}` }));
  });

  const [activeScenario, setActiveScenario] = useState<string>(() => {
    return scenarios.find(s => s.isBase)?.id || scenarios[0]?.id || '';
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeScenarioData = useMemo(() => {
    return scenarios.find(s => s.id === activeScenario);
  }, [scenarios, activeScenario]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setEditingId(null);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const saveScenarios = (updated: Scenario[]) => {
    setScenarios(updated);
    localStorage.setItem('plainledger-scenarios', JSON.stringify(updated));
  };

  const handleCreateScenario = () => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: isEn ? 'New Scenario' : 'Nouveau scénario',
      color: SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length].value,
      isBase: false,
    };
    const updated = [...scenarios, newScenario];
    saveScenarios(updated);
    setActiveScenario(newScenario.id);
    setEditingId(newScenario.id);
    setEditingName(newScenario.name);
  };

  const handleDuplicateScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) return;

    const newScenario: Scenario = {
      ...scenario,
      id: `scenario-${Date.now()}`,
      name: `${scenario.name} (Copy)`,
      isBase: false,
    };
    const updated = [...scenarios, newScenario];
    saveScenarios(updated);
    setActiveScenario(newScenario.id);
  };

  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const scenario = scenarios.find(s => s.id === id);
    if (scenario?.isBase) return;

    const updated = scenarios.filter(s => s.id !== id);
    saveScenarios(updated);
    
    if (activeScenario === id) {
      setActiveScenario(updated.find(s => s.isBase)?.id || updated[0]?.id || '');
    }
  };

  const handleRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      const updated = scenarios.map(s => 
        s.id === id ? { ...s, name: trimmed } : s
      );
      saveScenarios(updated);
    }
    setEditingId(null);
    setEditingName('');
  };

  const startEditing = (scenario: Scenario, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(scenario.id);
    setEditingName(scenario.name);
  };

  const handleSelectScenario = (id: string) => {
    setActiveScenario(id);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
      {/* Scenario Label */}
      <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
        <Layers className="w-4 h-4" />
        <span className="font-medium">{isEn ? 'Scenarios' : 'Scénarios'}</span>
      </div>

      {/* Scenario Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-gray-50 border"
          style={{
            backgroundColor: activeScenarioData ? `${activeScenarioData.color}08` : 'white',
            borderColor: activeScenarioData?.color || '#E5E7EB',
            color: activeScenarioData?.color || '#374151',
          }}
        >
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeScenarioData?.color || '#6B7280' }}
          />
          <span>{activeScenarioData?.name || (isEn ? 'Select scenario' : 'Sélectionner')}</span>
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            style={{ color: '#9CA3AF' }}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div 
            className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
            style={{
              boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {isEn ? 'Switch scenario' : 'Changer de scénario'}
              </span>
            </div>

            {/* Scenario List */}
            <div className="max-h-64 overflow-y-auto py-1">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(scenario.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {editingId === scenario.id ? (
                    <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: '#EFF6FF' }}>
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: scenario.color }}
                      />
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(scenario.id);
                          if (e.key === 'Escape') {
                            setEditingId(null);
                            setEditingName('');
                          }
                        }}
                        onBlur={() => handleRename(scenario.id)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-blue-300 outline-none focus:ring-2 focus:ring-blue-200"
                        style={{ 
                          color: '#111827',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                      <button
                        onClick={() => handleRename(scenario.id)}
                        className="p-1 rounded hover:bg-blue-100"
                        title={isEn ? 'Save' : 'Enregistrer'}
                      >
                        <Check className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingName('');
                        }}
                        className="p-1 rounded hover:bg-gray-200"
                        title={isEn ? 'Cancel' : 'Annuler'}
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectScenario(scenario.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        activeScenario === scenario.id 
                          ? 'bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Color Indicator */}
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: scenario.color }}
                      />
                      
                      {/* Scenario Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-sm font-medium truncate"
                            style={{ color: '#111827' }}
                          >
                            {scenario.name}
                          </span>
                          {scenario.isBase && (
                            <span 
                              className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600"
                            >
                              {isEn ? 'Default' : 'Défaut'}
                            </span>
                          )}
                        </div>
                        {scenario.description && (
                          <span className="text-xs text-gray-500 truncate block">
                            {scenario.description}
                          </span>
                        )}
                      </div>

                      {/* Check Mark for Active */}
                      {activeScenario === scenario.id && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}

                      {/* Actions (visible on hover) */}
                      {hoveredId === scenario.id && activeScenario !== scenario.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => startEditing(scenario, e)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isEn ? 'Rename' : 'Renommer'}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateScenario(scenario.id, e)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                            title={isEn ? 'Duplicate' : 'Dupliquer'}
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          {!scenario.isBase && (
                            <button
                              onClick={(e) => handleDeleteScenario(scenario.id, e)}
                              className="p-1 rounded hover:bg-red-100 transition-colors"
                              title={isEn ? 'Delete' : 'Supprimer'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer - Add New */}
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={handleCreateScenario}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{isEn ? 'Create new scenario' : 'Créer un nouveau scénario'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions for Active Scenario */}
      {activeScenarioData && (
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={(e) => startEditing(activeScenarioData, e)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={isEn ? 'Rename scenario' : 'Renommer le scénario'}
            style={{ color: '#6B7280' }}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => handleDuplicateScenario(activeScenario, e)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={isEn ? 'Duplicate scenario' : 'Dupliquer le scénario'}
            style={{ color: '#6B7280' }}
          >
            <Copy className="w-4 h-4" />
          </button>
          {!activeScenarioData.isBase && (
            <button
              onClick={(e) => handleDeleteScenario(activeScenario, e)}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title={isEn ? 'Delete scenario' : 'Supprimer le scénario'}
              style={{ color: '#EF4444' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
