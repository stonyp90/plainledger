/**
 * FlywheelVisualization Component
 * 
 * Premium visualization showing the compounding intelligence loop.
 * Features smooth animations, hover interactions, and a flowing data effect.
 */

import { motion } from 'framer-motion';
import { Building2, Target, Layers, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
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
      color: theme.green,
    },
    { 
      label: isEn ? 'More Decisions' : 'Plus de décisions', 
      icon: Target,
      color: theme.gold,
    },
    { 
      label: isEn ? 'Richer Patterns' : 'Modèles enrichis', 
      icon: Layers,
      color: '#8b5cf6', // Purple for variety
    },
    { 
      label: isEn ? 'Better Insights' : 'Meilleurs insights', 
      icon: Lightbulb,
      color: theme.green,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto relative py-4">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? `radial-gradient(ellipse 80% 50% at 50% 50%, ${theme.green}08 0%, transparent 70%)`
            : `radial-gradient(ellipse 80% 50% at 50% 50%, ${theme.green}05 0%, transparent 70%)`,
        }}
      />

      {/* Main Flow Container */}
      <div className="relative flex flex-wrap items-center justify-center gap-y-4">
        {flywheelSteps.map((step, idx) => (
          <motion.div
            key={idx}
            className="flex items-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ 
              delay: idx * 0.12, 
              duration: 0.5, 
              ease: [0.25, 0.46, 0.45, 0.94] 
            }}
          >
            {/* Step Card */}
            <motion.div
              className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl cursor-default"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark 
                  ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.06)',
              }}
              whileHover={{ 
                scale: 1.03,
                boxShadow: isDark 
                  ? `0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px ${step.color}20`
                  : `0 8px 30px rgba(0, 0, 0, 0.1), 0 0 20px ${step.color}15`,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Hover glow ring */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  border: `1.5px solid ${step.color}40`,
                }}
              />
              
              {/* Icon Container */}
              <motion.div 
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                style={{ 
                  backgroundColor: `${step.color}12`,
                  border: `1px solid ${step.color}20`,
                }}
                whileHover={{ scale: 1.05 }}
              >
                {/* Subtle shimmer effect on hover */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, transparent 40%, ${step.color}15 50%, transparent 60%)`,
                  }}
                  animate={{
                    x: ['-100%', '200%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut",
                  }}
                />
                <step.icon 
                  className="w-4.5 h-4.5 sm:w-5 sm:h-5 relative z-10" 
                  style={{ color: step.color }} 
                  strokeWidth={1.8}
                />
              </motion.div>

              {/* Label */}
              <span 
                className="text-sm sm:text-[15px] font-medium whitespace-nowrap tracking-tight"
                style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
              >
                {step.label}
              </span>
            </motion.div>

            {/* Animated Connector */}
            {idx < flywheelSteps.length - 1 && (
              <div className="mx-3 sm:mx-4 flex items-center">
                {/* Flowing energy line */}
                <div 
                  className="relative w-8 sm:w-10 h-[3px] rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.6)',
                  }}
                >
                  {/* Animated gradient pulse */}
                  <motion.div
                    className="absolute inset-y-0 w-1/2 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${theme.gold}, transparent)`,
                    }}
                    animate={{
                      x: ['-50%', '200%'],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: idx * 0.2,
                      ease: "easeInOut",
                    }}
                  />
                </div>
                
                {/* Arrow head */}
                <motion.div
                  className="ml-0.5"
                  animate={{
                    x: [0, 3, 0],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: idx * 0.2,
                    ease: "easeInOut",
                  }}
                >
                  <svg 
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4" 
                    viewBox="0 0 24 24" 
                    fill="none"
                  >
                    <path 
                      d="M9 6l6 6-6 6" 
                      stroke={theme.gold}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>
            )}
          </motion.div>
        ))}

        {/* Loop Indicator - "Gets Smarter" */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5, ease: "backOut" }}
          className="ml-3 sm:ml-4"
        >
          <motion.div 
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center cursor-default group"
            style={{ 
              backgroundColor: `${theme.green}10`,
              border: `2px solid ${theme.green}25`,
            }}
            whileHover={{ 
              scale: 1.1,
              borderColor: `${theme.green}50`,
            }}
            animate={{ 
              boxShadow: [
                `0 0 0px ${theme.green}00`,
                `0 0 20px ${theme.green}30`,
                `0 0 0px ${theme.green}00`,
              ],
            }}
            transition={{ 
              boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
              scale: { type: "spring", stiffness: 400 },
            }}
          >
            {/* Rotating ring */}
            <motion.div
              className="absolute inset-[-3px] rounded-full"
              style={{
                border: `1px dashed ${theme.green}30`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Sparkle icon */}
            <Sparkles 
              className="w-4.5 h-4.5 sm:w-5 sm:h-5" 
              style={{ color: theme.green }}
              strokeWidth={2}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom flowing line - represents continuous improvement */}
      <div className="mt-6 sm:mt-8 flex justify-center">
        <div 
          className="relative w-full max-w-md h-[2px] rounded-full overflow-hidden"
          style={{ 
            backgroundColor: isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.5)',
          }}
        >
          {/* Multiple flowing particles */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-y-0 w-16 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${theme.green}80, transparent)`,
              }}
              animate={{
                x: ['-64px', 'calc(100% + 64px)'],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* "Gets Smarter" label */}
      <motion.div 
        className="mt-3 sm:mt-4 flex justify-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8 }}
      >
        <motion.span 
          className="text-xs sm:text-sm font-medium px-3 py-1 rounded-full"
          style={{ 
            color: theme.green,
            backgroundColor: `${theme.green}08`,
          }}
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {isEn ? '↻ Gets smarter every cycle' : '↻ S\'améliore à chaque cycle'}
        </motion.span>
      </motion.div>
    </div>
  );
}

// Static version for non-animated contexts
export function FlywheelStatic({ theme, isDark }: FlywheelVisualizationProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  const steps = [
    { label: isEn ? 'More Businesses' : 'Plus d\'entreprises', icon: Building2, color: theme.green },
    { label: isEn ? 'More Decisions' : 'Plus de décisions', icon: Target, color: theme.gold },
    { label: isEn ? 'Richer Patterns' : 'Modèles enrichis', icon: Layers, color: '#8b5cf6' },
    { label: isEn ? 'Better Insights' : 'Meilleurs insights', icon: Lightbulb, color: theme.green },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
              boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ 
                backgroundColor: `${step.color}12`,
                border: `1px solid ${step.color}20`,
              }}
            >
              <step.icon className="w-4 h-4" style={{ color: step.color }} strokeWidth={1.8} />
            </div>
            <span 
              className="text-sm font-medium"
              style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <ArrowRight 
              className="w-4 h-4 mx-2" 
              style={{ color: theme.gold, opacity: 0.6 }} 
            />
          )}
        </div>
      ))}
      <div 
        className="w-9 h-9 ml-2 rounded-full flex items-center justify-center"
        style={{ 
          backgroundColor: `${theme.green}10`,
          border: `2px solid ${theme.green}25`,
        }}
      >
        <Sparkles className="w-4 h-4" style={{ color: theme.green }} />
      </div>
    </div>
  );
}
