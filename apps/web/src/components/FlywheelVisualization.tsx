/**
 * FlywheelVisualization Component
 * 
 * Animated visualization showing the compounding intelligence effect:
 * More Businesses → More Decisions → Richer Patterns → Better Insights → (repeat)
 */

import { motion } from 'framer-motion';
import { Building2, Target, Layers, Lightbulb, Brain } from 'lucide-react';
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

  const flywheelNodes = [
    { 
      label: isEn ? 'More Businesses' : 'Plus d\'entreprises', 
      icon: Building2,
      angle: 0,
    },
    { 
      label: isEn ? 'More Decisions' : 'Plus de décisions', 
      icon: Target,
      angle: 90,
    },
    { 
      label: isEn ? 'Richer Patterns' : 'Modèles enrichis', 
      icon: Layers,
      angle: 180,
    },
    { 
      label: isEn ? 'Better Insights' : 'Meilleurs insights', 
      icon: Lightbulb,
      angle: 270,
    },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto aspect-square">
      {/* Center Hub */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center z-20"
        style={{ 
          background: `linear-gradient(135deg, ${theme.gold} 0%, ${theme.green} 100%)`,
          boxShadow: `0 0 40px ${theme.gold}40`
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
      </motion.div>

      {/* Orbiting Circle Track */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-dashed opacity-30"
        style={{ borderColor: theme.gold }}
      />

      {/* Animated Connection Arrows */}
      <svg 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96"
        viewBox="0 0 400 400"
      >
        {/* Circular arrow path */}
        <defs>
          <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.gold} />
            <stop offset="100%" stopColor={theme.green} />
          </linearGradient>
        </defs>
        <motion.circle
          cx="200"
          cy="200"
          r="140"
          fill="none"
          stroke="url(#arrowGradient)"
          strokeWidth="3"
          strokeDasharray="20 10"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -300 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Flywheel Nodes */}
      {flywheelNodes.map((node, idx) => {
        const radius = 130; // pixels from center
        const angleRad = (node.angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        return (
          <motion.div
            key={idx}
            className="absolute top-1/2 left-1/2 z-10"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.2, duration: 0.5 }}
          >
            <motion.div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex flex-col items-center justify-center p-2 cursor-default"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: `2px solid ${theme.gold}`,
                boxShadow: `0 4px 20px ${theme.gold}20`,
              }}
              whileHover={{ 
                scale: 1.1,
                boxShadow: `0 8px 30px ${theme.gold}40`,
              }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <node.icon 
                className="w-6 h-6 sm:w-7 sm:h-7 mb-1" 
                style={{ color: theme.gold }} 
              />
              <span 
                className="text-[9px] sm:text-[10px] font-semibold text-center leading-tight"
                style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
              >
                {node.label}
              </span>
            </motion.div>
          </motion.div>
        );
      })}

      {/* Pulsing Data Points */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
          style={{
            backgroundColor: i < 2 ? theme.green : theme.gold,
            boxShadow: `0 0 10px ${i < 2 ? theme.green : theme.gold}`,
          }}
          animate={{
            x: [
              Math.cos((i * 120 * Math.PI) / 180) * 130 - 6,
              Math.cos(((i * 120 + 360) * Math.PI) / 180) * 130 - 6,
            ],
            y: [
              Math.sin((i * 120 * Math.PI) / 180) * 130 - 6,
              Math.sin(((i * 120 + 360) * Math.PI) / 180) * 130 - 6,
            ],
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 8,
            delay: i * 2.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Static version for non-animated contexts
export function FlywheelStatic({ theme, isDark }: FlywheelVisualizationProps) {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="p-6 rounded-xl text-center"
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)',
        border: `1px solid ${isDark ? 'rgba(71, 85, 105, 0.4)' : 'rgba(229, 231, 235, 0.8)'}`,
      }}
    >
      <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
        <span 
          className="px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${theme.green}20`, color: theme.green }}
        >
          {isEn ? 'More Businesses' : 'Plus d\'entreprises'}
        </span>
        <span style={{ color: theme.gold }}>→</span>
        <span 
          className="px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${theme.gold}20`, color: theme.gold }}
        >
          {isEn ? 'More Decisions' : 'Plus de décisions'}
        </span>
        <span style={{ color: theme.gold }}>→</span>
        <span 
          className="px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${theme.green}20`, color: theme.green }}
        >
          {isEn ? 'Richer Patterns' : 'Modèles enrichis'}
        </span>
        <span style={{ color: theme.gold }}>→</span>
        <span 
          className="px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: `${theme.gold}20`, color: theme.gold }}
        >
          {isEn ? 'Better Insights' : 'Meilleurs insights'}
        </span>
        <span style={{ color: theme.gold }}>↻</span>
      </div>
    </div>
  );
}
