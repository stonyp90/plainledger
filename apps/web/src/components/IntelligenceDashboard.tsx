/**
 * IntelligenceDashboard Component
 * 
 * Investor-facing dashboard showing compounding industry knowledge metrics.
 * Part of the Context Intelligence Platform.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Database, 
  Target, 
  Layers, 
  Shield, 
  Brain,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { intelligenceApi } from '../lib/intelligence-api';
import { useHasRealData } from '../hooks/useHasRealData';

export interface IntelligenceMetrics {
  // Scale metrics
  totalDecisionsCaptured: number;
  uniqueBusinesses: number;
  industriesCovered: number;
  
  // Quality metrics
  patternAccuracy: number; // Percentage
  predictionSuccessRate: number; // Percentage
  avgTimeToInsight: string; // Duration
  
  // Moat metrics
  proprietaryPatterns: number;
  monthsOfData: number;
  competitorCatchUpTime: string; // Duration
}

interface IntelligenceDashboardProps {
  metrics?: IntelligenceMetrics;
  theme?: {
    green: string;
    gold: string;
  };
  isDark?: boolean;
}

// Mock data for demonstration
const DEFAULT_METRICS: IntelligenceMetrics = {
  totalDecisionsCaptured: 847000,
  uniqueBusinesses: 75000,
  industriesCovered: 15,
  patternAccuracy: 92,
  predictionSuccessRate: 88,
  avgTimeToInsight: '2.3 seconds',
  proprietaryPatterns: 1500,
  monthsOfData: 18,
  competitorCatchUpTime: '18 months',
};

export default function IntelligenceDashboard({
  metrics: initialMetrics,
  theme = { green: 'rgb(var(--color-primary-500))', gold: '#d4af37' }, // Keep classic gold for branding
  isDark = false,
}: IntelligenceDashboardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { hasRealData, shouldShowSandboxData } = useHasRealData();
  const [metrics, setMetrics] = useState<IntelligenceMetrics | null>(initialMetrics || null);
  const [loading, setLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics from API
  useEffect(() => {
    if (!initialMetrics) {
      setLoading(true);
      setError(null);
      intelligenceApi.getMetrics()
        .then(response => {
          if (response.data) {
            setMetrics(response.data);
          } else {
            setError('No data available');
          }
        })
        .catch(error => {
          console.error('Failed to fetch intelligence metrics:', error);
          setError('Failed to load metrics');
          // Only use default metrics if sandbox data should be shown (free users only)
          if (shouldShowSandboxData) {
            setMetrics(DEFAULT_METRICS);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialMetrics, hasRealData, shouldShowSandboxData]);
  
  // Show loading or error state if no real data
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Loading intelligence metrics...' : 'Chargement des métriques d\'intelligence...'}
        </p>
      </div>
    );
  }
  
  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Unable to load intelligence metrics' : 'Impossible de charger les métriques d\'intelligence'}
          </p>
          <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Connect your accounting software to view metrics' 
              : 'Connectez votre logiciel comptable pour voir les métriques'}
          </p>
        </div>
      </div>
    );
  }
  
  if (!metrics) {
    return null;
  }

  // Accuracy trend data (mock)
  const accuracyTrend = [
    { month: 'M1', accuracy: 72, decisions: 1000 },
    { month: 'M3', accuracy: 78, decisions: 5000 },
    { month: 'M6', accuracy: 84, decisions: 15000 },
    { month: 'M9', accuracy: 88, decisions: 35000 },
    { month: 'M12', accuracy: 92, decisions: 75000 },
    { month: 'M18', accuracy: metrics?.patternAccuracy ?? 0, decisions: metrics?.totalDecisionsCaptured ?? 0 },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div 
            className="w-8 h-8 border-4 border-gray-300 rounded-full animate-spin mx-auto mb-4"
            style={{ borderTopColor: 'rgb(var(--color-primary-500))' }}
          />
          <p style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}>
            {isEn ? 'Loading intelligence metrics...' : 'Chargement des métriques...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
        >
          {isEn ? 'Compounding Industry Intelligence' : 'Intelligence industrielle composée'}
        </h1>
        <p 
          className="text-base max-w-3xl mx-auto"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          {isEn 
            ? `Every decision captured makes our recommendations smarter. We've analyzed ${(metrics?.totalDecisionsCaptured ?? 0).toLocaleString()} real business decisions to build proprietary industry patterns that no competitor can replicate.`
            : `Chaque décision capturée rend nos recommandations plus intelligentes. Nous avons analysé ${(metrics?.totalDecisionsCaptured ?? 0).toLocaleString()} vraies décisions d'affaires pour créer des modèles sectoriels propriétaires qu'aucun concurrent ne peut répliquer.`}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Database}
          value={(metrics?.totalDecisionsCaptured ?? 0).toLocaleString()}
          label={isEn ? 'Decisions Analyzed' : 'Décisions analysées'}
          trend="+12% this week"
          trendUp={true}
          theme={theme}
          isDark={isDark}
        />
        <MetricCard
          icon={Target}
          value={`${metrics?.patternAccuracy ?? 0}%`}
          label={isEn ? 'Pattern Accuracy' : 'Précision des modèles'}
          trend={`Up from 72% at launch`}
          trendUp={true}
          theme={theme}
          isDark={isDark}
        />
        <MetricCard
          icon={Layers}
          value={(metrics?.industriesCovered ?? 0).toString()}
          label={isEn ? 'Industries Covered' : 'Industries couvertes'}
          trend={isEn ? 'Deep expertise' : 'Expertise profonde'}
          theme={theme}
          isDark={isDark}
        />
        <MetricCard
          icon={Shield}
          value={(metrics?.monthsOfData ?? 0).toString()}
          label={isEn ? 'Months of Data' : 'Mois de données'}
          trend={isEn ? 'Competitive moat' : 'Avantage concurrentiel'}
          theme={theme}
          isDark={isDark}
        />
      </div>

      {/* Accuracy Over Time Chart */}
      <div 
        className="p-6 rounded-2xl"
        style={{ 
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="text-lg font-bold"
            style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
          >
            {isEn ? 'Recommendation Accuracy Over Time' : 'Précision des recommandations dans le temps'}
          </h3>
          <BarChart3 className="w-5 h-5" style={{ color: theme.gold }} />
        </div>
        
        {/* Simple bar chart visualization */}
        <div className="flex items-end gap-2 h-48 mt-6">
          {accuracyTrend.map((point, idx) => (
            <motion.div
              key={point.month}
              initial={{ height: 0 }}
              animate={{ height: `${(point.accuracy / 100) * 100}%` }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <div
                className="w-full rounded-t-lg relative group"
                style={{ 
                  backgroundColor: theme.gold,
                  height: `${(point.accuracy / 100) * 100}%`,
                  minHeight: '20px',
                }}
              >
                <div 
                  className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  style={{ color: theme.gold }}
                >
                  {point.accuracy}%
                </div>
              </div>
              <div 
                className="text-xs mt-2 font-medium"
                style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
              >
                {point.month}
              </div>
            </motion.div>
          ))}
        </div>
        
        <p 
          className="text-sm mt-4 text-center"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          {isEn 
            ? 'Recommendation accuracy improves as our pattern library grows'
            : 'La précision des recommandations s\'améliore à mesure que notre bibliothèque de modèles grandit'}
        </p>
      </div>

      {/* Industry Coverage Grid */}
      <div>
        <h3 
          className="text-lg font-bold mb-4"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
        >
          {isEn ? 'Industry Pattern Maturity' : 'Maturité des modèles sectoriels'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { name: isEn ? 'Restaurant' : 'Restaurant', decisions: 125000, patterns: 250, accuracy: 94 },
            { name: isEn ? 'Retail' : 'Commerce', decisions: 98000, patterns: 180, accuracy: 91 },
            { name: isEn ? 'Construction' : 'Construction', decisions: 87000, patterns: 165, accuracy: 89 },
            { name: isEn ? 'Professional Services' : 'Services professionnels', decisions: 95000, patterns: 195, accuracy: 92 },
            { name: isEn ? 'Real Estate' : 'Immobilier', decisions: 72000, patterns: 140, accuracy: 87 },
          ].map((industry, idx) => (
            <IndustryCard
              key={idx}
              industry={industry}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </div>
      </div>

      {/* Competitive Moat Indicator */}
      <div 
        className="p-6 rounded-2xl"
        style={{ 
          background: `linear-gradient(135deg, ${theme.gold}10 0%, ${theme.green}10 100%)`,
          border: `1px solid ${theme.gold}20`,
        }}
      >
        <h3 
          className="text-lg font-bold mb-4"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
        >
          {isEn ? 'Competitive Moat Depth' : 'Profondeur de l\'avantage concurrentiel'}
        </h3>
        
        <div className="mb-4">
          <div 
            className="h-8 rounded-lg flex items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: `${theme.gold}20` }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((metrics?.monthsOfData ?? 0) / 24) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.gold }}
            >
              <span className="text-xs font-bold text-white">
                {metrics?.monthsOfData ?? 0} {isEn ? 'months' : 'mois'}
              </span>
            </motion.div>
          </div>
        </div>
        
        <p 
          className="text-sm"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          {isEn 
            ? `With ${metrics?.monthsOfData ?? 0} months of decision data across ${metrics?.industriesCovered ?? 0} industries, a competitor would need ${metrics?.competitorCatchUpTime ?? 0} to match our insight depth at current growth rates.`
            : `Avec ${metrics?.monthsOfData ?? 0} mois de données de décisions dans ${metrics?.industriesCovered ?? 0} industries, un concurrent aurait besoin de ${metrics?.competitorCatchUpTime ?? 0} pour égaler notre profondeur d'insight aux taux de croissance actuels.`}
        </p>
      </div>

      {/* Network Effect Messaging */}
      <div 
        className="p-6 rounded-2xl text-center"
        style={{ 
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
        }}
      >
        <Brain className="w-12 h-12 mx-auto mb-4" style={{ color: theme.gold }} />
        <h3 
          className="text-lg font-bold mb-2"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
        >
          {isEn ? 'The Data Flywheel Effect' : 'L\'effet volant de données'}
        </h3>
        <p 
          className="text-sm max-w-2xl mx-auto"
          style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
        >
          {isEn 
            ? `Better insights → More users → More decisions → Richer patterns → Better insights. This flywheel compounds our competitive advantage daily. Our intelligence improves with scale. Each new business adds to our pattern library, creating recommendations that are ${metrics?.patternAccuracy ?? 0}% accurate - up from 72% at launch.`
            : `Meilleurs insights → Plus d'utilisateurs → Plus de décisions → Modèles plus riches → Meilleurs insights. Ce volant renforce notre avantage concurrentiel quotidiennement. Notre intelligence s'améliore avec l'échelle. Chaque nouvelle entreprise ajoute à notre bibliothèque de modèles, créant des recommandations qui sont précises à ${metrics?.patternAccuracy ?? 0}% - en hausse depuis 72% au lancement.`}
        </p>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: any;
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
  theme: { green: string; gold: string };
  isDark: boolean;
}

function MetricCard({ icon: Icon, value, label, trend, trendUp, theme, isDark }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl"
      style={{ 
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
      }}
    >
      <Icon className="w-6 h-6 mb-3" style={{ color: theme.gold }} />
      <div 
        className="text-2xl font-bold mb-1"
        style={{ color: theme.gold }}
      >
        {value}
      </div>
      <div 
        className="text-sm font-medium mb-1"
        style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
      >
        {label}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp && <ArrowUpRight className="w-3 h-3" style={{ color: theme.green }} />}
          <span 
            className="text-xs"
            style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
          >
            {trend}
          </span>
        </div>
      )}
    </motion.div>
  );
}

