import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAIPinState } from '../hooks/useAIPinState';
import { usePremiumFeature } from './PremiumFeatureGate';
import { AIQuickChat } from './AIQuickChat';
import { useI18n } from '../lib/i18n';
import { useAccountDataAccess } from '../hooks/useAccountDataAccess';

interface AIToolbarProps {
  className?: string;
}

export function AIToolbar({ className }: AIToolbarProps) {
  const { isExpanded, toggleExpanded, collapse } = useAIPinState();
  const { hasAccess } = usePremiumFeature('aiInsights');
  const { plan, hasConnection, isLoading } = useAccountDataAccess();
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isHovered, setIsHovered] = useState(false);

  // AI Assistant is only available for enterprise users with connected data
  const isEnterpriseUser = plan === 'enterprise';
  const canShowAI = hasAccess && isEnterpriseUser && hasConnection && !isLoading;

  // Keyboard shortcuts: Cmd/Ctrl+J to toggle, Escape to close
  useEffect(() => {
    if (!canShowAI) return;

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
  }, [canShowAI, isExpanded, toggleExpanded, collapse]);

  // Don't render if user doesn't have AI access, is not enterprise, or has no data connection
  if (!canShowAI) return null;

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

        {/* AI Toggle Button - Compact, subtle */}
        {!isExpanded && (
          <button
            onClick={toggleExpanded}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-1.5 rounded-full transition-all duration-150"
            style={{
              backgroundColor: isHovered 
                ? 'rgb(var(--color-primary-500) / 0.1)' 
                : 'rgb(var(--color-surface))',
              color: isHovered 
                ? 'rgb(var(--color-primary-600))' 
                : 'rgb(var(--color-text-muted))',
              border: '1px solid rgb(var(--color-border))',
              boxShadow: '0 1px 4px rgb(0 0 0 / 0.06)',
              padding: isHovered ? '0.375rem 0.75rem' : '0.375rem',
            }}
            title={isEn ? 'AI Assistant (⌘J)' : 'Assistant IA (⌘J)'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isHovered && (
              <span className="text-xs font-medium whitespace-nowrap animate-in fade-in duration-100">
                {isEn ? 'Ask AI' : 'IA'}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
