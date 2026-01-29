/**
 * FlywheelVisualization Component
 * 
 * Clean, modern visualization showing the compounding intelligence effect
 * with a horizontal flow layout.
 */

import { motion } from 'framer-motion';
import { Building2, Target, Layers, Lightbulb, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface FlywheelVisualizationProps {
  theme: {
    green: string;
    greenDark: string;
    gold: string;
  };
  isDark: boolean;
}

export default function FlywheelVisualization({ theme, isDark }: FlywheelVisualizationProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const flywheelSteps = [
    { 
      label: isEn ? 'More Businesses' : 'Plus d\'entreprises', 
      icon: Building2,
    },
    { 
      label: isEn ? 'More Decisions' : 'Plus de décisions', 
      icon: Target,
    },
    { 
      label: isEn ? 'Richer Patterns' : 'Modèles enrichis', 
      icon: Layers,
    },
    { 
      label: isEn ? 'Better Insights' : 'Meilleurs insights', 
      icon: Lightbulb,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Horizontal Flow Layout */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {flywheelSteps.map((step, idx) => (
          <motion.div
            key={idx}
            className="flex items-center"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.15, duration: 0.4, ease: "easeOut" }}
          >
            {/* Step Card */}
            <motion.div
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 1)'}`,
                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
              whileHover={{ 
                scale: 1.02,
                borderColor: theme.gold,
              }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${theme.gold}15` }}
              >
                <step.icon 
                  className="w-4 h-4 sm:w-5 sm:h-5" 
                  style={{ color: theme.gold }} 
                />
              </div>
              <span 
                className="text-xs sm:text-sm font-medium whitespace-nowrap"
                style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
              >
                {step.label}
              </span>
            </motion.div>

            {/* Arrow (except after last item) */}
            {idx < flywheelSteps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 + 0.1, duration: 0.3 }}
                className="mx-1 sm:mx-2"
              >
                <ArrowRight 
                  className="w-4 h-4 sm:w-5 sm:h-5" 
                  style={{ color: theme.gold, opacity: 0.6 }} 
                />
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Loop Back Arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="ml-1 sm:ml-2"
        >
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center"
            style={{ 
              backgroundColor: `${theme.green}15`,
              border: `2px dashed ${theme.green}40`,
            }}
          >
            <svg 
              className="w-4 h-4 sm:w-5 sm:h-5" 
              viewBox="0 0 24 24" 
              fill="none"
              style={{ color: theme.green }}
            >
              <path 
                d="M17 1l4 4-4 4" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M3 11V9a4 4 0 014-4h14" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M7 23l-4-4 4-4" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              <path 
                d="M21 13v2a4 4 0 01-4 4H3" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="text-center mt-4 text-xs sm:text-sm"
        style={{ color: isDark ? '#64748b' : '#94a3b8' }}
      >
        {isEn ? 'A continuous cycle of improvement' : 'Un cycle continu d\'amélioration'}
      </motion.p>
    </div>
  );
}

// Static version for non-animated contexts
export function FlywheelStatic({ theme, isDark }: FlywheelVisualizationProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const steps = [
    { label: isEn ? 'More Businesses' : 'Plus d\'entreprises', icon: Building2 },
    { label: isEn ? 'More Decisions' : 'Plus de décisions', icon: Target },
    { label: isEn ? 'Richer Patterns' : 'Modèles enrichis', icon: Layers },
    { label: isEn ? 'Better Insights' : 'Meilleurs insights', icon: Lightbulb },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(229, 231, 235, 1)'}`,
            }}
          >
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${theme.gold}15` }}
            >
              <step.icon className="w-4 h-4" style={{ color: theme.gold }} />
            </div>
            <span 
              className="text-xs font-medium"
              style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <ArrowRight 
              className="w-4 h-4 mx-1.5" 
              style={{ color: theme.gold, opacity: 0.6 }} 
            />
          )}
        </div>
      ))}
      <div 
        className="w-7 h-7 ml-1.5 rounded-full flex items-center justify-center"
        style={{ 
          backgroundColor: `${theme.green}15`,
          border: `2px dashed ${theme.green}40`,
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" style={{ color: theme.green }}>
          <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 11V9a4 4 0 014-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
