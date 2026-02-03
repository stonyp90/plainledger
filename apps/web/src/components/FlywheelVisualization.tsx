/**
 * FlywheelVisualization Component
 * 
 * Premium circular visualization showing the compounding intelligence loop.
 * Features Lottie animation with orbiting particles and step card overlays.
 */

import { motion } from 'framer-motion';
import { Building2, Target, Layers, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { DataCycleAnimation } from './LottieAnimations';

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
      shortLabel: isEn ? 'Businesses' : 'Entreprises',
      icon: Building2,
      color: theme.green,
      position: 'top',
    },
    { 
      label: isEn ? 'More Decisions' : 'Plus de décisions', 
      shortLabel: isEn ? 'Decisions' : 'Décisions',
      icon: Target,
      color: theme.gold,
      position: 'right',
    },
    { 
      label: isEn ? 'Richer Patterns' : 'Modèles enrichis', 
      shortLabel: isEn ? 'Patterns' : 'Modèles',
      icon: Layers,
      color: '#8b5cf6',
      position: 'bottom',
    },
    { 
      label: isEn ? 'Better Insights' : 'Meilleurs insights', 
      shortLabel: isEn ? 'Insights' : 'Insights',
      icon: Lightbulb,
      color: theme.green,
      position: 'left',
    },
  ];

  // Circle radius for positioning (responsive)
  const radius = 130; // Base radius for desktop
  const mobileRadius = 90; // Smaller for mobile

  // Calculate positions around the circle
  const getPosition = (index: number, r: number) => {
    // Start from top (-90deg) and go clockwise
    const angle = (-90 + index * 90) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative py-8">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? `radial-gradient(ellipse 60% 60% at 50% 50%, ${theme.green}12 0%, transparent 70%)`
            : `radial-gradient(ellipse 60% 60% at 50% 50%, ${theme.green}08 0%, transparent 70%)`,
        }}
      />

      {/* Circular Flywheel Container - Rotating */}
      <div className="relative flex items-center justify-center">
        {/* The circular track with Lottie animation - Rotates slowly */}
        <motion.div 
          className="relative w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 15, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {/* Lottie Data Cycle Animation - Base Layer */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <DataCycleAnimation 
              className="w-full h-full"
              style={{ 
                opacity: isDark ? 1 : 0.9,
                filter: isDark ? 'brightness(1.1)' : 'none'
              }}
            />
          </motion.div>

          {/* Flywheel Steps positioned around the circle - Counter-rotate to stay upright */}
          {flywheelSteps.map((step, idx) => {
            const pos = getPosition(idx, radius);
            const mobilePos = getPosition(idx, mobileRadius);
            
            return (
              <motion.div
                key={idx}
                className="absolute top-1/2 left-1/2 z-10"
                style={{
                  // Desktop positioning
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
                initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                animate={{ rotate: -360 }}
                transition={{ 
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                  opacity: { delay: idx * 0.15 + 0.3, duration: 0.5 },
                  scale: { delay: idx * 0.15 + 0.3, duration: 0.5, type: "spring", stiffness: 200 }
                }}
              >
                {/* Responsive positioning using CSS */}
                <div 
                  className="hidden sm:block"
                  style={{ transform: `translate(${pos.x - radius}px, ${pos.y - radius}px)` }}
                >
                  <StepCard step={step} theme={theme} isDark={isDark} idx={idx} />
                </div>
                <div 
                  className="sm:hidden"
                  style={{ transform: `translate(${mobilePos.x - mobileRadius}px, ${mobilePos.y - mobileRadius}px)` }}
                >
                  <StepCard step={step} theme={theme} isDark={isDark} idx={idx} compact />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* "Continuous Improvement" label */}
      <motion.div 
        className="mt-6 sm:mt-8 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1 }}
      >
        <motion.div 
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ 
            backgroundColor: `${theme.green}08`,
            border: `1px solid ${theme.green}15`,
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-4 h-4" style={{ color: theme.green }} />
          </motion.div>
          <span 
            className="text-sm font-medium"
            style={{ color: theme.green }}
          >
            {isEn ? 'Continuous improvement cycle' : 'Cycle d\'amélioration continue'}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Step Card Component
function StepCard({ 
  step, 
  theme, 
  isDark, 
  idx,
  compact = false 
}: { 
  step: { label: string; shortLabel: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>; color: string }; 
  theme: { green: string; greenDark: string; gold: string };
  isDark: boolean;
  idx: number;
  compact?: boolean;
}) {
  const Icon = step.icon;
  
  return (
    <motion.div
      className={`group relative flex items-center gap-2 rounded-xl cursor-default ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5 sm:px-4 sm:py-3'
      }`}
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
        boxShadow: isDark 
          ? '0 4px 20px rgba(0, 0, 0, 0.4)' 
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}
      whileHover={{ 
        scale: 1.08,
        boxShadow: isDark 
          ? `0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px ${step.color}25`
          : `0 8px 30px rgba(0, 0, 0, 0.12), 0 0 20px ${step.color}20`,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Hover glow ring */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ border: `1.5px solid ${step.color}50` }}
      />
      
      {/* Icon */}
      <motion.div 
        className={`relative rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
          compact ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
        }`}
        style={{ 
          backgroundColor: `${step.color}15`,
          border: `1px solid ${step.color}25`,
        }}
      >
        <Icon 
          className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'} 
          style={{ color: step.color }} 
          strokeWidth={1.8}
        />
      </motion.div>

      {/* Label */}
      <span 
        className={`font-medium whitespace-nowrap ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}
        style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
      >
        {compact ? step.shortLabel : step.label}
      </span>
      
      {/* Step number badge */}
      <motion.div
        className={`absolute -top-1.5 -right-1.5 rounded-full flex items-center justify-center font-bold ${
          compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'
        }`}
        style={{
          backgroundColor: step.color,
          color: 'white',
          boxShadow: `0 2px 8px ${step.color}50`,
        }}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: idx * 0.15 + 0.4, type: "spring", stiffness: 300 }}
      >
        {idx + 1}
      </motion.div>
    </motion.div>
  );
}

// Static version for non-animated contexts (simplified circular representation)
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
    <div className="flex flex-col items-center gap-4">
      {/* Circular representation */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center">
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl relative"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
                boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Step number */}
              <div 
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: step.color }}
              >
                {idx + 1}
              </div>
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
        {/* Loop back indicator */}
        <div 
          className="w-9 h-9 ml-2 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: `${theme.green}10`,
            border: `2px solid ${theme.green}25`,
          }}
        >
          <RefreshCw className="w-4 h-4" style={{ color: theme.green }} />
        </div>
      </div>
      {/* Cycle label */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ 
          backgroundColor: `${theme.green}08`,
          border: `1px solid ${theme.green}15`,
        }}
      >
        <RefreshCw className="w-3.5 h-3.5" style={{ color: theme.green }} />
        <span className="text-xs font-medium" style={{ color: theme.green }}>
          {isEn ? 'Continuous improvement cycle' : 'Cycle d\'amélioration continue'}
        </span>
      </div>
    </div>
  );
}
