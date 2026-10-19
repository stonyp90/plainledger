/**
 * CustomEntityBuilder - UI for creating/editing custom entities
 * 
 * Allows users to create reusable pre-configured joins that can be
 * used as virtual data sources in visualizations.
 * 
 * Features:
 * - Select base data sources
 * - Configure joins between sources
 * - Select default fields to include
 * - Name and describe the custom entity
 * - Share with organization
 */

import { useState, useCallback } from 'react';
import {
  X,
  Save,
  Database,
  Link2,
  Columns3,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import {
  CustomEntity,
  DataSourceReference,
  JoinConfig,
  generateId,
} from '../../lib/visualizationTypes';
import DataSourceSelector from './SchemaSourceSelector';
import { JoinBuilder } from './JoinBuilder';

interface CustomEntityBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entity: CustomEntity) => Promise<void>;
  initialEntity?: CustomEntity;
  mode?: 'create' | 'edit';
}

export function CustomEntityBuilder({
  isOpen,
  onClose,
  onSave,
  initialEntity,
  mode = 'create',
}: CustomEntityBuilderProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const [name, setName] = useState(initialEntity?.name || '');
  const [nameEn, setNameEn] = useState(initialEntity?.nameEn || '');
  const [description, setDescription] = useState(initialEntity?.description || '');
  const [descriptionEn, setDescriptionEn] = useState(initialEntity?.descriptionEn || '');
  const [icon, setIcon] = useState(initialEntity?.icon || '🔗');
  const [baseSources, setBaseSources] = useState<DataSourceReference[]>(
    initialEntity?.baseSources || []
  );
  const [joins, setJoins] = useState<JoinConfig[]>(
    initialEntity?.joins || []
  );
  const [defaultFields, setDefaultFields] = useState<string[]>(
    initialEntity?.defaultFields || []
  );
  const [isPublic, setIsPublic] = useState(initialEntity?.isPublic || false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!name && !nameEn) {
      newErrors.name = isEn ? 'Name is required' : 'Le nom est requis';
    }
    
    if (baseSources.length === 0) {
      newErrors.sources = isEn ? 'At least one data source is required' : 'Au moins une source de données est requise';
    }
    
    if (baseSources.length > 1 && joins.length === 0) {
      newErrors.joins = isEn ? 'Joins are required when using multiple sources' : 'Les jointures sont requises lors de l\'utilisation de plusieurs sources';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      const entity: CustomEntity = {
        id: initialEntity?.id || generateId('entity'),
        organizationId: initialEntity?.organizationId || '',
        name: name || nameEn || 'Custom Entity',
        nameEn: nameEn || name || 'Custom Entity',
        description,
        descriptionEn,
        icon,
        baseSources,
        joins,
        defaultFields,
        createdBy: initialEntity?.createdBy || '',
        createdAt: initialEntity?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic,
      };

      await onSave(entity);
      onClose();
    } catch (error) {
      setErrors({ save: String(error) });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
              }}
            >
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {mode === 'edit'
                  ? (isEn ? 'Edit Custom Entity' : 'Modifier l\'entité personnalisée')
                  : (isEn ? 'Create Custom Entity' : 'Créer une entité personnalisée')}
              </h2>
              <p
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn
                  ? 'Create a reusable data source by combining tables'
                  : 'Créez une source de données réutilisable en combinant des tables'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Basic Information' : 'Informations de base'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Name (FR)' : 'Nom (FR)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: errors.name ? 'red' : 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Name (EN)' : 'Nom (EN)'}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border"
                  style={{
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Description' : 'Description'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 rounded-xl border"
                style={{
                  backgroundColor: 'rgb(var(--color-surface))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Share with organization' : 'Partager avec l\'organisation'}
                </span>
              </label>
            </div>
          </div>

          {/* Data Sources */}
          <div className="space-y-4">
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Data Sources' : 'Sources de données'}
            </h3>
            <DataSourceSelector
              selectedSources={baseSources}
              onSelectionChange={setBaseSources}
            />
            {errors.sources && (
              <p className="text-sm text-red-500">{errors.sources}</p>
            )}
          </div>

          {/* Joins */}
          {baseSources.length > 1 && (
            <div className="space-y-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? 'Joins' : 'Jointures'}
              </h3>
              <JoinBuilder
                sources={baseSources}
                joins={joins}
                onJoinsChange={setJoins}
              />
              {errors.joins && (
                <p className="text-sm text-red-500">{errors.joins}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-medium transition-all hover:bg-gray-800"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all text-white"
            style={{
              background: isSaving
                ? 'rgb(var(--color-surface))'
                : 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving
              ? (isEn ? 'Saving...' : 'Enregistrement...')
              : (isEn ? 'Save' : 'Enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomEntityBuilder;
