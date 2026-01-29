/**
 * AI Query Assistant Component
 * Natural language interface for accountants to query financial data
 * Enhanced with Decision Context for learning from past decisions
 */

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  Table,
  LineChart,
  Activity,
  X,
  ChevronRight,
  MessageSquare,
  Lightbulb,
  History,
  Target,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { queryEngine, type QueryResult } from '../lib/nlq/QueryEngine';
import type { DecisionEvent } from '../lib/decisionContext';

// =====================================================
// TYPES
// =====================================================

interface QueryHistoryItem {
  id: string;
  query: string;
  result: QueryResult;
  timestamp: Date;
}

interface AIQueryAssistantProps {
  onClose?: () => void;
  isModal?: boolean;
  /** Recent decisions for context-aware suggestions */
  recentDecisions?: DecisionEvent[];
  /** Current industry for context-aware suggestions */
  industry?: string;
}

// =====================================================
// SUGGESTED QUERIES
// =====================================================

const SUGGESTED_QUERIES = {
  en: [
    { text: "Show me revenue trend for the last 12 months", icon: LineChart },
    { text: "How does cash compare to last month?", icon: BarChart2 },
    { text: "What's the breakdown of expenses?", icon: PieChart },
    { text: "Show top 5 accounts by variance", icon: TrendingUp },
    { text: "What anomalies were detected?", icon: Activity },
    { text: "What are our current financial ratios?", icon: Table },
  ],
  fr: [
    { text: "Montre-moi l'évolution des revenus sur 12 mois", icon: LineChart },
    { text: "Comment se compare l'encaisse au mois dernier?", icon: BarChart2 },
    { text: "Quelle est la répartition des dépenses?", icon: PieChart },
    { text: "Affiche les 5 comptes avec les plus grandes variances", icon: TrendingUp },
    { text: "Quelles anomalies ont été détectées?", icon: Activity },
    { text: "Quels sont nos ratios financiers actuels?", icon: Table },
  ],
};

const DECISION_QUERIES = {
  en: [
    { text: "Show my recent decisions", icon: Target },
    { text: "How did my decisions perform?", icon: TrendingUp },
  ],
  fr: [
    { text: "Afficher mes décisions récentes", icon: Target },
    { text: "Comment mes décisions ont-elles performé?", icon: TrendingUp },
  ],
};

// =====================================================
// VISUALIZATION COMPONENTS
// =====================================================