interface IndustryCardProps {
  industry: {
    name: string;
    decisions: number;
    patterns: number;
    accuracy: number;
  };
  theme: { green: string; gold: string };
  isDark: boolean;
}

function IndustryCard({ industry, theme, isDark }: IndustryCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const status = industry.decisions > 100000 ? 'mature' : 'growing';

  return (
    <div 
      className="p-4 rounded-xl"
      style={{ 
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
        border: `1px solid ${status === 'mature' ? theme.gold : isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)'}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 
          className="text-sm font-semibold"
          style={{ color: isDark ? 'rgb(241, 245, 249)' : 'rgb(30, 41, 59)' }}
        >
          {industry.name}
        </h4>
        {status === 'mature' && (
          <Shield className="w-4 h-4" style={{ color: theme.gold }} />
        )}
      </div>
      <div 
        className="text-xs mb-1"
        style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
      >
        {industry.decisions.toLocaleString()} {isEn ? 'decisions' : 'décisions'}
      </div>
      <div 
        className="text-xs mb-1"
        style={{ color: isDark ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)' }}
      >
        {industry.patterns} {isEn ? 'patterns' : 'modèles'}
      </div>
      <div 
        className="text-xs font-semibold"
        style={{ color: theme.gold }}
      >
        {industry.accuracy}% {isEn ? 'accuracy' : 'précision'}
      </div>
    </div>
  );
}
