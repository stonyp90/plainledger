/**
 * Scenario Comparison Component
 * 
 * Side-by-side comparison of multiple scenarios with drag-and-drop reordering
 */

import { useState, useRef } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, GripVertical, Copy, Check } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Scenario, RunwayAnalysis, CashForecast } from '../../lib/strategicPlanning';
import { ChartTooltip } from '../charts/ChartTooltip';

interface ScenarioComparisonProps {
  scenarios: Array<{
    scenario: Scenario;
    runway: RunwayAnalysis;
    forecast: CashForecast;
  }>;
  baseScenarioId: string;
  onSetBase?: (scenarioId: string) => void;
  onReorder?: (scenarioIds: string[]) => void;
  onDuplicate?: (scenarioId: string) => void;
  maxScenarios?: number;
}

// Get theme-aware scenario colors
const getScenarioColor = (type: Scenario['type']): string => {
  const colorMap: Record<Scenario['type'], [string, string]> = {
    base: ['--color-primary-500', '#3B82F6'],
    optimistic: ['--color-success', '#10B981'],
    pessimistic: ['--color-error', '#EF4444'],
    custom: ['--color-primary-600', '#8B5CF6'],
  };
  const [varName, fallback] = colorMap[type];
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || fallback;
  }
  return fallback;
};

