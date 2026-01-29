/**
 * OKR Panel Component
 * 
 * Display and edit quarterly OKRs linked to strategic initiatives
 */

import { useState } from 'react';
import { Target, Edit2, Check, X, TrendingUp, Calendar, Link as LinkIcon } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { OKR, KeyResult, getQuarterDates, calculateOKRProgress, isOKROnTrack } from '../../lib/okrTypes';
import { Initiative } from '../../lib/strategicPlanning';

interface OKRPanelProps {
  okrs: OKR[];
  initiatives: Initiative[];
  onUpdate?: (okr: OKR) => void;
  onDelete?: (okrId: string) => void;
  onLinkInitiative?: (okrId: string, initiativeId: string) => void;
}

export default function OKRPanel({
  okrs,
  initiatives,
  onUpdate,
  onDelete,
  onLinkInitiative,
}: OKRPanelProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [editingOKR, setEditingOKR] = useState<string | null>(null);
  const [editingKR, setEditingKR] = useState<{ okrId: string; krId: string } | null>(null);

  if (okrs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: 'rgb(var(--color-text-muted))' }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          {isEn ? 'No OKRs Yet' : 'Aucun OKR pour le moment'}
        </h3>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn
            ? 'Create OKRs to track your strategic objectives and key results.'
            : 'Créez des OKR pour suivre vos objectifs stratégiques et résultats clés.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {okrs.map((okr) => {
        const progress = calculateOKRProgress(okr);
        const onTrack = isOKROnTrack(okr);
        const { start, end } = getQuarterDates(okr.quarter, okr.year);
        const linkedInitiatives = initiatives.filter((init) => okr.linkedInitiatives.includes(init.id));

        return (
          <div key={okr.id} className="card p-4 sm:p-6">
            {/* OKR Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? okr.objectiveEn : okr.objective}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {okr.quarter} {okr.year}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    okr.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    okr.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    okr.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {isEn ? okr.status : 
                      okr.status === 'active' ? 'Actif' :
                      okr.status === 'completed' ? 'Terminé' :
                      okr.status === 'draft' ? 'Brouillon' : 'Annulé'}
                  </span>
                </div>
              </div>
              {onUpdate && (
                <button
                  onClick={() => setEditingOKR(okr.id)}
                  className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                  aria-label={isEn ? 'Edit OKR' : 'Modifier OKR'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Overall Progress' : 'Progrès global'}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: onTrack ? 'rgb(var(--color-success))' : 'rgb(var(--color-warning))',
                  }}
                />
              </div>
              {!onTrack && (
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-warning))' }}>
                  {isEn ? '⚠️ Behind schedule' : '⚠️ En retard'}
                </p>
              )}
            </div>

            {/* Key Results */}
            <div className="space-y-3 mb-4">
              <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Key Results' : 'Résultats clés'}
              </h4>
              {okr.keyResults.map((kr) => {
                const krProgress = kr.targetValue === 0 ? 0 : Math.min(100, (kr.currentValue / kr.targetValue) * 100);
                const isEditing = editingKR?.okrId === okr.id && editingKR?.krId === kr.id;

                return (
                  <div
                    key={kr.id}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                  >
                    {isEditing ? (
                      <KeyResultEditor
                        kr={kr}
                        onSave={(updatedKR) => {
                          if (onUpdate) {
                            onUpdate({
                              ...okr,
                              keyResults: okr.keyResults.map((k) => (k.id === kr.id ? updatedKR : k)),
                              updatedAt: new Date().toISOString(),
                            });
                          }
                          setEditingKR(null);
                        }}
                        onCancel={() => setEditingKR(null)}
                        isEn={isEn}
                      />
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm flex-1" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? kr.descriptionEn : kr.description}
                          </p>
                          {onUpdate && (
                            <button
                              onClick={() => setEditingKR({ okrId: okr.id, krId: kr.id })}
                              className="p-1 rounded hover:bg-opacity-10 transition-colors ml-2"
                              style={{ color: 'rgb(var(--color-text-muted))' }}
                              aria-label={isEn ? 'Edit' : 'Modifier'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {kr.currentValue.toLocaleString()} / {kr.targetValue.toLocaleString()} {kr.unit}
                          </span>
                          <span className="font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
                            {krProgress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${krProgress}%`,
                              backgroundColor: 'rgb(var(--color-primary-500))',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          <span>
                            {isEn ? 'Due' : 'Échéance'}: {new Date(kr.dueDate).toLocaleDateString()}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            kr.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            kr.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            kr.status === 'at_risk' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {isEn ? kr.status.replace('_', ' ') : 
                              kr.status === 'completed' ? 'Terminé' :
                              kr.status === 'in_progress' ? 'En cours' :
                              kr.status === 'at_risk' ? 'À risque' : 'Non commencé'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Linked Initiatives */}
            {linkedInitiatives.length > 0 && (
              <div className="pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <h4 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Linked Initiatives' : 'Initiatives liées'}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedInitiatives.map((init) => (
                    <span
                      key={init.id}
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: 'rgb(var(--color-primary-100))',
                        color: 'rgb(var(--color-primary-700))',
                      }}
                    >
                      {isEn ? init.nameEn : init.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface KeyResultEditorProps {
  kr: KeyResult;
  onSave: (kr: KeyResult) => void;
  onCancel: () => void;
  isEn: boolean;
}

function KeyResultEditor({ kr, onSave, onCancel, isEn }: KeyResultEditorProps) {
  const [currentValue, setCurrentValue] = useState(kr.currentValue);
  const [status, setStatus] = useState(kr.status);

  return (
    <div className="space-y-2">
      <input
        type="number"
        value={currentValue}
        onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 text-sm rounded border"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
        placeholder={isEn ? 'Current value' : 'Valeur actuelle'}
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as KeyResult['status'])}
        className="w-full px-2 py-1 text-sm rounded border"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
      >
        <option value="not_started">{isEn ? 'Not Started' : 'Non commencé'}</option>
        <option value="in_progress">{isEn ? 'In Progress' : 'En cours'}</option>
        <option value="completed">{isEn ? 'Completed' : 'Terminé'}</option>
        <option value="at_risk">{isEn ? 'At Risk' : 'À risque'}</option>
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ ...kr, currentValue, status })}
          className="p-1.5 rounded hover:bg-opacity-10 transition-colors"
          style={{ color: 'rgb(var(--color-success))' }}
          aria-label={isEn ? 'Save' : 'Enregistrer'}
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 rounded hover:bg-opacity-10 transition-colors"
          style={{ color: 'rgb(var(--color-error))' }}
          aria-label={isEn ? 'Cancel' : 'Annuler'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
