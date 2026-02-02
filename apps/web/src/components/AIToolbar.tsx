import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAIPinState } from '../hooks/useAIPinState';
import { usePremiumFeature } from './PremiumFeatureGate';
import { AIQuickChat } from './AIQuickChat';
import { useI18n } from '../lib/i18n';

interface AIToolbarProps {
  className?: string;
}

export function AIToolbar({ className }: AIToolbarProps) {
  const { isExpanded, toggleExpanded, collapse } = useAIPinState();
  const { hasAccess } = usePremiumFeature('aiInsights');
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);

  // Keyboard shortcuts: Cmd/Ctrl+J to toggle, Escape to close
  useEffect(() => {
    if (!hasAccess) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + J to toggle AI toolbar
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        toggleExpanded();
      }
      // Escape to close when expanded
      if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        collapse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAccess, isExpanded, toggleExpanded, collapse]);

  // Don't render if user doesn't have AI access
  if (!hasAccess) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 transition-all duration-300 z-50 ${className || ''}`}
      style={{
        width: isExpanded ? '384px' : 'auto',
        maxWidth: 'calc(100vw - 2rem)',
      }}
    >
      {/* Toolbar Container */}
      <div className="flex flex-col items-end gap-2">
        {/* Expanded Chat Panel */}
        {isExpanded && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
            <AIQuickChat onClose={collapse} />
          </div>
        )}

        {/* AI Toggle Button - Subtle, bottom-right */}
        {!isExpanded && (
          <button
            onClick={toggleExpanded}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-2 rounded-full transition-all duration-200"
            style={{
              backgroundColor: isHovered 
                ? 'rgb(var(--color-primary-500))' 
                : 'rgb(var(--color-surface))',
              color: isHovered 
                ? 'white' 
                : 'rgb(var(--color-text-muted))',
              border: '1px solid rgb(var(--color-border))',
              boxShadow: isHovered 
                ? '0 4px 12px rgb(var(--color-primary-500) / 0.3)' 
                : '0 2px 8px rgb(0 0 0 / 0.08)',
              padding: isHovered ? '0.625rem 1rem' : '0.625rem',
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
            }}
            title={isEn ? 'AI Assistant (⌘J)' : 'Assistant IA (⌘J)'}
          >
            <Sparkles className="w-4 h-4" />
            {isHovered && (
              <span className="text-sm font-medium whitespace-nowrap animate-in fade-in duration-150">
                {isEn ? 'Ask AI' : 'Demander à l\'IA'}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
