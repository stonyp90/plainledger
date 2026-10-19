/**
 * JoinBuilder - Visual join configuration component
 * 
 * Features:
 * - Visual join type selector (inner, left, right, full)
 * - Auto-suggest join keys based on schema
 * - Preview sample joined data
 * - Bilingual labels (EN/FR)
 * - Brand-compliant styling
 */

import { useState, useMemo } from 'react';
import {
  Link2,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Plus,
  X,
  ChevronDown,
  Lightbulb,
  Check,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  JoinConfig,
  JoinType,
  DataSourceReference,
} from '../../lib/visualizationTypes';
import { getDataSource, getSuggestedJoin } from '../../lib/goldSchema';

// =====================================================
// JOIN TYPE DEFINITIONS
// =====================================================

interface JoinTypeOption {
  type: JoinType;
  labelEn: string;
  labelFr: string;
  descriptionEn: string;
  descriptionFr: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const JOIN_TYPES: JoinTypeOption[] = [
  {
    type: 'inner',
    labelEn: 'Inner Join',
    labelFr: 'Jointure interne',
    descriptionEn: 'Only matching records',
    descriptionFr: 'Uniquement les enregistrements correspondants',
    icon: Link2,
  },
  {
    type: 'left',
    labelEn: 'Left Join',
    labelFr: 'Jointure gauche',
    descriptionEn: 'All from left, matching from right',
    descriptionFr: 'Tous de gauche, correspondants de droite',
    icon: ArrowRight,
  },
  {
    type: 'right',
    labelEn: 'Right Join',
    labelFr: 'Jointure droite',
    descriptionEn: 'All from right, matching from left',
    descriptionFr: 'Tous de droite, correspondants de gauche',
    icon: ArrowLeft,
  },
  {
    type: 'full',
    labelEn: 'Full Join',
    labelFr: 'Jointure complète',
    descriptionEn: 'All records from both',
    descriptionFr: 'Tous les enregistrements des deux',
    icon: ArrowLeftRight,
  },
];

// =====================================================
// SINGLE JOIN EDITOR
// =====================================================

interface JoinEditorProps {
  join: JoinConfig;
  sources: DataSourceReference[];
  onUpdate: (updates: Partial<JoinConfig>) => void;
  onRemove: () => void;
  isEn: boolean;
}

function JoinEditor({ join, sources, onUpdate, onRemove, isEn }: JoinEditorProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const leftSource = getDataSource(join.leftSource);
  const rightSource = getDataSource(join.rightSource);

  // Get suggested join if available
  const suggestion = useMemo(() => {
    if (join.leftSource && join.rightSource) {
      return getSuggestedJoin(join.leftSource, join.rightSource);
    }
    return null;
  }, [join.leftSource, join.rightSource]);

  // Apply suggestion
  const applySuggestion = () => {
    if (suggestion) {
      onUpdate({
        leftField: suggestion.keys[0]?.sourceField,
        rightField: suggestion.keys[0]?.targetField,
        type: suggestion.joinType,
      });
    }
  };

  const selectedJoinType = JOIN_TYPES.find(jt => jt.type === join.type) || JOIN_TYPES[0];
  const JoinIcon = selectedJoinType.icon;

  return (
    <div 
      className="p-4 rounded-xl border"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)' }}
          >
            <Link2 className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <span 
            className="font-medium"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Join Configuration' : 'Configuration de la jointure'}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Source Selection */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-4">
        {/* Left Source */}
        <div>
          <label 
            className="block text-xs mb-1.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Left Table' : 'Table gauche'}
          </label>
          <select
            value={join.leftSource}
            onChange={(e) => onUpdate({ leftSource: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <option value="">{isEn ? 'Select table...' : 'Sélectionner...'}</option>
            {sources.map(s => {
              const source = getDataSource(s.id);
              return source ? (
                <option key={s.id} value={s.id}>
                  {source.icon} {isEn ? source.nameEn : source.name}
                </option>
              ) : null;
            })}
          </select>
        </div>

        {/* Join Type Button */}
        <div className="relative">
          <button
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:border-primary-500"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <JoinIcon 
              className="w-5 h-5"
              style={{ color: 'rgb(var(--color-primary-500))' }}
            />
            <ChevronDown 
              className="w-4 h-4"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            />
          </button>

          {/* Join Type Dropdown */}
          {showTypeSelector && (
            <div 
              className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-64 py-2 rounded-xl shadow-lg"
              style={{
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              {JOIN_TYPES.map(jt => {
                const Icon = jt.icon;
                return (
                  <button
                    key={jt.type}
                    onClick={() => {
                      onUpdate({ type: jt.type });
                      setShowTypeSelector(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${join.type === jt.type ? 'bg-primary-500/10' : 'hover:bg-gray-700/50'}
                    `}
                  >
                    <Icon 
                      className="w-5 h-5"
                      style={{ 
                        color: join.type === jt.type 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-text-muted))',
                      }}
                    />
                    <div className="flex-1">
                      <p 
                        className="text-sm font-medium"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {isEn ? jt.labelEn : jt.labelFr}
                      </p>
                      <p 
                        className="text-xs"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? jt.descriptionEn : jt.descriptionFr}
                      </p>
                    </div>
                    {join.type === jt.type && (
                      <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Source */}
        <div>
          <label 
            className="block text-xs mb-1.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Right Table' : 'Table droite'}
          </label>
          <select
            value={join.rightSource}
            onChange={(e) => onUpdate({ rightSource: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <option value="">{isEn ? 'Select table...' : 'Sélectionner...'}</option>
            {sources.map(s => {
              const source = getDataSource(s.id);
              return source ? (
                <option key={s.id} value={s.id}>
                  {source.icon} {isEn ? source.nameEn : source.name}
                </option>
              ) : null;
            })}
          </select>
        </div>
      </div>

      {/* Field Selection */}
      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-4">
        {/* Left Field */}
        <div>
          <label 
            className="block text-xs mb-1.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Left Field' : 'Champ gauche'}
          </label>
          <select
            value={join.leftField}
            onChange={(e) => onUpdate({ leftField: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
            disabled={!leftSource}
          >
            <option value="">{isEn ? 'Select field...' : 'Sélectionner...'}</option>
            {leftSource?.fields.map(f => (
              <option key={f.id} value={f.id}>
                {isEn ? f.nameEn : f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Equals Sign */}
        <div 
          className="text-lg font-bold"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          =
        </div>

        {/* Right Field */}
        <div>
          <label 
            className="block text-xs mb-1.5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Right Field' : 'Champ droit'}
          </label>
          <select
            value={join.rightField}
            onChange={(e) => onUpdate({ rightField: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
            disabled={!rightSource}
          >
            <option value="">{isEn ? 'Select field...' : 'Sélectionner...'}</option>
            {rightSource?.fields.map(f => (
              <option key={f.id} value={f.id}>
                {isEn ? f.nameEn : f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggestion */}
      {suggestion && !join.leftField && !join.rightField && (
        <button
          onClick={applySuggestion}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors"
          style={{
            backgroundColor: 'rgb(var(--color-accent-500) / 0.1)',
            border: '1px solid rgb(var(--color-accent-500) / 0.3)',
          }}
        >
          <Lightbulb 
            className="w-5 h-5"
            style={{ color: 'rgb(var(--color-accent-500))' }}
          />
          <div className="flex-1 text-left">
            <p 
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Suggested join detected' : 'Jointure suggérée détectée'}
            </p>
            <p 
              className="text-xs"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {suggestion.keys[0]?.sourceField} = {suggestion.keys[0]?.targetField} ({suggestion.joinType})
            </p>
          </div>
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{ 
              backgroundColor: 'rgb(var(--color-accent-500) / 0.2)',
              color: 'rgb(var(--color-accent-500))',
            }}
          >
            {isEn ? 'Apply' : 'Appliquer'}
          </span>
        </button>
      )}
    </div>
  );
}

// =====================================================
// MAIN JOIN BUILDER
// =====================================================

interface JoinBuilderProps {
  sources: DataSourceReference[];
  joins: JoinConfig[];
  onJoinsChange: (joins: JoinConfig[]) => void;
}

export function JoinBuilder({ sources, joins, onJoinsChange }: JoinBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Add new join
  const addJoin = () => {
    const newJoin: JoinConfig = {
      leftSource: sources[0]?.id || '',
      rightSource: sources[1]?.id || '',
      leftField: '',
      rightField: '',
      type: 'left',
    };
    onJoinsChange([...joins, newJoin]);
  };

  // Update join
  const updateJoin = (index: number, updates: Partial<JoinConfig>) => {
    onJoinsChange(
      joins.map((j, i) => i === index ? { ...j, ...updates } : j)
    );
  };

  // Remove join
  const removeJoin = (index: number) => {
    onJoinsChange(joins.filter((_, i) => i !== index));
  };

  // Can add joins?
  const canAddJoin = sources.length >= 2;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <Link2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {isEn ? 'Join Tables' : 'Joindre les tables'}
          </h3>
          <p 
            className="text-sm mt-1"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn 
              ? 'Connect your data sources to combine their fields'
              : 'Connectez vos sources de données pour combiner leurs champs'}
          </p>
        </div>
        {canAddJoin && (
          <button
            onClick={addJoin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              color: 'rgb(var(--color-primary-500))',
            }}
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'Add Join' : 'Ajouter jointure'}
          </button>
        )}
      </div>

      {/* Join List */}
      {joins.length > 0 ? (
        <div className="space-y-4">
          {joins.map((join, index) => (
            <JoinEditor
              key={index}
              join={join}
              sources={sources}
              onUpdate={(updates) => updateJoin(index, updates)}
              onRemove={() => removeJoin(index)}
              isEn={isEn}
            />
          ))}
        </div>
      ) : (
        <div 
          className="text-center py-12 rounded-xl border-2 border-dashed"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <Link2 
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          />
          <p 
            className="text-sm mb-2"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'No joins configured' : 'Aucune jointure configurée'}
          </p>
          <p 
            className="text-xs mb-4"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {sources.length < 2
              ? (isEn 
                  ? 'Select at least 2 data sources to create joins'
                  : 'Sélectionnez au moins 2 sources pour créer des jointures')
              : (isEn 
                  ? 'Add a join to combine data from multiple sources'
                  : 'Ajoutez une jointure pour combiner les données')}
          </p>
          {canAddJoin && (
            <button
              onClick={addJoin}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'Create First Join' : 'Créer la première jointure'}
            </button>
          )}
        </div>
      )}

      {/* Help Text */}
      {sources.length >= 2 && (
        <div 
          className="flex items-start gap-2 p-3 rounded-lg text-xs"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            color: 'rgb(var(--color-text-muted))',
          }}
        >
          <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            {isEn 
              ? 'Joins connect tables by matching field values. Use LEFT JOIN to keep all records from the first table, or INNER JOIN to only show matching records.'
              : 'Les jointures connectent les tables en faisant correspondre les valeurs des champs. Utilisez LEFT JOIN pour garder tous les enregistrements de la première table.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default JoinBuilder;
