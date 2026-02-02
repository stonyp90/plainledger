/**
 * DataSourceSelector - Multi-select component for choosing data sources
 * 
 * Features:
 * - Multi-select with visual feedback
 * - Search/filter functionality
 * - Grouped by table type (Dimensions vs Facts)
 * - Bilingual labels (EN/FR)
 * - Shows field count and relationships
 * - Brand-compliant styling
 */

import { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Check, 
  ChevronRight, 
  Table, 
  BarChart3,
  Link2,
  X,
  Info,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { 
  DataSource, 
  DataSourceReference,
} from '../../lib/visualizationTypes';
import { 
  getAllDataSources, 
  getDimensions, 
  getFacts,
  getJoinableSources,
} from '../../lib/goldSchema';

interface DataSourceSelectorProps {
  selectedSources: DataSourceReference[];
  onSelectionChange: (sources: DataSourceReference[]) => void;
  maxSources?: number;
  showIndustryKpis?: boolean;
}

export function DataSourceSelector({
  selectedSources,
  onSelectionChange,
  maxSources = 5,
  showIndustryKpis = true,
}: DataSourceSelectorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Get all data sources
  const allSources = useMemo(() => {
    const sources = getAllDataSources();
    // Filter out industry KPIs if not enabled
    if (!showIndustryKpis) {
      return sources.filter(s => s.id !== 'fact_industry_kpis');
    }
    return sources;
  }, [showIndustryKpis]);

  const dimensions = useMemo(() => getDimensions(), []);
  const facts = useMemo(() => {
    const allFacts = getFacts();
    if (!showIndustryKpis) {
      return allFacts.filter(s => s.id !== 'fact_industry_kpis');
    }
    return allFacts;
  }, [showIndustryKpis]);

  // Filter sources based on search
  const filteredDimensions = useMemo(() => {
    if (!searchQuery) return dimensions;
    const query = searchQuery.toLowerCase();
    return dimensions.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.nameEn.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  }, [dimensions, searchQuery]);

  const filteredFacts = useMemo(() => {
    if (!searchQuery) return facts;
    const query = searchQuery.toLowerCase();
    return facts.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.nameEn.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  }, [facts, searchQuery]);

  // Check if a source is selected
  const isSelected = (sourceId: string) => 
    selectedSources.some(s => s.id === sourceId);

  // Toggle source selection
  const toggleSource = (source: DataSource) => {
    if (isSelected(source.id)) {
      // Remove source
      onSelectionChange(selectedSources.filter(s => s.id !== source.id));
    } else {
      // Add source (if not at max)
      if (selectedSources.length >= maxSources) {
        return; // Can't add more
      }
      onSelectionChange([...selectedSources, { id: source.id }]);
    }
  };

  // Get joinable sources for selected sources
  const suggestedSources = useMemo(() => {
    const suggestions = new Set<string>();
    selectedSources.forEach(selected => {
      const joinable = getJoinableSources(selected.id);
      joinable.forEach(s => {
        if (!isSelected(s.id)) {
          suggestions.add(s.id);
        }
      });
    });
    return suggestions;
  }, [selectedSources]);

  const renderSourceCard = (source: DataSource) => {
    const selected = isSelected(source.id);
    const suggested = suggestedSources.has(source.id);
    const expanded = expandedSource === source.id;
    const disabled = !selected && selectedSources.length >= maxSources;

    return (
      <div
        key={source.id}
        className={`
          relative rounded-xl border-2 transition-all duration-200 overflow-hidden
          ${selected 
            ? 'border-primary-500 bg-primary-500/10' 
            : suggested
              ? 'border-accent-500/50 bg-accent-500/5 hover:border-accent-500'
              : disabled
                ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }
        `}
      >
        {/* Main Card Content */}
        <button
          onClick={() => !disabled && toggleSource(source)}
          disabled={disabled}
          className={`
            w-full p-4 text-left flex items-start gap-3
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {/* Icon */}
          <div 
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0
              ${selected 
                ? 'bg-primary-500/20' 
                : suggested
                  ? 'bg-accent-500/20'
                  : 'bg-gray-700'
              }
            `}
          >
            {source.icon || (source.tableType === 'DIMENSION' ? '📊' : '💰')}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 
                className="font-semibold truncate"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? source.nameEn : source.name}
              </h4>
              {suggested && !selected && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-accent-500) / 0.2)',
                    color: 'rgb(var(--color-accent-500))',
                  }}
                >
                  {isEn ? 'Suggested' : 'Suggéré'}
                </span>
              )}
            </div>
            <p 
              className="text-sm mt-0.5 line-clamp-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? source.descriptionEn : source.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <span className="flex items-center gap-1">
                <Table className="w-3 h-3" />
                {source.fields.length} {isEn ? 'fields' : 'champs'}
              </span>
              {source.joinableWith.length > 0 && (
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {source.joinableWith.length} {isEn ? 'relations' : 'relations'}
                </span>
              )}
            </div>
          </div>

          {/* Selection Indicator */}
          <div 
            className={`
              w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all
              ${selected 
                ? 'bg-primary-500 text-white' 
                : 'border-2 border-gray-600'
              }
            `}
          >
            {selected && <Check className="w-4 h-4" />}
          </div>
        </button>

        {/* Expand Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedSource(expanded ? null : source.id);
          }}
          className="absolute bottom-2 right-2 p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        >
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
        </button>

        {/* Expanded Field List */}
        {expanded && (
          <div 
            className="px-4 pb-4 pt-2 border-t"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Available Fields' : 'Champs disponibles'}
            </p>
            <div className="flex flex-wrap gap-1">
              {source.fields.slice(0, 10).map(field => (
                <span 
                  key={field.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    color: 'rgb(var(--color-text-muted))',
                  }}
                  title={isEn ? field.nameEn : field.name}
                >
                  {isEn ? field.nameEn : field.name}
                </span>
              ))}
              {source.fields.length > 10 && (
                <span 
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                    color: 'rgb(var(--color-primary-500))',
                  }}
                >
                  +{source.fields.length - 10} {isEn ? 'more' : 'autres'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
            <Database className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {isEn ? 'Select Data Sources' : 'Sélectionner les sources de données'}
          </h3>
          <p 
            className="text-sm mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? `Choose up to ${maxSources} data sources to combine in your visualization`
              : `Choisissez jusqu'à ${maxSources} sources de données pour votre visualisation`}
          </p>
        </div>
        <div 
          className="text-sm font-medium px-3 py-1.5 rounded-full"
          style={{ 
            backgroundColor: selectedSources.length >= maxSources 
              ? 'rgb(var(--color-warning) / 0.1)'
              : 'rgb(var(--color-primary-500) / 0.1)',
            color: selectedSources.length >= maxSources 
              ? 'rgb(var(--color-warning))'
              : 'rgb(var(--color-primary-500))',
          }}
        >
          {selectedSources.length}/{maxSources} {isEn ? 'selected' : 'sélectionnées'}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search data sources...' : 'Rechercher des sources...'}
          className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-700"
          >
            <X className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        )}
      </div>

      {/* Selected Sources Summary */}
      {selectedSources.length > 0 && (
        <div 
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
            border: '1px solid rgb(var(--color-primary-500) / 0.3)',
          }}
        >
          <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Selected:' : 'Sélectionnées:'}{' '}
            {selectedSources.map((s, i) => {
              const source = allSources.find(src => src.id === s.id);
              return source ? (
                <span key={s.id}>
                  {i > 0 && ', '}
                  <strong>{isEn ? source.nameEn : source.name}</strong>
                </span>
              ) : null;
            })}
          </span>
        </div>
      )}

      {/* Dimensions Section */}
      {filteredDimensions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)' }}
            >
              <Table className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h4 
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Dimensions' : 'Dimensions'}
            </h4>
            <div 
              className="flex-1 h-px"
              style={{ backgroundColor: 'rgb(var(--color-border))' }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDimensions.map(renderSourceCard)}
          </div>
        </div>
      )}

      {/* Facts Section */}
      {filteredFacts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-accent-500) / 0.2)' }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: 'rgb(var(--color-accent-500))' }} />
            </div>
            <h4 
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Facts (Measures)' : 'Faits (Mesures)'}
            </h4>
            <div 
              className="flex-1 h-px"
              style={{ backgroundColor: 'rgb(var(--color-border))' }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFacts.map(renderSourceCard)}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredDimensions.length === 0 && filteredFacts.length === 0 && (
        <div 
          className="text-center py-12 rounded-xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px dashed rgb(var(--color-border))',
          }}
        >
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'No data sources match your search'
              : 'Aucune source de données ne correspond à votre recherche'}
          </p>
        </div>
      )}

      {/* Help Text */}
      <div 
        className="flex items-start gap-2 p-3 rounded-lg text-xs"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          color: 'rgb(var(--color-text-muted))',
        }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          {isEn 
            ? 'Dimensions contain descriptive attributes (accounts, contacts, dates). Facts contain numeric measures (transactions, balances). Select at least one fact table for meaningful visualizations.'
            : 'Les dimensions contiennent des attributs descriptifs (comptes, contacts, dates). Les faits contiennent des mesures numériques (transactions, soldes). Sélectionnez au moins une table de faits pour des visualisations significatives.'}
        </p>
      </div>
    </div>
  );
}

export default DataSourceSelector;
