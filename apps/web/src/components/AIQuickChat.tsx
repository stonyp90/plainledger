import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, TrendingUp, TrendingDown, Zap, DollarSign, Users, BarChart3 } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { jamesAI, ChatResponse } from '../lib/jamesAI';
import { FinancialContext } from '../lib/jamesPrompts';
import { useFinancialData } from '../hooks/useFinancialData';

interface AIQuickChatProps {
  onClose: () => void;
  financialContext?: FinancialContext;
}

interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  labelEn: string;
  labelFr: string;
  queryEn: string;
  queryFr: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'runway',
    icon: TrendingUp,
    labelEn: 'Runway',
    labelFr: 'Autonomie',
    queryEn: "What's my current runway and when will I run out of cash?",
    queryFr: "Quelle est mon autonomie actuelle et quand serai-je à court de trésorerie?",
    color: 'rgb(16, 185, 129)', // emerald
  },
  {
    id: 'burn-rate',
    icon: TrendingDown,
    labelEn: 'Burn rate',
    labelFr: 'Taux de brûlage',
    queryEn: "Analyze my burn rate and suggest ways to reduce it.",
    queryFr: "Analysez mon taux de brûlage et suggérez des façons de le réduire.",
    color: 'rgb(245, 158, 11)', // amber
  },
  {
    id: 'hiring',
    icon: Users,
    labelEn: 'Can I hire?',
    labelFr: 'Puis-je embaucher?',
    queryEn: "Can I afford to hire a new employee? What would be the impact on my runway?",
    queryFr: "Puis-je me permettre d'embaucher? Quel serait l'impact sur mon autonomie?",
    color: 'rgb(59, 130, 246)', // blue
  },
  {
    id: 'initiatives',
    icon: Zap,
    labelEn: 'Initiatives',
    labelFr: 'Initiatives',
    queryEn: "Generate 3-5 strategic initiatives to improve my financial position.",
    queryFr: "Générez 3-5 initiatives stratégiques pour améliorer ma position financière.",
    color: 'rgb(139, 92, 246)', // purple
  },
  {
    id: 'revenue',
    icon: BarChart3,
    labelEn: 'Grow revenue',
    labelFr: 'Croître revenus',
    queryEn: "What strategies can help me increase revenue in the next quarter?",
    queryFr: "Quelles stratégies peuvent m'aider à augmenter mes revenus au prochain trimestre?",
    color: 'rgb(34, 197, 94)', // green
  },
  {
    id: 'funding',
    icon: DollarSign,
    labelEn: 'Funding',
    labelFr: 'Financement',
    queryEn: "What funding options should I consider given my current financial position?",
    queryFr: "Quelles options de financement devrais-je considérer vu ma position financière?",
    color: 'rgb(236, 72, 153)', // pink
  },
];

interface QuickActionButtonProps {
  action: QuickAction;
  isEn: boolean;
  onClick: (query: string) => void;
  disabled?: boolean;
}

function QuickActionButton({ action, isEn, onClick, disabled }: QuickActionButtonProps) {
  const Icon = action.icon;
  const label = isEn ? action.labelEn : action.labelFr;
  const query = isEn ? action.queryEn : action.queryFr;
  
  return (
    <button
      onClick={() => onClick(query)}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        color: 'rgb(var(--color-text))',
        border: '1px solid rgb(var(--color-border))',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = `${action.color}15`;
          e.currentTarget.style.borderColor = `${action.color}40`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))';
        e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: action.color }} />
      <span>{label}</span>
    </button>
  );
}

export function AIQuickChat({ onClose, financialContext: providedContext }: AIQuickChatProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  
  // Get financial context if not provided
  const { data: financialData } = useFinancialData();
  const financialContext: FinancialContext = providedContext || {
    currentCash: financialData?.summary?.cash?.current || 0,
    monthlyRevenue: financialData?.summary?.revenue?.current || 0,
    monthlyExpenses: financialData?.summary?.expenses?.current || 0,
    burnRate: financialData?.summary?.cash?.burnRate || 
      ((financialData?.summary?.expenses?.current || 0) - (financialData?.summary?.revenue?.current || 0)),
    runwayMonths: financialData?.summary?.cash?.runway || 0,
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when response arrives
  useEffect(() => {
    if (lastResponse && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lastResponse]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setQuery('');
    setLastResponse(null);
    setHasError(false);

    try {
      const response: ChatResponse = await jamesAI.sendMessage(
        queryText,
        financialContext,
        {
          type: 'general',
          debounce: false,
        }
      );

      if (response.error) {
        setHasError(true);
        setLastResponse(isEn 
          ? 'Sorry, I encountered an issue. Please try again or try a different question.'
          : 'Désolé, j\'ai rencontré un problème. Veuillez réessayer ou poser une autre question.'
        );
      } else {
        setLastResponse(response.message || (isEn ? 'No response received' : 'Aucune réponse reçue'));
      }
    } catch (error) {
      setHasError(true);
      console.error('[AIQuickChat] Error:', error);
      
      // Provide a user-friendly error message
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        setLastResponse(isEn 
          ? 'The request took too long. Please try a simpler question.'
          : 'La requête a pris trop de temps. Veuillez essayer une question plus simple.'
        );
      } else if (errorMessage.includes('network') || errorMessage.includes('NETWORK')) {
        setLastResponse(isEn 
          ? 'Network error. Please check your connection and try again.'
          : 'Erreur réseau. Veuillez vérifier votre connexion et réessayer.'
        );
      } else {
        setLastResponse(isEn 
          ? 'Sorry, I encountered an issue processing your request. Please try again.'
          : 'Désolé, j\'ai rencontré un problème. Veuillez réessayer.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(query);
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="bg-card rounded-lg shadow-xl border flex flex-col"
      style={{
        width: '100%',
        maxHeight: '480px',
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
        boxShadow: '0 10px 40px -10px rgb(0 0 0 / 0.2), 0 4px 12px rgb(0 0 0 / 0.1)',
      }}
    >
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
          <h3 className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'James AI Assistant' : 'Assistant IA James'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="icon-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isEn ? 'Close (Esc)' : 'Fermer (Esc)'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Quick actions:' : 'Actions rapides:'}
        </p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              isEn={isEn}
              onClick={sendQuery}
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Response Display */}
      {(lastResponse || isLoading) && (
        <div
          ref={responseRef}
          className="px-4 py-3 flex-1 overflow-y-auto text-sm"
          style={{
            color: hasError ? 'rgb(var(--color-error))' : 'rgb(var(--color-text))',
            backgroundColor: hasError 
              ? 'rgb(var(--color-error) / 0.05)' 
              : 'rgb(var(--color-bg-muted) / 0.5)',
            maxHeight: '200px',
          }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isEn ? 'James is thinking...' : 'James réfléchit...'}</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{lastResponse}</div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t flex gap-2 flex-shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEn ? 'Ask James anything...' : 'Demandez à James...'}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text))',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgb(var(--color-primary-500))';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgb(var(--color-primary-500) / 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgb(var(--color-border))';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={() => sendQuery(query)}
          disabled={isLoading || !query.trim()}
          className="px-3 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isLoading || !query.trim()
              ? 'rgb(var(--color-bg-muted))'
              : 'rgb(var(--color-primary-500))',
            color: isLoading || !query.trim()
              ? 'rgb(var(--color-text-muted))'
              : 'white',
          }}
          title={isEn ? 'Send (Enter)' : 'Envoyer (Entrée)'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
