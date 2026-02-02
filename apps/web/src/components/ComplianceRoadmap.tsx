/**
 * Compliance Roadmap Component
 *
 * Displays current compliance status and roadmap for enterprise customers.
 * Shows what PlainLedger is currently compliant with and upcoming certifications.
 */

import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';
import {
  Check,
  Clock,
  Calendar,
  Shield,
  Server,
  Lock,
  Globe,
  Key,
  UserCheck,
  FileCheck,
  AlertCircle,
} from 'lucide-react';

// Theme
const primaryColor = '#059669';

// Current compliance items
const CURRENT_COMPLIANCE = [
  {
    id: 'pipeda',
    name: { en: 'PIPEDA', fr: 'PIPEDA' },
    description: { 
      en: 'Federal privacy law compliance',
      fr: 'Conformité à la loi fédérale sur la vie privée'
    },
    icon: Shield,
  },
  {
    id: 'law25',
    name: { en: 'Quebec Law 25', fr: 'Loi 25 du Québec' },
    description: { 
      en: 'Quebec privacy law compliance',
      fr: 'Conformité à la loi québécoise sur la vie privée'
    },
    icon: FileCheck,
  },
  {
    id: 'data-residency',
    name: { en: 'Canadian Data Residency', fr: 'Résidence des données au Canada' },
    description: { 
      en: 'AWS Canada (Montreal)',
      fr: 'AWS Canada (Montréal)'
    },
    icon: Server,
  },
  {
    id: 'encryption',
    name: { en: 'Encryption', fr: 'Chiffrement' },
    description: { 
      en: 'AES-256 at rest, TLS 1.3 in transit',
      fr: 'AES-256 au repos, TLS 1.3 en transit'
    },
    icon: Lock,
  },
  {
    id: 'mfa',
    name: { en: 'Multi-Factor Auth', fr: 'Auth. multi-facteurs' },
    description: { 
      en: 'TOTP and SMS verification',
      fr: 'Vérification TOTP et SMS'
    },
    icon: Key,
  },
  {
    id: 'rbac',
    name: { en: 'Role-Based Access', fr: 'Accès basé sur les rôles' },
    description: { 
      en: 'Granular permissions control',
      fr: 'Contrôle granulaire des permissions'
    },
    icon: UserCheck,
  },
];

// In progress items
const IN_PROGRESS = [
  {
    id: 'soc2-type1',
    name: { en: 'SOC 2 Type I', fr: 'SOC 2 Type I' },
    description: { 
      en: 'Point-in-time security audit',
      fr: 'Audit de sécurité ponctuel'
    },
    eta: 'Q2 2026',
    progress: 40,
    icon: Shield,
  },
  {
    id: 'pentest',
    name: { en: 'Penetration Testing', fr: 'Test de pénétration' },
    description: { 
      en: 'Third-party security assessment',
      fr: 'Évaluation de sécurité par un tiers'
    },
    eta: 'Q2 2026',
    progress: 20,
    icon: AlertCircle,
  },
];

// Roadmap items
const ROADMAP = [
  {
    id: 'soc2-type2',
    name: { en: 'SOC 2 Type II', fr: 'SOC 2 Type II' },
    description: { 
      en: 'Continuous security certification',
      fr: 'Certification de sécurité continue'
    },
    eta: 'Q4 2026',
    icon: Shield,
  },
  {
    id: 'iso27001',
    name: { en: 'ISO 27001', fr: 'ISO 27001' },
    description: { 
      en: 'International security standard',
      fr: 'Norme de sécurité internationale'
    },
    eta: '2027',
    icon: Globe,
  },
];

interface ComplianceRoadmapProps {
  variant?: 'full' | 'compact' | 'badges';
}

export default function ComplianceRoadmap({ variant = 'full' }: ComplianceRoadmapProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  // Compact badge-only version for footer
  if (variant === 'badges') {
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {CURRENT_COMPLIANCE.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${primaryColor}10`,
              color: primaryColor,
            }}
          >
            <Check className="w-3 h-3" />
            {isEn ? item.name.en : item.name.fr}
          </div>
        ))}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: 'rgb(var(--color-warning-100))',
            color: 'rgb(var(--color-warning-700))',
          }}
        >
          <Clock className="w-3 h-3" />
          SOC 2 Q2 2026
        </div>
      </div>
    );
  }

  // Compact version for landing page
  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CURRENT_COMPLIANCE.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="p-3 rounded-xl text-center"
              style={{ 
                backgroundColor: 'rgb(var(--color-surface))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div 
                className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <Icon className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <p 
                className="text-xs font-medium"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? item.name.en : item.name.fr}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Check className="w-3 h-3" style={{ color: primaryColor }} />
                <span className="text-[10px]" style={{ color: primaryColor }}>
                  {isEn ? 'Compliant' : 'Conforme'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Full version for Security page
  return (
    <div className="space-y-8">
      {/* Current Compliance */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <Check className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Current Compliance' : 'Conformité actuelle'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CURRENT_COMPLIANCE.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ 
                  backgroundColor: `${primaryColor}05`,
                  border: `1px solid ${primaryColor}20`,
                }}
              >
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p 
                      className="font-medium"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? item.name.en : item.name.fr}
                    </p>
                    <Check className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                  <p 
                    className="text-sm mt-0.5"
                    style={{ color: 'rgb(var(--color-text-secondary))' }}
                  >
                    {isEn ? item.description.en : item.description.fr}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* In Progress */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-warning-100))' }}
          >
            <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-warning-600))' }} />
          </div>
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'In Progress' : 'En cours'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {IN_PROGRESS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: 'rgb(var(--color-warning-100))' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-warning-600))' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p 
                        className="font-medium"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        {isEn ? item.name.en : item.name.fr}
                      </p>
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: 'rgb(var(--color-warning-100))',
                          color: 'rgb(var(--color-warning-700))',
                        }}
                      >
                        {item.eta}
                      </span>
                    </div>
                    <p 
                      className="text-sm mt-0.5"
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {isEn ? item.description.en : item.description.fr}
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div 
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
                >
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${item.progress}%`,
                      backgroundColor: 'rgb(var(--color-warning-500))',
                    }}
                  />
                </div>
                <p 
                  className="text-xs mt-1 text-right"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {item.progress}% {isEn ? 'complete' : 'complété'}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
          >
            <Calendar className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </div>
          <h3 
            className="text-lg font-semibold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Roadmap' : 'Feuille de route'}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROADMAP.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl flex items-start gap-3 opacity-75"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px dashed rgb(var(--color-border))',
                }}
              >
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p 
                      className="font-medium"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? item.name.en : item.name.fr}
                    </p>
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg-subtle))',
                        color: 'rgb(var(--color-text-muted))',
                      }}
                    >
                      {item.eta}
                    </span>
                  </div>
                  <p 
                    className="text-sm mt-0.5"
                    style={{ color: 'rgb(var(--color-text-muted))' }}
                  >
                    {isEn ? item.description.en : item.description.fr}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
