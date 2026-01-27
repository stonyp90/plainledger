/**
 * Scenario Manager Component
 * 
 * Enterprise feature for managing multiple financial scenarios (Base, Best Case, Worst Case)
 */

import { useState, useMemo } from 'react';
import { Plus, Copy, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

  const activeScenarioData = useMemo(() => {
    return scenarios.find(s => s.id === activeScenario);
  }, [scenarios, activeScenario]);

  const handleCreateScenario = () => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name: isEn ? 'New Scenario' : 'Nouveau scénario',
      color: '#8B5CF6',
      isBase: false,
    };
    const updated = [...scenarios, newScenario];
    setScenarios(updated);
    localStorage.setItem('plainledger-scenarios', JSON.stringify(updated));
    setActiveScenario(newScenario.id);
  };

  const handleDuplicateScenario = (id: string) => {
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) return;

    const newScenario: Scenario = {
      ...scenario,
      id: `scenario-${Date.now()}`,
      name: `${scenario.name} (Copy)`,
      isBase: false,
    };
    const updated = [...scenarios, newScenario];
    setScenarios(updated);
    localStorage.setItem('plainledger-scenarios', JSON.stringify(updated));
  };

  const handleDeleteScenario = (id: string) => {
    const scenario = scenarios.find(s => s.id === id);
    if (scenario?.isBase) return; // Can't delete base scenario

    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    localStorage.setItem('plainledger-scenarios', JSON.stringify(updated));
    
    if (activeScenario === id) {
      setActiveScenario(updated[0]?.id || '');
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#374151' }}>
        {isEn ? 'Scenarios:' : 'Scénarios:'}
      </div>
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setActiveScenario(scenario.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeScenario === scenario.id
                ? 'shadow-sm'
                : 'hover:bg-gray-100'
            }`}
            style={{
              backgroundColor: activeScenario === scenario.id ? scenario.color + '15' : 'transparent',
              color: activeScenario === scenario.id ? scenario.color : '#6B7280',
              border: activeScenario === scenario.id ? `2px solid ${scenario.color}` : '2px solid transparent',
            }}
          >
            {scenario.isBase && <Minus className="w-3 h-3" />}
            {scenario.name}
            {activeScenario === scenario.id && (
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scenario.color }} />
            )}
          </button>
        ))}
        <button
          onClick={handleCreateScenario}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
          title={isEn ? 'Create new scenario' : 'Créer un scénario'}
        >
          <Plus className="w-4 h-4" />
          {isEn ? 'New' : 'Nouveau'}
        </button>
      </div>
      {activeScenarioData && !activeScenarioData.isBase && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDuplicateScenario(activeScenario)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title={isEn ? 'Duplicate scenario' : 'Dupliquer'}
            style={{ color: '#6B7280' }}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteScenario(activeScenario)}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title={isEn ? 'Delete scenario' : 'Supprimer'}
            style={{ color: '#EF4444' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
