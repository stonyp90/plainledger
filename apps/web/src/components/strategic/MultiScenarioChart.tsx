/**
 * Multi-Scenario Chart Component
 * 
 * Shows Base, Optimistic, and Pessimistic scenarios on the same chart
 * Similar to Runway.com style planning visualization
 */

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Scenario, CashForecast, calculateCashForecast } from '../../lib/strategicPlanning';
import { ChartDataState } from '../charts/ChartDataState';
import { chartExtent } from '../../lib/chartDataValidation';

interface MultiScenarioChartProps {
  scenarios: Scenario[];
  currentCash: number;
  currentDate: Date;
  months?: number;
  onScenarioSelect?: (scenario: Scenario) => void;
  activeScenarioId?: string | null;
}

interface ScenarioData {
  scenario: Scenario;
  forecast: CashForecast;
  color: string;
  visible: boolean;
}

const SCENARIO_COLORS: Record<string, string> = {
  base: '#3B82F6',      // Blue
  optimistic: '#10B981', // Green
  pessimistic: '#EF4444', // Red
  default: '#8B5CF6',    // Purple for custom scenarios
};

export default function MultiScenarioChart({
  scenarios,
  currentCash,
  currentDate,
  months = 24,
  onScenarioSelect,
  activeScenarioId,
}: MultiScenarioChartProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [hiddenScenarios, setHiddenScenarios] = useState<Set<string>>(new Set());
  const [hoveredPoint, setHoveredPoint] = useState<{
    scenarioId: string;
    index: number;
    x: number;
    y: number;
  } | null>(null);

  // Forecast math is independent of legend toggles; new scenarios are visible by default.
  const calculation = useMemo(() => {
    try {
      if (!Array.isArray(scenarios) || new Set(scenarios.map(s => s?.id)).size !== scenarios.length) throw new Error('Invalid scenarios');
      const data = scenarios.map(scenario => {
        if (!scenario || typeof scenario.name !== 'string' || !scenario.id) throw new Error('Invalid scenario');
        const forecast = calculateCashForecast(currentCash, currentDate, scenario.initiatives, scenario.assumptions, months);
        const color = SCENARIO_COLORS[scenario.type] || SCENARIO_COLORS.default;
        return { scenario, forecast, color };
      });
      return { data, invalid: false };
    } catch {
      return { data: [], invalid: true };
    }
  }, [scenarios, currentCash, currentDate, months]);
  const scenarioData: ScenarioData[] = useMemo(() => calculation.data.map(data => ({
    ...data, visible: !hiddenScenarios.has(data.scenario.id),
  })), [calculation.data, hiddenScenarios]);

  // Calculate chart dimensions
  const chartData = useMemo(() => {
    const values = [currentCash, 0];
    scenarioData.forEach(sd => {
      if (!sd.visible) return;
      sd.forecast.historical.forEach(p => values.push(p.cash));
      sd.forecast.projected.forEach(p => {
        const uncertainty = Math.abs(p.cash) * (1 - p.confidence) / 2;
        values.push(p.cash - uncertainty, p.cash + uncertainty);
      });
    });
    const { min: minCash, max: maxCash } = chartExtent(values);
    return { maxCash, minCash, range: maxCash - minCash || 1 };
  }, [scenarioData, currentCash]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
      month: 'short',
      year: '2-digit',
    });
  };

  const toggleScenario = (id: string) => {
    setHiddenScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get all unique dates for x-axis
  const allDates = useMemo(() => {
    const dates = new Set<string>();
    scenarioData.forEach(sd => {
      sd.forecast.historical.forEach(p => dates.add(p.date));
      sd.forecast.projected.forEach(p => dates.add(p.date));
    });
    return Array.from(dates).sort();
  }, [scenarioData]);

  const dateIndices = useMemo(() => new Map(allDates.map((date, index) => [date, index])), [allDates]);

  const getPointPosition = (cash: number, dateIndex: number) => {
    const x = (allDates.length === 1 ? 50 : (dateIndex / (allDates.length - 1)) * 100);
    const y = 100 - ((cash - chartData.minCash) / chartData.range) * 90;
    return { x, y };
  };

  if (calculation.invalid || !Number.isFinite(chartData.range) || !Number.isFinite(chartData.maxCash)) {
    return <ChartDataState title={isEn ? 'Scenario Comparison' : 'Comparaison des scénarios'} issue="invalid" isEn={isEn} />;
  }
  if (scenarioData.length === 0 || allDates.length === 0) {
    return <ChartDataState title={isEn ? 'Scenario Comparison' : 'Comparaison des scénarios'} issue="empty" isEn={isEn} />;
  }

  return (
    <div className="card p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Scenario Comparison' : 'Comparaison des scénarios'}
          </h3>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Cash projections across all scenarios' : 'Projections de trésorerie pour tous les scénarios'}
          </p>
        </div>
      </div>

      {/* Scenario Toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {scenarioData.map(sd => (
          <button
            key={sd.scenario.id}
            onClick={() => toggleScenario(sd.scenario.id)}
            aria-pressed={sd.visible}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeScenarioId === sd.scenario.id ? 'ring-2 ring-offset-2' : ''
            }`}
            style={{
              backgroundColor: sd.visible ? `${sd.color}20` : 'rgb(var(--color-bg-muted))',
              color: sd.visible ? sd.color : 'rgb(var(--color-text-muted))',
              borderColor: sd.color,
              border: `1px solid ${sd.visible ? sd.color : 'transparent'}`,
              boxShadow: activeScenarioId === sd.scenario.id ? `0 0 0 2px ${sd.color}` : undefined,
            }}
          >
            {sd.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isEn ? sd.scenario.nameEn : sd.scenario.name}</span>
            {sd.forecast.breakEvenDate && (
              <Target className="w-3 h-3 ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: '300px' }}>
        {scenarioData.every(item => !item.visible) && (
          <p role="status" className="absolute inset-0 z-10 flex items-center justify-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Select a scenario to display its projection.' : 'Sélectionnez un scénario pour afficher sa projection.'}
          </p>
        )}
        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Grid */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.2"
              strokeDasharray="1,1"
              opacity="0.5"
            />
          ))}

          {/* Zero line if applicable */}
          {chartData.minCash < 0 && (
            <line
              x1="0"
              y1={100 - ((0 - chartData.minCash) / chartData.range) * 90}
              x2="100"
              y2={100 - ((0 - chartData.minCash) / chartData.range) * 90}
              stroke="rgb(var(--color-error))"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
          )}

          {/* Historical divider */}
          {allDates.length > 1 && scenarioData[0]?.forecast.historical.length > 0 && (
            <line
              x1={((scenarioData[0].forecast.historical.length - 1) / (allDates.length - 1)) * 100}
              y1="0"
              x2={((scenarioData[0].forecast.historical.length - 1) / (allDates.length - 1)) * 100}
              y2="100"
              stroke="rgb(var(--color-border))"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
          )}

          {/* Scenario lines */}
          {scenarioData.map(sd => {
            if (!sd.visible) return null;
            
            const historicalPath = sd.forecast.historical.map((p, i) => {
              const dateIndex = (dateIndices.get(p.date) ?? 0);
              const { x, y } = getPointPosition(p.cash, dateIndex);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');

            const projectedPath = sd.forecast.projected.map((p, i) => {
              const dateIndex = (dateIndices.get(p.date) ?? 0);
              const { x, y } = getPointPosition(p.cash, dateIndex);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');

            // Confidence band for projected
            const projectedPoints = sd.forecast.projected.map(p => {
              const dateIndex = (dateIndices.get(p.date) ?? 0);
              const pos = getPointPosition(p.cash, dateIndex);
              const confidenceRange = (Math.abs(p.cash) * (1 - p.confidence)) / 2;
              const upperY = 100 - ((p.cash + confidenceRange - chartData.minCash) / chartData.range) * 90;
              const lowerY = 100 - ((p.cash - confidenceRange - chartData.minCash) / chartData.range) * 90;
              return { x: pos.x, upperY, lowerY };
            });

            const upperPath = projectedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.upperY}`).join(' ');
            const lowerPath = projectedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.lowerY}`).join(' ');
            const bandPath = `${upperPath} ${projectedPoints.slice().reverse().map((p, i) => `L ${p.x} ${p.lowerY}`).join(' ')} Z`;

            return (
              <g key={sd.scenario.id}>
                {/* Confidence band */}
                {projectedPoints.length > 1 && (
                  <path
                    d={bandPath}
                    fill={sd.color}
                    fillOpacity="0.1"
                  />
                )}

                {/* Historical line (solid) */}
                {sd.forecast.historical.length > 1 && (
                  <path
                    d={historicalPath}
                    fill="none"
                    stroke={sd.color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Projected line (dashed) */}
                {sd.forecast.projected.length > 1 && (
                  <path
                    d={projectedPath}
                    fill="none"
                    stroke={sd.color}
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                    strokeLinecap="round"
                  />
                )}

                {/* Break-even marker */}
                {sd.forecast.breakEvenDate && (() => {
                  const point = sd.forecast.projected.find(p => p.date === sd.forecast.breakEvenDate);
                  if (!point) return null;
                  const dateIndex = (dateIndices.get(point.date) ?? 0);
                  const { x, y } = getPointPosition(point.cash, dateIndex);
                  return (
                    <circle
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill={sd.color}
                      stroke="white"
                      strokeWidth="0.3"
                    />
                  );
                })()}

                {/* Interactive points */}
                {[...sd.forecast.historical, ...sd.forecast.projected].map((p, i, points) => {
                  if (i % Math.max(1, Math.ceil(points.length / 150)) !== 0 && i !== points.length - 1 && i !== hoveredPoint?.index) return null;
                  const dateIndex = (dateIndices.get(p.date) ?? 0);
                  const { x, y } = getPointPosition(p.cash, dateIndex);
                  const isHovered = hoveredPoint?.scenarioId === sd.scenario.id && hoveredPoint?.index === i;
                  
                  return (
                    <circle
                      key={`${sd.scenario.id}-${i}`}
                      cx={x}
                      cy={y}
                      r={isHovered ? "1.2" : "0.8"}
                      fill={isHovered ? sd.color : 'transparent'}
                      stroke={sd.color}
                      strokeWidth="0.2"
                      className="cursor-pointer"
                      style={{ transition: 'all 0.15s' }}
                      onMouseEnter={(e) => setHoveredPoint({
                        scenarioId: sd.scenario.id,
                        index: i,
                        x: e.clientX,
                        y: e.clientY,
                      })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => onScenarioSelect?.(sd.scenario)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] -ml-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span>{formatCurrency(chartData.maxCash)}</span>
          <span>{formatCurrency((chartData.maxCash + chartData.minCash) / 2)}</span>
          <span>{formatCurrency(chartData.minCash)}</span>
        </div>

        {/* Tooltip */}
        {hoveredPoint && (() => {
          const sd = scenarioData.find(s => s.scenario.id === hoveredPoint.scenarioId);
          if (!sd) return null;
          const allPoints = [...sd.forecast.historical, ...sd.forecast.projected];
          const point = allPoints[hoveredPoint.index];
          if (!point) return null;
          const isProjected = hoveredPoint.index >= sd.forecast.historical.length;

          return (
            <div
              className="fixed z-50 px-3 py-2 rounded-lg shadow-xl text-xs"
              style={{
                left: hoveredPoint.x + 10,
                top: hoveredPoint.y - 10,
                backgroundColor: 'rgb(30, 30, 30)',
                border: `1px solid ${sd.color}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-gray-700">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sd.color }} />
                <span className="font-medium text-white">{isEn ? sd.scenario.nameEn : sd.scenario.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{formatDate(point.date)}</span>
                  {isProjected && <span style={{ color: sd.color }}>{isEn ? 'Projected' : 'Projeté'}</span>}
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">{isEn ? 'Cash' : 'Trésorerie'}</span>
                  <span className="text-white font-semibold">{formatCurrency(point.cash)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-[10px] px-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {allDates.filter((_, i) => i % Math.ceil(allDates.length / 8) === 0).map((date, i) => (
          <span key={i}>{formatDate(date)}</span>
        ))}
      </div>

      {/* Legend / Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        {scenarioData.filter(sd => sd.visible).map(sd => {
          const lastProjected = sd.forecast.projected[sd.forecast.projected.length - 1];
          const runway = sd.forecast.projected.findIndex(p => p.cash <= 0);
          
          return (
            <div 
              key={sd.scenario.id}
              className="p-3 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: `${sd.color}10`,
                border: activeScenarioId === sd.scenario.id ? `2px solid ${sd.color}` : '1px solid transparent',
              }}
              onClick={() => onScenarioSelect?.(sd.scenario)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sd.color }} />
                <span className="text-xs font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? sd.scenario.nameEn : sd.scenario.name}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'End Cash' : 'Tréso. finale'}</span>
                  <span style={{ color: lastProjected && lastProjected.cash < 0 ? 'rgb(var(--color-error))' : sd.color }}>
                    {lastProjected ? formatCurrency(lastProjected.cash) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Runway' : 'Autonomie'}</span>
                  <span style={{ color: runway > 0 && runway < 12 ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))' }}>
                    {runway < 0 ? `>${months} ${isEn ? 'mo' : 'mois'}` : `${runway + 1} ${isEn ? 'mo' : 'mois'}`}
                  </span>
                </div>
                {sd.forecast.breakEvenDate && (
                  <div className="flex items-center gap-1 pt-1">
                    <Target className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                    <span style={{ color: 'rgb(var(--color-success))' }}>
                      {formatDate(sd.forecast.breakEvenDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
