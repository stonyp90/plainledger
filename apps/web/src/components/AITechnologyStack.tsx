/**
 * AITechnologyStack Component
 * 
 * Showcases the 7 AI providers and proprietary training pipeline
 * for investor/executive audiences.
 */

import { motion } from 'framer-motion';
import { Cpu, Database, Target, Layers, Shield, RefreshCw } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface AITechnologyStackProps {
  theme: {
    green: string;
    greenDark: string;
    gold: string;
  };
  isDark: boolean;
}

interface AIProvider {
  name: string;
  description: string;
  descriptionFr: string;
  type: 'commercial' | 'open-source' | 'infrastructure' | 'proprietary';
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'OpenAI',
    description: 'GPT-4 for complex analysis',
    descriptionFr: 'GPT-4 pour analyses complexes',
    type: 'commercial',
  },
  {
    name: 'Anthropic',
    description: 'Claude for safe reasoning',
    descriptionFr: 'Claude pour raisonnement sûr',
    type: 'commercial',
  },
  {
    name: 'Google',
    description: 'Gemini for multi-modal',
    descriptionFr: 'Gemini pour multi-modal',
    type: 'commercial',
  },
  {
    name: 'Mistral',
    description: 'Fine-tuned on your industry',
    descriptionFr: 'Affiné sur votre industrie',
    type: 'open-source',
  },
  {
    name: 'AWS Bedrock',
    description: 'Knowledge base for patterns',
    descriptionFr: 'Base de connaissances',
    type: 'infrastructure',
  },
  {
    name: 'PlainLedger AI',
    description: 'Trained on 847K decisions',
    descriptionFr: 'Entraîné sur 847K décisions',
    type: 'proprietary',
  },
];

export default function AITechnologyStack({ theme, isDark }: AITechnologyStackProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div className="w-full">
      {/* Provider Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {AI_PROVIDERS.map((provider, idx) => (
          <motion.div
            key={provider.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`relative p-4 rounded-xl text-center transition-all duration-300 ${
              provider.type === 'proprietary' ? 'ring-2' : ''
            }`}
            style={{ 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${
                provider.type === 'proprietary' 
                  ? theme.gold 
                  : isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'
              }`,
              ringColor: provider.type === 'proprietary' ? theme.gold : 'transparent',
            }}
          >
            {provider.type === 'proprietary' && (
              <div 
                className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide whitespace-nowrap"
                style={{ backgroundColor: theme.gold, color: 'white' }}
              >
                {isEn ? 'Proprietary' : 'Propriétaire'}
              </div>
            )}
            
            <div 
              className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: provider.type === 'proprietary' 
                  ? `${theme.gold}20` 
                  : `${theme.green}15` 
              }}
            >
              <Cpu 
                className="w-5 h-5" 
                style={{ 
                  color: provider.type === 'proprietary' ? theme.gold : theme.green 
                }} 
              />
            </div>
            
            <div 
              className="text-sm font-semibold mb-1"
              style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            >
              {provider.name}
            </div>
            <div 
              className="text-[10px] leading-tight"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {isEn ? provider.description : provider.descriptionFr}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Training Stats */}
      <motion.div 
        className="p-5 sm:p-6 rounded-2xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ 
          background: `linear-gradient(135deg, ${theme.gold}10 0%, ${theme.green}10 100%)`,
          border: `1px solid ${theme.gold}20`
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div 
              className="text-2xl sm:text-3xl font-bold" 
              style={{ color: theme.gold }}
            >
              847K+
            </div>
            <div 
              className="text-xs"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {isEn ? 'Decisions in training data' : 'Décisions dans les données'}
            </div>
          </div>
          <div>
            <div 
              className="text-2xl sm:text-3xl font-bold" 
              style={{ color: theme.gold }}
            >
              7
            </div>
            <div 
              className="text-xs"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {isEn ? 'AI providers integrated' : 'Fournisseurs IA intégrés'}
            </div>
          </div>
          <div>
            <div 
              className="text-2xl sm:text-3xl font-bold" 
              style={{ color: theme.gold }}
            >
              15+
            </div>
            <div 
              className="text-xs"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {isEn ? 'Industries served' : 'Industries desservies'}
            </div>
          </div>
          <div>
            <div 
              className="text-2xl sm:text-3xl font-bold" 
              style={{ color: theme.gold }}
            >
              92%
            </div>
            <div 
              className="text-xs"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {isEn ? 'Recommendation accuracy' : 'Précision des recommandations'}
            </div>
          </div>
        </div>

        <div 
          className="mt-4 pt-4 text-center text-sm"
          style={{ 
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            color: isDark ? '#94a3b8' : '#64748b'
          }}
        >
          <span className="mr-1">🔒</span>
          {isEn 
            ? 'Your data improves YOUR industry insights. We never share data between industries.'
            : 'Vos données améliorent VOS insights sectoriels. Nous ne partageons jamais entre industries.'}
        </div>
      </motion.div>

    </div>
  );
}

// Compact version for use in other sections
export function AIStackBadge({ theme, isDark }: AITechnologyStackProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: `${theme.gold}15`,
        border: `1px solid ${theme.gold}25`,
        color: theme.gold
      }}
    >
      <RefreshCw className="w-3 h-3" />
      {isEn ? '7 AI providers • 99.9% uptime' : '7 fournisseurs IA • 99,9% disponibilité'}
    </div>
  );
}

// Key metrics row for landing page
export function AIMetricsRow({ theme, isDark }: AITechnologyStackProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const metrics = [
    { 
      value: '847K+', 
      label: isEn ? 'Business Decisions' : 'Décisions d\'affaires',
      icon: Database,
    },
    { 
      value: '97%', 
      label: isEn ? 'Detection Accuracy' : 'Précision de détection',
      icon: Target,
    },
    { 
      value: '15+', 
      label: isEn ? 'CPA-Calibrated Industries' : 'Industries calibrées par CPA',
      icon: Layers,
    },
    { 
      value: isEn ? 'Weekly' : 'Hebdo', 
      label: isEn ? 'Model Retraining' : 'Réentraînement du modèle',
      icon: Shield,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {metrics.map((metric, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1, duration: 0.4 }}
          className="p-4 rounded-xl text-center"
          style={{ 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
          }}
        >
          <metric.icon 
            className="w-6 h-6 mx-auto mb-2" 
            style={{ color: theme.gold }} 
          />
          <div 
            className="text-xl sm:text-2xl font-bold mb-1" 
            style={{ color: theme.gold }}
          >
            {metric.value}
          </div>
          <div 
            className="text-[10px] sm:text-xs"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {metric.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
