/**
 * Financial Model Page - Runway-style Design
 * 
 * Clean, professional financial model interface
 */

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import {
  type FinancialModel,
  type Driver,
  createDefaultModel,
  generateModelId,
} from '../lib/financialModel';
import { getIndustryTemplate, createModelFromTemplate } from '../lib/industries';
import ModelSpreadsheet from '../components/strategic/ModelSpreadsheet';

const STORAGE_KEY = 'plainledger-financial-model-v2';

// Runway-inspired color palette
const colors = {
  bg: {
    base: '#FFFFFF',
    muted: '#F9FAFB',
    page: '#F3F4F6',
  },
  border: {
    default: '#E5E7EB',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
  },
  accent: {
    primary: '#3B82F6',
    success: '#10B981',
  },
};

export default function FinancialModelPage() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData, isLoading: dataLoading } = useFinancialData();
  
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Create default model with sample drivers or industry template
  const createDefaultModelWithDrivers = useCallback(() => {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);
    
    // Try to get industry from onboarding data
    let industryId: string | null = null;
    try {
      const onboardingData = localStorage.getItem('pl_onboarding_data');
      if (onboardingData) {
        const parsed = JSON.parse(onboardingData);
        industryId = parsed.industry || null;
      }
    } catch (e) {
      // Ignore errors
    }
    
    // If industry is selected, use industry template
    if (industryId) {
      const template = getIndustryTemplate(industryId);
      if (template) {
        const { drivers, groups } = createModelFromTemplate(template, startDate, endDate, language);
        const defaultModel = createDefaultModel(
          isEn ? template.name.en : template.name.fr,
          template.name.en,
          startDate,
          endDate
        );
        defaultModel.drivers = drivers;
        defaultModel.groups = groups;
        return defaultModel;
      }
    }
    
    // Fallback to generic model
    const defaultModel = createDefaultModel(
      isEn ? 'Top Line' : 'Ligne principale',
      'Top Line',
      startDate,
      endDate
    );
    
    // Add sample drivers
    const drivers: Record<string, Driver> = {};
    const driverIds: string[] = [];
    
    // Cash Balance
    const cashId = generateModelId('driver');
    drivers[cashId] = {
      id: cashId,
      name: isEn ? 'Cash Balance' : 'Solde de trésorerie',
      nameEn: 'Cash Balance',
      values: {},
      dataSource: 'account',
      accountId: 'cash',
      format: 'currency',
      decimals: 0,
    };
    driverIds.push(cashId);
    
    // Operating Activities
    const opActId = generateModelId('driver');
    drivers[opActId] = {
      id: opActId,
      name: isEn ? 'Operating Activities' : 'Activités opérationnelles',
      nameEn: 'Operating Activities',
      values: {},
      dataSource: 'account',
      accountId: 'operating-activities',
      format: 'currency',
      decimals: 0,
    };
    driverIds.push(opActId);
    
    // Burn (formula)
    const burnId = generateModelId('driver');
    drivers[burnId] = {
      id: burnId,
      name: 'Burn',
      nameEn: 'Burn',
      formula: '=Operating Activities',
      values: {},
      dataSource: 'formula',
      format: 'currency',
      decimals: 0,
    };
    driverIds.push(burnId);
    
    // Months of Runway (formula)
    const runwayId = generateModelId('driver');
    drivers[runwayId] = {
      id: runwayId,
      name: isEn ? 'Months of Runway' : 'Mois de piste',
      nameEn: 'Months of Runway',
      formula: '=round(Cash Balance / Burn)',
      values: {},
      dataSource: 'formula',
      format: 'number',
      decimals: 0,
    };
    driverIds.push(runwayId);
    
    defaultModel.drivers = drivers;
    defaultModel.groups[0].driverIds = driverIds;
    
    return defaultModel;
  }, [isEn, language]);
  
  // Load model from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setModel(parsed);
      } else {
        setModel(createDefaultModelWithDrivers());
      }
    } catch (error) {
      console.error('Failed to load financial model:', error);
      setModel(createDefaultModelWithDrivers());
    }
  }, [createDefaultModelWithDrivers]);
  
  // Handle model updates
  const handleModelUpdate = useCallback((updatedModel: FinancialModel) => {
    setModel(updatedModel);
    // Auto-save
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedModel));
    } catch (error) {
      console.error('Failed to save financial model:', error);
    }
  }, []);
  
  // Get account value for a specific period
  // Missing source data remains unavailable.
  const getAccountValue = useCallback((accountId: string, periodKey: string): number | null => {
    if (!financialData?.summary) return null;

    switch (accountId) {
      case 'cash':
        return financialData.summary.cash.current ?? null;
      case 'operating-activities':
        return financialData.summary.cashFlow.operating ?? null;
      case 'revenue':
        return financialData.summary.revenue.current ?? null;
      case 'expenses':
        return financialData.summary.expenses.current ?? null;
      default:
        return null;
    }
  }, [financialData]);
  
  // Manual save
  const handleSave = () => {
    if (!model) return;
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 500);
    } catch (error) {
      console.error('Failed to save:', error);
      setIsSaving(false);
    }
  };
  
  // Reset model
  const handleReset = () => {
    if (confirm(isEn ? 'Reset model to defaults?' : 'Réinitialiser le modèle?')) {
      const newModel = createDefaultModelWithDrivers();
      setModel(newModel);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newModel));
    }
  };
  
  if (dataLoading || !model) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ 
          minHeight: '400px',
          backgroundColor: colors.bg.page,
        }}
      >
        <div className="text-center">
          <Loader2 
            className="w-8 h-8 animate-spin mx-auto mb-4" 
            style={{ color: colors.accent.primary }} 
          />
          <p style={{ color: colors.text.muted }}>
            {isEn ? 'Loading financial model...' : 'Chargement du modèle financier...'}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: colors.bg.page,
        padding: '20px',
      }}
    >
      {/* Header */}
      <div 
        className="rounded-lg border mb-4"
        style={{ 
          backgroundColor: colors.bg.base,
          borderColor: colors.border.default,
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-lg font-semibold"
              style={{ color: colors.text.primary }}
            >
              {isEn ? model.nameEn || model.name : model.name}
            </h1>
            <p 
              className="text-xs mt-0.5"
              style={{ color: colors.text.muted }}
            >
              {isEn
                ? 'Financial model with semantic driver formulas'
                : 'Modèle financier avec formules sémantiques'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span 
                className="text-xs"
                style={{ color: colors.text.muted }}
              >
                {isEn ? 'Saved' : 'Enregistré'} {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            <button
              onClick={handleReset}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: colors.text.muted,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg.muted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={isEn ? 'Reset to defaults' : 'Réinitialiser'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: colors.accent.success,
                color: '#FFFFFF',
              }}
              onMouseEnter={(e) => {
                if (!isSaving) e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.accent.success;
              }}
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              {isEn ? 'Save' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Model Spreadsheet */}
      <ModelSpreadsheet
        model={model}
        onModelUpdate={handleModelUpdate}
        getAccountValue={getAccountValue}
        currency="CAD"
      />
    </div>
  );
}
