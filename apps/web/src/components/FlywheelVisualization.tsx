/**
 * FlywheelVisualization Component
 * 
 * Premium circular visualization showing the compounding intelligence loop.
 * Features a true circular layout to emphasize the continuous improvement cycle.
 */

import { motion } from 'framer-motion';
import { Building2, Target, Layers, Lightbulb, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
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
            ? `radial-gradient(ellipse 60% 60% at 50% 50%, ${theme.green}08 0%, transparent 70%)`
            : `radial-gradient(ellipse 60% 60% at 50% 50%, ${theme.green}06 0%, transparent 70%)`,
        }}
      />

      {/* Circular Flywheel Container */}
      <div className="relative flex items-center justify-center">
        {/* The circular track */}
        <div 
          className="relative w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]"
        >
          {/* Outer rotating ring with gradient */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px dashed ${isDark ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />

          {/* Inner circle track */}
          <div 
            className="absolute inset-4 sm:inset-6 rounded-full"
            style={{
              border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.2)' : 'rgba(229, 231, 235, 0.6)'}`,
            }}
          />

          {/* Animated flowing particles around the circle */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
            <defs>
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={theme.green} stopOpacity="0" />
                <stop offset="50%" stopColor={theme.green} stopOpacity="0.8" />
                <stop offset="100%" stopColor={theme.green} stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Circular path for the flowing effect */}
            <circle
              cx="160"
              cy="160"
              r="130"
              fill="none"
              stroke="url(#flowGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="60 200"
              className="origin-center"
              style={{
                animation: 'spin 4s linear infinite',
              }}
            />
          </svg>

          {/* Second flowing particle (offset) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
            <circle
              cx="160"
              cy="160"
              r="130"
              fill="none"
              stroke={theme.gold}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="40 240"
              strokeOpacity="0.6"
              className="origin-center"
              style={{
                animation: 'spin 4s linear infinite',
                animationDelay: '-2s',
              }}
            />
          </svg>

          {/* Center element - AI Brain */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
          >
            <motion.div
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
              style={{
                background: isDark 
                  ? `linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.9) 100%)`
                  : `linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)`,
                border: `2px solid ${theme.green}40`,
                boxShadow: isDark 
                  ? `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
                  : `0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.8)`,
              }}
              animate={{
                boxShadow: [
                  `0 8px 32px rgba(0, 0, 0, ${isDark ? '0.4' : '0.08'}), 0 0 0px ${theme.green}00`,
                  `0 8px 32px rgba(0, 0, 0, ${isDark ? '0.4' : '0.08'}), 0 0 30px ${theme.green}30`,
                  `0 8px 32px rgba(0, 0, 0, ${isDark ? '0.4' : '0.08'}), 0 0 0px ${theme.green}00`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Rotating ring around center */}
              <motion.div
                className="absolute inset-[-6px] rounded-full"
                style={{ border: `1px dashed ${theme.green}25` }}
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              
              <Sparkles 
                className="w-7 h-7 sm:w-8 sm:h-8" 
                style={{ color: theme.green }}
                strokeWidth={1.5}
              />
            </motion.div>
          </motion.div>

          {/* Flywheel Steps positioned around the circle */}
          {flywheelSteps.map((step, idx) => {
            const pos = getPosition(idx, radius);
            const mobilePos = getPosition(idx, mobileRadius);
            
            return (
              <motion.div
                key={idx}
                className="absolute top-1/2 left-1/2"
                style={{
                  // Desktop positioning
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ 
                  delay: idx * 0.15 + 0.2, 
                  duration: 0.5, 
                  type: "spring",
                  stiffness: 200,
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

          {/* Curved arrows between steps */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
            {flywheelSteps.map((_, idx) => {
              // Calculate arrow positions between steps
              const startAngle = (-90 + idx * 90 + 25) * (Math.PI / 180);
              const endAngle = (-90 + idx * 90 + 65) * (Math.PI / 180);
              const arrowRadius = 130;
              
              const startX = 160 + Math.cos(startAngle) * arrowRadius;
              const startY = 160 + Math.sin(startAngle) * arrowRadius;
              const endX = 160 + Math.cos(endAngle) * arrowRadius;
              const endY = 160 + Math.sin(endAngle) * arrowRadius;
              
              // Control point for curve
              const midAngle = (-90 + idx * 90 + 45) * (Math.PI / 180);
              const controlX = 160 + Math.cos(midAngle) * (arrowRadius + 15);
              const controlY = 160 + Math.sin(midAngle) * (arrowRadius + 15);

              return (
                <motion.g key={idx}>
                  <motion.path
                    d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                    fill="none"
                    stroke={theme.gold}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.5 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.6, duration: 0.5 }}
                  />
                  {/* Arrow head */}
                  <motion.circle
                    cx={endX}
                    cy={endY}
                    r="3"
                    fill={theme.gold}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.8 }}
                  />
                </motion.g>
              );
            })}
          </svg>
        </div>
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

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
