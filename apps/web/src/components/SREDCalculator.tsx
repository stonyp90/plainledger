/**
 * SR&ED Tax Credit Calculator
 *
 * Interactive calculator for estimating SR&ED (Scientific Research and 
 * Experimental Development) tax credit eligibility.
 * 
 * Supports:
 * - Federal SR&ED credit (35% for CCPCs, 15% for others)
 * - Provincial credits (Quebec RSDE, Ontario, BC, Alberta)
 * - Bilingual EN/FR
 * - Lead capture on submission
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';
import {
  Calculator,
  DollarSign,
  Users,
  Building2,
  ChevronRight,
  Check,
  Info,
  ArrowRight,
  FileText,
} from 'lucide-react';

// Theme colors - use CSS variables for consistency
const primaryColor = 'rgb(var(--color-primary-600))'; // emerald-600

// Provincial SR&ED rates
const PROVINCIAL_RATES: Record<string, { name: string; rate: number; refundable: boolean }> = {
  QC: { name: 'Quebec', rate: 0.14, refundable: true },
  ON: { name: 'Ontario', rate: 0.035, refundable: false }, // OITC - 3.5%
  BC: { name: 'British Columbia', rate: 0.10, refundable: true },
  AB: { name: 'Alberta', rate: 0.10, refundable: true },
  SK: { name: 'Saskatchewan', rate: 0.10, refundable: true },
  MB: { name: 'Manitoba', rate: 0.20, refundable: true },
  NS: { name: 'Nova Scotia', rate: 0.15, refundable: true },
  NB: { name: 'New Brunswick', rate: 0.15, refundable: true },
  NL: { name: 'Newfoundland', rate: 0.15, refundable: true },
  PE: { name: 'Prince Edward Island', rate: 0.10, refundable: true },
  OTHER: { name: 'Other', rate: 0, refundable: false },
};

// Federal SR&ED rates
const FEDERAL_RATES = {
  ccpc: {
    enhanced: 0.35, // Enhanced rate for first $3M
    regular: 0.15,  // Regular rate above $3M
    threshold: 3000000, // $3M threshold
  },
  other: {
    rate: 0.15, // Non-CCPC rate
  },
};

interface CalculatorInputs {
  province: string;
  isCCPC: boolean;
  rdSalaries: number;
  rdMaterials: number;
  rdContractors: number;
  rdOverhead: number;
}

interface CalculatorResults {
  totalEligible: number;
  federalCredit: number;
  provincialCredit: number;
  totalCredit: number;
  federalRefundable: number;
  provincialRefundable: number;
  breakdown: {
    category: string;
    amount: number;
    federalCredit: number;
    provincialCredit: number;
  }[];
}

export default function SREDCalculator() {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState<CalculatorInputs>({
    province: 'QC',
    isCCPC: true,
    rdSalaries: 0,
    rdMaterials: 0,
    rdContractors: 0,
    rdOverhead: 0,
  });
  const [results, setResults] = useState<CalculatorResults | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });

  // Calculate SR&ED credits
  const calculateCredits = (): CalculatorResults => {
    const { province, isCCPC, rdSalaries, rdMaterials, rdContractors, rdOverhead } = inputs;
    
    // Total eligible expenditures
    const totalEligible = rdSalaries + rdMaterials + rdContractors + rdOverhead;
    
    // Federal credit calculation
    let federalCredit = 0;
    let federalRefundable = 0;
    
    if (isCCPC) {
      // CCPC gets enhanced rate on first $3M
      const enhancedPortion = Math.min(totalEligible, FEDERAL_RATES.ccpc.threshold);
      const regularPortion = Math.max(0, totalEligible - FEDERAL_RATES.ccpc.threshold);
      
      const enhancedCredit = enhancedPortion * FEDERAL_RATES.ccpc.enhanced;
      const regularCredit = regularPortion * FEDERAL_RATES.ccpc.regular;
      
      federalCredit = enhancedCredit + regularCredit;
      federalRefundable = enhancedCredit; // Only enhanced portion is refundable
    } else {
      federalCredit = totalEligible * FEDERAL_RATES.other.rate;
      federalRefundable = 0; // Non-CCPC credits are not refundable
    }
    
    // Provincial credit calculation
    const provincialRate = PROVINCIAL_RATES[province];
    const provincialCredit = totalEligible * provincialRate.rate;
    const provincialRefundable = provincialRate.refundable ? provincialCredit : 0;
    
    // Total credit
    const totalCredit = federalCredit + provincialCredit;
    
    // Breakdown by category
    const breakdown = [
      {
        category: isEn ? 'R&D Salaries' : 'Salaires R&D',
        amount: rdSalaries,
        federalCredit: isCCPC 
          ? Math.min(rdSalaries, FEDERAL_RATES.ccpc.threshold) * FEDERAL_RATES.ccpc.enhanced
          : rdSalaries * FEDERAL_RATES.other.rate,
        provincialCredit: rdSalaries * provincialRate.rate,
      },
      {
        category: isEn ? 'Materials' : 'Matériaux',
        amount: rdMaterials,
        federalCredit: isCCPC 
          ? Math.min(rdMaterials, FEDERAL_RATES.ccpc.threshold) * FEDERAL_RATES.ccpc.enhanced
          : rdMaterials * FEDERAL_RATES.other.rate,
        provincialCredit: rdMaterials * provincialRate.rate,
      },
      {
        category: isEn ? 'Contractors' : 'Sous-traitants',
        amount: rdContractors,
        federalCredit: isCCPC 
          ? Math.min(rdContractors, FEDERAL_RATES.ccpc.threshold) * FEDERAL_RATES.ccpc.enhanced * 0.8 // 80% of contractor costs eligible
          : rdContractors * FEDERAL_RATES.other.rate * 0.8,
        provincialCredit: rdContractors * provincialRate.rate * 0.8,
      },
      {
        category: isEn ? 'Overhead' : 'Frais généraux',
        amount: rdOverhead,
        federalCredit: isCCPC 
          ? Math.min(rdOverhead, FEDERAL_RATES.ccpc.threshold) * FEDERAL_RATES.ccpc.enhanced
          : rdOverhead * FEDERAL_RATES.other.rate,
        provincialCredit: rdOverhead * provincialRate.rate,
      },
    ].filter(item => item.amount > 0);
    
    return {
      totalEligible,
      federalCredit,
      provincialCredit,
      totalCredit,
      federalRefundable,
      provincialRefundable,
      breakdown,
    };
  };

  // Handle calculation
  const handleCalculate = () => {
    const calculatedResults = calculateCredits();
    setResults(calculatedResults);
    setStep(3);
    setShowLeadForm(true);
  };

  // Handle lead form submission
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // TODO: Send to API
    console.log('Lead submitted:', {
      ...leadForm,
      inputs,
      results,
    });
    
    setLeadSubmitted(true);
    
    // Track event
    if (typeof window !== 'undefined' && window.gtagTrackEvent) {
      window.gtagTrackEvent('sred_calculator_lead', {
        province: inputs.province,
        total_eligible: inputs.rdSalaries + inputs.rdMaterials + inputs.rdContractors + inputs.rdOverhead,
        estimated_credit: results?.totalCredit || 0,
      });
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
          style={{ backgroundColor: `${primaryColor}10` }}
        >
          <Calculator className="w-5 h-5" style={{ color: primaryColor }} />
          <span className="text-sm font-medium" style={{ color: primaryColor }}>
            {isEn ? 'Free Calculator' : 'Calculateur gratuit'}
          </span>
        </div>
        <h2 
          className="text-2xl sm:text-3xl font-bold mb-3"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'SR&ED Tax Credit Calculator' : 'Calculateur de crédit d\'impôt RSDE'}
        </h2>
        <p 
          className="text-lg max-w-2xl mx-auto"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {isEn 
            ? 'Estimate your potential SR&ED tax credit in under 2 minutes'
            : 'Estimez votre crédit d\'impôt RSDE potentiel en moins de 2 minutes'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= s ? 'text-white' : ''
              }`}
              style={{ 
                backgroundColor: step >= s ? primaryColor : 'rgb(var(--color-bg-subtle))',
                color: step >= s ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div 
                className="w-12 h-1 mx-2 rounded"
                style={{ 
                  backgroundColor: step > s ? primaryColor : 'rgb(var(--color-border))',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Info */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-2xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <h3 
            className="text-lg font-semibold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? '1. Business Information' : '1. Information sur l\'entreprise'}
          </h3>

          <div className="space-y-6">
            {/* Province */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Province' : 'Province'}
              </label>
              <select
                value={inputs.province}
                onChange={(e) => setInputs({ ...inputs, province: e.target.value })}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {Object.entries(PROVINCIAL_RATES).map(([code, { name }]) => (
                  <option key={code} value={code}>
                    {name} {code !== 'OTHER' && `(${(PROVINCIAL_RATES[code].rate * 100).toFixed(1)}%)`}
                  </option>
                ))}
              </select>
            </div>

            {/* CCPC Status */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Is your company a CCPC?' : 'Votre entreprise est-elle une SPCC?'}
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setInputs({ ...inputs, isCCPC: true })}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    inputs.isCCPC ? 'text-white' : ''
                  }`}
                  style={{ 
                    backgroundColor: inputs.isCCPC ? primaryColor : 'rgb(var(--color-bg))',
                    border: `1px solid ${inputs.isCCPC ? primaryColor : 'rgb(var(--color-border))'}`,
                    color: inputs.isCCPC ? 'white' : 'rgb(var(--color-text))',
                  }}
                >
                  {isEn ? 'Yes (CCPC)' : 'Oui (SPCC)'}
                </button>
                <button
                  type="button"
                  onClick={() => setInputs({ ...inputs, isCCPC: false })}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    !inputs.isCCPC ? 'text-white' : ''
                  }`}
                  style={{ 
                    backgroundColor: !inputs.isCCPC ? primaryColor : 'rgb(var(--color-bg))',
                    border: `1px solid ${!inputs.isCCPC ? primaryColor : 'rgb(var(--color-border))'}`,
                    color: !inputs.isCCPC ? 'white' : 'rgb(var(--color-text))',
                  }}
                >
                  {isEn ? 'No' : 'Non'}
                </button>
              </div>
              <p 
                className="text-xs mt-2 flex items-start gap-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {isEn 
                  ? 'A CCPC (Canadian-Controlled Private Corporation) qualifies for enhanced 35% refundable credits on the first $3M.'
                  : 'Une SPCC (Société privée sous contrôle canadien) a droit à des crédits remboursables bonifiés de 35% sur les premiers 3 M$.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: primaryColor,
              color: 'white',
            }}
          >
            {isEn ? 'Next: R&D Expenditures' : 'Suivant: Dépenses R&D'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Step 2: R&D Expenditures */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-2xl"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <h3 
            className="text-lg font-semibold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? '2. Annual R&D Expenditures' : '2. Dépenses R&D annuelles'}
          </h3>

          <div className="space-y-6">
            {/* R&D Salaries */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Users className="w-4 h-4 inline mr-2" />
                {isEn ? 'R&D Employee Salaries' : 'Salaires des employés R&D'}
              </label>
              <div className="relative">
                <span 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={inputs.rdSalaries || ''}
                  onChange={(e) => setInputs({ ...inputs, rdSalaries: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
              <p 
                className="text-xs mt-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Salaries for employees directly involved in R&D activities'
                  : 'Salaires des employés directement impliqués dans les activités R&D'}
              </p>
            </div>

            {/* R&D Materials */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                {isEn ? 'Materials & Supplies' : 'Matériaux et fournitures'}
              </label>
              <div className="relative">
                <span 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={inputs.rdMaterials || ''}
                  onChange={(e) => setInputs({ ...inputs, rdMaterials: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
            </div>

            {/* R&D Contractors */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                {isEn ? 'Third-Party Contractors' : 'Sous-traitants tiers'}
              </label>
              <div className="relative">
                <span 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={inputs.rdContractors || ''}
                  onChange={(e) => setInputs({ ...inputs, rdContractors: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
              <p 
                className="text-xs mt-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Note: Only 80% of contractor costs are eligible for SR&ED'
                  : 'Note: Seulement 80% des coûts des sous-traitants sont admissibles au RSDE'}
              </p>
            </div>

            {/* R&D Overhead */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                {isEn ? 'Overhead (Optional)' : 'Frais généraux (Optionnel)'}
              </label>
              <div className="relative">
                <span 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  $
                </span>
                <input
                  type="number"
                  value={inputs.rdOverhead || ''}
                  onChange={(e) => setInputs({ ...inputs, rdOverhead: Number(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition-all"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              }}
            >
              {isEn ? 'Back' : 'Retour'}
            </button>
            <button
              onClick={handleCalculate}
              disabled={inputs.rdSalaries + inputs.rdMaterials + inputs.rdContractors + inputs.rdOverhead === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: primaryColor,
                color: 'white',
              }}
            >
              {isEn ? 'Calculate Credits' : 'Calculer les crédits'}
              <Calculator className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Results */}
      {step === 3 && results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Results Card */}
          <div 
            className="p-6 sm:p-8 rounded-2xl"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-6">
              {isEn ? 'Your Estimated SR&ED Tax Credit' : 'Votre crédit d\'impôt RSDE estimé'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/10">
                <p className="text-sm text-white/70 mb-1">
                  {isEn ? 'Federal Credit' : 'Crédit fédéral'}
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(results.federalCredit)}
                </p>
                {results.federalRefundable > 0 && (
                  <p className="text-xs text-white/60 mt-1">
                    {isEn 
                      ? `${formatCurrency(results.federalRefundable)} refundable`
                      : `${formatCurrency(results.federalRefundable)} remboursable`}
                  </p>
                )}
              </div>
              
              <div className="p-4 rounded-xl bg-white/10">
                <p className="text-sm text-white/70 mb-1">
                  {isEn ? 'Provincial Credit' : 'Crédit provincial'}
                  <span className="text-xs ml-1">({PROVINCIAL_RATES[inputs.province].name})</span>
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(results.provincialCredit)}
                </p>
                {PROVINCIAL_RATES[inputs.province].refundable && (
                  <p className="text-xs text-white/60 mt-1">
                    {isEn ? 'Fully refundable' : 'Entièrement remboursable'}
                  </p>
                )}
              </div>
              
              <div className="p-4 rounded-xl bg-white/20">
                <p className="text-sm text-white/70 mb-1">
                  {isEn ? 'Total Credit' : 'Crédit total'}
                </p>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(results.totalCredit)}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {isEn 
                    ? `${((results.totalCredit / results.totalEligible) * 100).toFixed(1)}% of eligible expenses`
                    : `${((results.totalCredit / results.totalEligible) * 100).toFixed(1)}% des dépenses admissibles`}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            {results.breakdown.length > 0 && (
              <div className="bg-white/10 rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-3">
                  {isEn ? 'Breakdown by Category' : 'Répartition par catégorie'}
                </p>
                <div className="space-y-2">
                  {results.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{item.category}</span>
                      <span className="text-white font-medium">
                        {formatCurrency(item.federalCredit + item.provincialCredit)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lead Capture Form */}
          {showLeadForm && !leadSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-2xl"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Get Your Detailed Report' : 'Obtenez votre rapport détaillé'}
              </h3>
              <p 
                className="text-sm mb-6"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn 
                  ? 'Enter your details to receive a detailed SR&ED eligibility report and speak with an expert.'
                  : 'Entrez vos coordonnées pour recevoir un rapport détaillé d\'admissibilité au RSDE et parler avec un expert.'}
              </p>

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? 'Name' : 'Nom'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    />
                  </div>
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? 'Email' : 'Courriel'} *
                    </label>
                    <input
                      type="email"
                      required
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    />
                  </div>
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? 'Company' : 'Entreprise'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={leadForm.company}
                      onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    />
                  </div>
                  <div>
                    <label 
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? 'Phone (optional)' : 'Téléphone (optionnel)'}
                    </label>
                    <input
                      type="tel"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg))',
                        border: '1px solid rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: primaryColor,
                    color: 'white',
                  }}
                >
                  {isEn ? 'Get Detailed Report' : 'Obtenir le rapport détaillé'}
                  <ArrowRight className="w-5 h-5" />
                </button>

                <p 
                  className="text-xs text-center"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {isEn 
                    ? 'By submitting, you agree to our privacy policy. We\'ll never spam you.'
                    : 'En soumettant, vous acceptez notre politique de confidentialité. Nous ne vous enverrons jamais de spam.'}
                </p>
              </form>
            </motion.div>
          )}

          {/* Success Message */}
          {leadSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 sm:p-8 rounded-2xl text-center"
              style={{ 
                backgroundColor: `${primaryColor}10`,
                border: `1px solid ${primaryColor}20`,
              }}
            >
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Check className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Thank You!' : 'Merci!'}
              </h3>
              <p 
                className="text-sm"
                style={{ color: 'rgb(var(--color-text-secondary))' }}
              >
                {isEn 
                  ? 'We\'ll send your detailed SR&ED report shortly. An expert will reach out within 24 hours.'
                  : 'Nous vous enverrons votre rapport détaillé RSDE sous peu. Un expert vous contactera dans les 24 heures.'}
              </p>
            </motion.div>
          )}

          {/* Disclaimer */}
          <div 
            className="p-4 rounded-xl flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-subtle))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <p 
              className="text-xs"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn 
                ? 'This calculator provides an estimate only. Actual SR&ED eligibility depends on project-specific technical and financial documentation. Consult with a qualified SR&ED consultant for accurate assessment.'
                : 'Ce calculateur fournit une estimation uniquement. L\'admissibilité réelle au RSDE dépend de la documentation technique et financière spécifique au projet. Consultez un consultant RSDE qualifié pour une évaluation précise.'}
            </p>
          </div>

          {/* Recalculate Button */}
          <button
            onClick={() => {
              setStep(1);
              setResults(null);
              setShowLeadForm(false);
              setLeadSubmitted(false);
            }}
            className="w-full px-6 py-3 rounded-lg font-medium transition-all"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            {isEn ? 'Start Over' : 'Recommencer'}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtagTrackEvent?: (eventName: string, params: Record<string, unknown>) => void;
  }
}