export default function ScenarioComparison({
  scenarios,
  baseScenarioId,
  onSetBase,
  onReorder,
  onDuplicate,
  maxScenarios = 4,
}: ScenarioComparisonProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [draggedScenarioId, setDraggedScenarioId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef<number>(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDragStart = (e: React.DragEvent | React.TouchEvent, scenarioId: string, index: number) => {
    setDraggedScenarioId(scenarioId);
    dragStartPos.current = index;
    
    if ('dataTransfer' in e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', scenarioId);
    }
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'scale(0.95)';
    }
  };

  const handleDragEnd = (e: React.DragEvent | React.TouchEvent) => {
    setDraggedScenarioId(null);
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  const handleDragOver = (e: React.DragEvent | React.TouchEvent, index: number) => {
    e.preventDefault();
    if ('dataTransfer' in e && e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedScenarioId && index !== dragStartPos.current) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent | React.TouchEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedScenarioId || !onReorder) return;

    const currentOrder = scenarios.map(s => s.scenario.id);
    const draggedIndex = currentOrder.indexOf(draggedScenarioId);
    
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedScenarioId(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder scenarios
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, removed);
    
    onReorder(newOrder);
    setDraggedScenarioId(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, scenarioId: string, index: number) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    handleDragStart(e, scenarioId, index);
  };

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    if (touchStartY === null) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    
    // Determine drop index based on touch position
    if (Math.abs(deltaY) > 50) {
      const cardHeight = 200; // Approximate card height
      const newIndex = Math.round(deltaY / cardHeight) + index;
      if (newIndex >= 0 && newIndex < scenarios.length && newIndex !== index) {
        handleDragOver(e, newIndex);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, index: number) => {
    if (touchStartY !== null) {
      handleDrop(e, index);
      handleDragEnd(e);
      setTouchStartY(null);
    }
  };

  // Find base scenario for comparison
  const baseScenario = scenarios.find(s => s.scenario.id === baseScenarioId) || scenarios[0];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Scenario Comparison' : 'Comparaison des scénarios'}
        </h3>
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Tap & drag to reorder' : 'Appuyer et glisser pour réordonner'}
        </span>
      </div>

      {/* Scenario Cards - Horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 touch-pan-x" style={{ 
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch',
      }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-[280px] sm:min-w-0">
        {scenarios.slice(0, maxScenarios).map((scenarioData, index) => {
          const { scenario, runway, forecast } = scenarioData;
          const isBase = scenario.id === baseScenarioId;
          const isDragged = draggedScenarioId === scenario.id;
          const isDragOver = dragOverIndex === index;
          const isHovered = hoveredScenario === scenario.id;

          return (
            <div
              key={scenario.id}
              draggable={!!onReorder}
              onDragStart={(e) => onReorder && handleDragStart(e, scenario.id, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => onReorder && handleDragOver(e, index)}
              onDrop={(e) => onReorder && handleDrop(e, index)}
              onDragLeave={handleDragLeave}
              onTouchStart={(e) => onReorder && handleTouchStart(e, scenario.id, index)}
              onTouchMove={(e) => onReorder && handleTouchMove(e, index)}
              onTouchEnd={(e) => onReorder && handleTouchEnd(e, index)}
              onMouseEnter={(e) => {
                setHoveredScenario(scenario.id);
                setTooltipPosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredScenario(null)}
              className={`card p-3 sm:p-4 transition-all relative touch-manipulation ${
                onReorder ? 'cursor-move active:scale-[0.98]' : ''
              } ${
                isDragged ? 'opacity-50 scale-95' : ''
              } ${
                isDragOver ? 'ring-2 scale-105' : ''
              } ${
                isBase ? 'ring-2' : ''
              }`}
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: isBase ? getScenarioColor(scenario.type) : 'rgb(var(--color-border))',
                backgroundColor: isDragOver ? 'rgb(var(--color-primary-500) / 0.05)' : undefined,
                minWidth: '280px',
              }}
            >
              {/* Drag Handle */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: getScenarioColor(scenario.type) }}
                    />
                    <h4 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? scenario.nameEn : scenario.name}
                    </h4>
                    {isBase && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ 
                        backgroundColor: getScenarioColor(scenario.type) + '20',
                        color: getScenarioColor(scenario.type),
                      }}>
                        {isEn ? 'Base' : 'Base'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs capitalize" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {scenario.type}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-2">
                {/* Runway */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Runway' : 'Autonomie'}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {runway.runwayMonths.toFixed(1)} {isEn ? 'mo' : 'mois'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden shadow-inner" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                    <div
                      className="h-full transition-all rounded-full"
                      style={{
                        width: `${Math.min(100, (runway.runwayMonths / 24) * 100)}%`,
                        backgroundColor: getScenarioColor(scenario.type),
                        boxShadow: `0 2px 4px ${getScenarioColor(scenario.type)}40`,
                      }}
                    />
                  </div>
                </div>

                {/* Monthly Burn */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Monthly Burn' : 'Brûlage mensuel'}
                  </span>
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-error))' }}>
                    {formatCurrency(runway.monthlyBurnRate)}
                  </span>
                </div>

                {/* Cash at 6 months */}
                {forecast.projected[5] && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Cash @ 6mo' : 'Trésorerie @ 6mo'}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {formatCurrency(forecast.projected[5].cash)}
                    </span>
                  </div>
                )}

                {/* Variance from base */}
                {!isBase && (
                  <div className="pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'vs Base' : 'vs Base'}
                      </span>
                      <div className="flex items-center gap-1">
                        {runway.runwayMonths > baseScenario.runway.runwayMonths ? (
                          <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                        ) : (
                          <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--color-error))' }} />
                        )}
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: runway.runwayMonths > baseScenario.runway.runwayMonths
                              ? 'rgb(var(--color-success))'
                              : 'rgb(var(--color-error))',
                          }}
                        >
                          {runway.runwayMonths > baseScenario.runway.runwayMonths ? '+' : ''}
                          {(runway.runwayMonths - baseScenario.runway.runwayMonths).toFixed(1)} {isEn ? 'mo' : 'mois'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                {!isBase && onSetBase && (
                  <button
                    onClick={() => onSetBase(scenario.id)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                      color: 'rgb(var(--color-primary-500))',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500) / 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-500) / 0.1)';
                    }}
                  >
                    {isEn ? 'Set Base' : 'Définir base'}
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={() => onDuplicate(scenario.id)}
                    className="p-1.5 rounded transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                    title={isEn ? 'Duplicate scenario' : 'Dupliquer le scénario'}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tooltip */}
              {isHovered && (
                <ChartTooltip visible={true} position={tooltipPosition}>
                  <div className="min-w-[200px]">
                    <p className="text-white font-medium mb-2">{isEn ? scenario.nameEn : scenario.name}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{isEn ? 'Initiatives' : 'Initiatives'}</span>
                        <span className="text-gray-300">{scenario.initiatives.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{isEn ? 'Assumptions' : 'Hypothèses'}</span>
                        <span className="text-gray-300">{scenario.assumptions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{isEn ? 'Confidence' : 'Confiance'}</span>
                        <span className="text-gray-300">{runway.confidenceLevel.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs" style={{ 
                      borderColor: 'rgba(255,255,255,0.2)',
                      color: 'rgb(var(--color-primary-400))',
                    }}>
                      {isEn ? 'Drag to reorder • Click to set as base' : 'Glisser pour réordonner • Cliquer pour définir comme base'}
                    </div>
                  </div>
                </ChartTooltip>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="card p-4 sm:p-6">
        <h4 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'Cash Forecast Comparison' : 'Comparaison des prévisions de trésorerie'}
        </h4>
        <div className="h-48 sm:h-64 relative overflow-x-auto touch-pan-x" style={{ 
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div className="relative min-w-[600px] sm:min-w-0 h-full">
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={200 - y * 2}
                x2="800"
                y2={200 - y * 2}
                stroke="rgb(var(--color-border))"
                strokeWidth="0.5"
                strokeDasharray="4,4"
                opacity="0.5"
              />
            ))}

            {/* Scenario lines */}
            {scenarios.slice(0, maxScenarios).map((scenarioData, index) => {
              const { scenario, forecast } = scenarioData;
              const color = getScenarioColor(scenario.type);
              const points = forecast.projected.slice(0, 12).map((point, i) => ({
                x: (i / 11) * 800,
                y: 200 - (point.cash / Math.max(...forecast.projected.map(p => p.cash), 1)) * 180,
                cash: point.cash,
              }));

              const pathData = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

              return (
                <g key={scenario.id}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray={scenario.type === 'base' ? 'none' : '5,5'}
                    opacity={scenario.id === baseScenarioId ? 1 : 0.7}
                  />
                  {points.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill={color}
                      opacity={scenario.id === baseScenarioId ? 1 : 0.7}
                    />
                  ))}
                </g>
              );
            })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 sm:gap-4 pt-2 px-2">
            {scenarios.slice(0, maxScenarios).map((scenarioData) => {
              const { scenario } = scenarioData;
              const isBase = scenario.id === baseScenarioId;
              const color = getScenarioColor(scenario.type);
              return (
                <div key={scenario.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? scenario.nameEn : scenario.name}
                  </span>
                  {isBase && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                      backgroundColor: color + '20',
                      color: color,
                    }}>
                      Base
                    </span>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