function VisualizationRenderer({ result }: { result: QueryResult }) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const renderVisualization = () => {
    switch (result.visualization.type) {
      case 'kpi_card':
        return <KPIVisualization config={result.visualization.config} />;
      case 'bar_chart':
        return <BarChartVisualization config={result.visualization.config} />;
      case 'line_chart':
        return <LineChartVisualization data={result.data} />;
      case 'pie_chart':
        return <PieChartVisualization config={result.visualization.config} />;
      case 'table':
        return <TableVisualization config={result.visualization.config} />;
      case 'gauge':
        return <GaugeVisualization config={result.visualization.config} />;
      default:
        return <DefaultVisualization data={result.data} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
        {isEn ? result.visualization.titleEn : result.visualization.title}
      </h4>

      {/* Visualization */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
        {renderVisualization()}
      </div>

      {/* Highlights */}
      {result.summary.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.summary.highlights.map((highlight, idx) => (
            <div
              key={idx}
              className="px-3 py-2 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: 'rgb(var(--color-surface))' }}
            >
              <span className="text-sm text-muted">{highlight.label}:</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {highlight.value}
              </span>
              {highlight.trend && (
                highlight.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : highlight.trend === 'down' ? (
                  <TrendingDown className="w-4 h-4 text-error" />
                ) : null
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KPIVisualization({ config }: { config: any }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="text-center py-4">
      <p className="text-4xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
        {config.format === 'currency' ? formatCurrency(config.value) : config.value}
      </p>
      {config.change !== undefined && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {config.change >= 0 ? (
            <TrendingUp className="w-4 h-4 text-success" />
          ) : (
            <TrendingDown className="w-4 h-4 text-error" />
          )}
          <span className={config.change >= 0 ? 'text-success' : 'text-error'}>
            {config.change >= 0 ? '+' : ''}{config.change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function BarChartVisualization({ config }: { config: any }) {
  const data = config.data || [];
  const maxValue = Math.max(...data.map((d: any) => d.value));

  return (
    <div className="space-y-2">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{item.name}</span>
            <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(item.value)}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-border))' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: idx === 0 ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-primary-300))',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChartVisualization({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <p className="text-muted">No data available</p>;

  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Simple sparkline
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-32">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          fill="none"
          stroke="rgb(var(--color-primary-500))"
          strokeWidth="2"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-xs text-muted mt-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 4) === 0 || i === data.length - 1).map((d, i) => (
          <span key={i}>{d.period}</span>
        ))}
      </div>
    </div>
  );
}

function PieChartVisualization({ config }: { config: any }) {
  const data = config.data || [];
  const colors = [
    'rgb(var(--color-primary-500))',
    'rgb(var(--color-primary-400))',
    'rgb(var(--color-primary-300))',
    'rgb(var(--color-primary-200))',
    'rgb(var(--color-success))',
  ];

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item: any, idx: number) => (
        <div key={idx} className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: colors[idx % colors.length] }}
          />
          <span className="flex-1 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {item.name}
          </span>
          <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {item.percentage?.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function TableVisualization({ config }: { config: any }) {
  const data = config.data || [];
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgb(var(--color-border))' }}>
            <th className="text-left py-2 text-muted">Account</th>
            <th className="text-right py-2 text-muted">Current</th>
            <th className="text-right py-2 text-muted">Variance %</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((row: any, idx: number) => (
            <tr key={idx} style={{ borderBottom: '1px solid rgb(var(--color-border-subtle))' }}>
              <td className="py-2" style={{ color: 'rgb(var(--color-text))' }}>{row.name}</td>
              <td className="text-right py-2" style={{ color: 'rgb(var(--color-text))' }}>
                {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(row.current)}
              </td>
              <td className={`text-right py-2 ${row.variancePercent >= 0 ? 'text-success' : 'text-error'}`}>
                {row.variancePercent >= 0 ? '+' : ''}{row.variancePercent?.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GaugeVisualization({ config }: { config: any }) {
  const data = config.data || [];

  return (
    <div className="grid grid-cols-2 gap-4">
      {data.slice(0, 4).map((item: any, idx: number) => (
        <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
          <p className="text-xs text-muted">{item.nameFr || item.name}</p>
          <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {typeof item.value === 'number' && item.value < 100 ? item.value.toFixed(2) : item.value}
            {item.name.includes('Margin') && '%'}
            {item.name.includes('Ratio') && 'x'}
            {item.name === 'DSO' && 'd'}
          </p>
          <p className="text-xs text-muted">vs {item.benchmark}</p>
        </div>
      ))}
    </div>
  );
}

function DefaultVisualization({ data }: { data: any }) {
  return (
    <pre className="text-xs overflow-auto max-h-40 p-2 rounded" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AIQueryAssistant({ 
  onClose, 
  isModal = false,
  recentDecisions = [],
  industry = 'general',
}: AIQueryAssistantProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, isLoading: dataLoading } = useFinancialData();
  
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize query engine with financial data and decision context
  useEffect(() => {
    if (financialData) {
      queryEngine.setData(financialData);
    }
  }, [financialData]);

  // Update query engine with decision history
  useEffect(() => {
    queryEngine.setDecisionHistory(recentDecisions);
    queryEngine.setIndustry(industry);
  }, [recentDecisions, industry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isProcessing || !financialData) return;

    setIsProcessing(true);
    
    try {
      const parsedQuery = queryEngine.parseQuery(query);
      const result = await queryEngine.executeQuery(parsedQuery);
      
      setCurrentResult(result);
      
      // Add to history
      setHistory(prev => [{
        id: Date.now().toString(),
        query: query,
        result,
        timestamp: new Date(),
      }, ...prev].slice(0, 10));
      
      setQuery('');
    } catch (error) {
      console.error('Query error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestedQuery = (suggestedQuery: string) => {
    setQuery(suggestedQuery);
    inputRef.current?.focus();
  };

  const handleHistorySelect = (item: QueryHistoryItem) => {
    setCurrentResult(item.result);
    setShowHistory(false);
  };

  // Combine standard and decision-aware suggestions
  const standardSuggestions = SUGGESTED_QUERIES[isEn ? 'en' : 'fr'];
  const decisionSuggestions = recentDecisions.length > 0 
    ? DECISION_QUERIES[isEn ? 'en' : 'fr']
    : [];
  const suggestions = [...decisionSuggestions, ...standardSuggestions].slice(0, 6);

  return (
    <div className={`${isModal ? '' : 'card'} flex flex-col h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
          >
            <Sparkles className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'AI Query Assistant' : 'Assistant IA'}
            </h3>
            <p className="text-xs text-muted">
              {isEn ? 'Ask questions in natural language' : 'Posez vos questions en langage naturel'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title={isEn ? 'Query History' : 'Historique'}
          >
            <History className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading State */}
        {dataLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
        )}

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <h4 className="text-sm font-medium text-muted">
              {isEn ? 'Recent Queries' : 'Requêtes récentes'}
            </h4>
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => handleHistorySelect(item)}
                className="w-full text-left p-2 rounded-lg hover:bg-surface transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-muted flex-shrink-0" />
                <span className="text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {item.query}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recent Decisions Summary */}
        {!currentResult && !showHistory && recentDecisions.length > 0 && (
          <div 
            className="p-3 rounded-xl space-y-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-success) / 0.08)',
              border: '1px solid rgb(var(--color-success) / 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                {isEn ? 'Recent Decisions' : 'Décisions récentes'}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-success) / 0.2)', color: 'rgb(var(--color-success))' }}>
                {recentDecisions.length}
              </span>
            </div>
            <div className="space-y-1">
              {recentDecisions.slice(0, 2).map((decision) => (
                <div 
                  key={decision.id}
                  className="text-xs p-2 rounded-lg flex items-center justify-between gap-2"
                  style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                >
                  <span className="truncate" style={{ color: 'rgb(var(--color-text))' }}>
                    {decision.decision.description.slice(0, 40)}{decision.decision.description.length > 40 ? '...' : ''}
                  </span>
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: decision.outcome 
                        ? (decision.outcome.success ? 'rgb(var(--color-success) / 0.2)' : 'rgb(var(--color-warning) / 0.2)')
                        : 'rgb(var(--color-info) / 0.2)',
                      color: decision.outcome 
                        ? (decision.outcome.success ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))')
                        : 'rgb(var(--color-info))',
                    }}
                  >
                    {decision.outcome 
                      ? (decision.outcome.success ? (isEn ? 'Success' : 'Réussi') : (isEn ? 'Review' : 'Revoir'))
                      : (isEn ? 'Pending' : 'En attente')
                    }
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleSuggestedQuery(isEn ? 'Show my recent decisions' : 'Afficher mes décisions récentes')}
              className="text-xs w-full text-center py-1 rounded-lg transition-colors hover:bg-surface"
              style={{ color: 'rgb(var(--color-success))' }}
            >
              {isEn ? 'View all decisions →' : 'Voir toutes les décisions →'}
            </button>
          </div>
        )}

        {/* Suggested Queries */}
        {!currentResult && !showHistory && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm">{isEn ? 'Try asking:' : 'Essayez:'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((suggestion, idx) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuery(suggestion.text)}
                    className="p-3 rounded-xl text-left flex items-start gap-3 transition-all hover:scale-[1.02]"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      border: '1px solid rgb(var(--color-border-subtle))'
                    }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {suggestion.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Result */}
        {currentResult && (
          <div className="space-y-4">
            <VisualizationRenderer result={currentResult} />
            
            {/* Summary */}
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
              {isEn ? currentResult.summary.textEn : currentResult.summary.text}
            </p>

            {/* Follow-up Suggestions */}
            {currentResult.suggestedFollowUps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {isEn ? 'Follow-up questions:' : 'Questions de suivi:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentResult.suggestedFollowUps.map((followUp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuery(followUp)}
                      className="text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                        color: 'rgb(var(--color-primary-600))'
                      }}
                    >
                      {followUp}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div 
          className="flex items-center gap-2 p-2 rounded-xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            border: '1px solid rgb(var(--color-border))'
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isEn ? "Ask about your financial data..." : "Posez une question sur vos données..."}
            className="flex-1 bg-transparent outline-none text-sm px-2"
            style={{ color: 'rgb(var(--color-text))' }}
            disabled={isProcessing || dataLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isProcessing || dataLoading}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: query.trim() ? 'rgb(var(--color-primary-500))' : 'transparent',
              color: query.trim() ? 'white' : 'rgb(var(--color-text-muted))'
            }}
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
