/**
 * MetadataEditor - Edit visualization metadata
 * 
 * Features:
 * - Bilingual title and description (EN/FR)
 * - Tags with autocomplete
 * - Category selection
 * - Sharing options
 * - Brand-compliant styling
 */

import { useState, useCallback } from 'react';
import {
  FileText,
  Tag,
  Folder,
  Share2,
  X,
  Plus,
  Globe,
  Lock,
  Users,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { VisualizationConfig } from '../../lib/visualizationTypes';

// =====================================================
// SUGGESTED TAGS
// =====================================================

const SUGGESTED_TAGS = {
  en: ['revenue', 'expenses', 'cash flow', 'profit', 'budget', 'forecast', 'monthly', 'quarterly', 'annual', 'comparison'],
  fr: ['revenus', 'dépenses', 'trésorerie', 'bénéfice', 'budget', 'prévision', 'mensuel', 'trimestriel', 'annuel', 'comparaison'],
};

// =====================================================
// CATEGORIES
// =====================================================

const CATEGORIES = [
  { id: 'financial', labelEn: 'Financial', labelFr: 'Financier', icon: '💰' },
  { id: 'operational', labelEn: 'Operational', labelFr: 'Opérationnel', icon: '⚙️' },
  { id: 'industry', labelEn: 'Industry KPIs', labelFr: 'KPIs Industrie', icon: '🎯' },
  { id: 'custom', labelEn: 'Custom', labelFr: 'Personnalisé', icon: '✨' },
];

// =====================================================
// TAG INPUT COMPONENT
// =====================================================

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  isEn: boolean;
}

function TagInput({ tags, onChange, placeholder, isEn }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = SUGGESTED_TAGS[isEn ? 'en' : 'fr'].filter(
    tag => !tags.includes(tag) && tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div 
        className="flex flex-wrap gap-2 p-2 rounded-xl border min-h-[44px]"
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500) / 0.15)',
              color: 'rgb(var(--color-primary-500))',
            }}
          >
            <Tag className="w-3 h-3" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-primary-500/20 rounded p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          style={{ color: 'rgb(var(--color-text))' }}
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-10 w-full mt-1 py-1 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {suggestions.map(suggestion => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-primary-500/10 flex items-center gap-2"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <Plus className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// MAIN METADATA EDITOR
// =====================================================

interface MetadataEditorProps {
  config: Partial<VisualizationConfig>;
  onChange: (updates: Partial<VisualizationConfig>) => void;
}

export function MetadataEditor({ config, onChange }: MetadataEditorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.2)' }}
        >
          <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <div>
          <h3 
            className="font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Chart Details' : 'Détails du graphique'}
          </h3>
          <p 
            className="text-xs"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Customize the title, description, and organization' : 'Personnalisez le titre, la description et l\'organisation'}
          </p>
        </div>
      </div>

      {/* Title Fields */}
      <div 
        className="p-4 rounded-xl space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h4 
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Title' : 'Titre'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-xs mb-1.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'French Title' : 'Titre en français'}
            </label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={isEn ? 'e.g., Revenus mensuels' : 'ex: Revenus mensuels'}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
          <div>
            <label 
              className="block text-xs mb-1.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'English Title' : 'Titre en anglais'}
            </label>
            <input
              type="text"
              value={config.nameEn || ''}
              onChange={(e) => onChange({ nameEn: e.target.value })}
              placeholder={isEn ? 'e.g., Monthly Revenue' : 'ex: Monthly Revenue'}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
        </div>
      </div>

      {/* Description Fields */}
      <div 
        className="p-4 rounded-xl space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h4 
          className="text-sm font-medium uppercase tracking-wide"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? 'Description' : 'Description'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-xs mb-1.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'French Description' : 'Description en français'}
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder={isEn ? 'Brief explanation of what this chart shows...' : 'Brève explication de ce que montre ce graphique...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 resize-none"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
          <div>
            <label 
              className="block text-xs mb-1.5"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'English Description' : 'Description en anglais'}
            </label>
            <textarea
              value={config.descriptionEn || ''}
              onChange={(e) => onChange({ descriptionEn: e.target.value })}
              placeholder={isEn ? 'Brief explanation of what this chart shows...' : 'Brief explanation of what this chart shows...'}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-primary-500/20 resize-none"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                borderColor: 'rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div 
        className="p-4 rounded-xl space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h4 
          className="text-sm font-medium uppercase tracking-wide flex items-center gap-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <Folder className="w-4 h-4" />
          {isEn ? 'Category' : 'Catégorie'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => onChange({ category: cat.id as any })}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${config.category === cat.id 
                  ? 'border-primary-500 bg-primary-500/10' 
                  : 'border-transparent hover:border-primary-500/30'
                }
              `}
              style={{
                backgroundColor: config.category === cat.id 
                  ? undefined 
                  : 'rgb(var(--color-bg))',
              }}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span 
                className="text-sm font-medium"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? cat.labelEn : cat.labelFr}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div 
        className="p-4 rounded-xl space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h4 
          className="text-sm font-medium uppercase tracking-wide flex items-center gap-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <Tag className="w-4 h-4" />
          {isEn ? 'Tags' : 'Tags'}
        </h4>
        <TagInput
          tags={config.tags || []}
          onChange={(tags) => onChange({ tags })}
          placeholder={isEn ? 'Add tags for search...' : 'Ajouter des tags pour la recherche...'}
          isEn={isEn}
        />
        <p 
          className="text-xs"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? 'Tags help you and your team find this chart later. Press Enter or comma to add.'
            : 'Les tags vous aident à retrouver ce graphique. Appuyez sur Entrée ou virgule pour ajouter.'}
        </p>
      </div>

      {/* Sharing Options */}
      <div 
        className="p-4 rounded-xl space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        <h4 
          className="text-sm font-medium uppercase tracking-wide flex items-center gap-2"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          <Share2 className="w-4 h-4" />
          {isEn ? 'Sharing' : 'Partage'}
        </h4>
        <div className="space-y-3">
          <button
            onClick={() => onChange({ isPublic: false })}
            className={`
              w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
              ${!config.isPublic 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-transparent hover:border-primary-500/30'
              }
            `}
            style={{
              backgroundColor: !config.isPublic ? undefined : 'rgb(var(--color-bg))',
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-warning) / 0.15)' }}
            >
              <Lock className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
            </div>
            <div>
              <p 
                className="font-medium"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Private' : 'Privé'}
              </p>
              <p 
                className="text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Only you can view and edit this chart'
                  : 'Vous seul pouvez voir et modifier ce graphique'}
              </p>
            </div>
          </button>

          <button
            onClick={() => onChange({ isPublic: true })}
            className={`
              w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
              ${config.isPublic 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-transparent hover:border-primary-500/30'
              }
            `}
            style={{
              backgroundColor: config.isPublic ? undefined : 'rgb(var(--color-bg))',
            }}
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.15)' }}
            >
              <Users className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <p 
                className="font-medium"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Team' : 'Équipe'}
              </p>
              <p 
                className="text-xs"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'All team members in your organization can view this chart'
                  : 'Tous les membres de votre organisation peuvent voir ce graphique'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MetadataEditor;
