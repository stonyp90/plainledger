/**
 * James AI Chatbot Component - Enhanced & Theme-Integrated
 * 
 * AI-powered strategic advisor with:
 * - Seamless theme integration
 * - Multiple panel modes (side panel, embedded, floating)
 * - Financial context display
 * - Quick action chips
 * - Rich message formatting
 * - Analytics tracking
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Bot,
  User,
  Send,
  X,
  Sparkles,
  Loader2,
  Lightbulb,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Minimize2,
  Maximize2,
  MessageCircle,
  DollarSign,
  Calendar,
  Zap,
  ChevronRight,
  Clock,
  RefreshCw,
  PanelRightClose,
  PanelRight,
  Copy,
  Check,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { jamesAI, ChatMessage } from '../../lib/jamesAI';
import { FinancialContext } from '../../lib/jamesPrompts';
import { SUGGESTED_PROMPTS } from '../../lib/jamesPrompts';
import { Scenario, RunwayAnalysis, Initiative } from '../../lib/strategicPlanning';
import { OKR } from '../../lib/okrTypes';
import { jamesAnalytics } from '../../lib/jamesAnalytics';

interface JamesChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  financialContext: FinancialContext;
  scenarios: Scenario[];
  activeScenarioId: string | null;
  runwayAnalysis: RunwayAnalysis | null;
  onInitiativesGenerated?: (initiatives: Initiative[]) => void;
  onOKRGenerated?: (okr: OKR) => void;
}

type PanelMode = 'side' | 'minimized';

export default function JamesChatbot({
  isOpen,
  onClose,
  onToggle,
  financialContext,
  scenarios,
  activeScenarioId,
  runwayAnalysis,
  onInitiativesGenerated,
  onOKRGenerated,
}: JamesChatbotProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('side');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Quick action chips
  const quickActions = useMemo(() => [
    { id: 'extend-runway', icon: TrendingUp, label: isEn ? 'Extend Runway' : 'Prolonger runway', color: 'success' },
    { id: 'reduce-burn', icon: TrendingDown, label: isEn ? 'Reduce Burn' : 'Réduire burn', color: 'warning' },
    { id: 'initiatives', icon: Zap, label: isEn ? 'Initiatives' : 'Initiatives', color: 'primary' },
    { id: 'okrs', icon: Target, label: isEn ? 'OKRs' : 'OKRs', color: 'info' },
  ], [isEn]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: isEn
          ? "Hi! I'm James, your AI strategic advisor. I can help you with:\n\n• **Cashflow Planning** - Optimize your runway\n• **Strategic Initiatives** - Generate and prioritize\n• **OKRs** - Create quarterly objectives\n\nWhat would you like to explore?"
          : "Bonjour! Je suis James, votre conseiller stratégique IA. Je peux vous aider avec:\n\n• **Planification de trésorerie** - Optimiser votre runway\n• **Initiatives stratégiques** - Générer et prioriser\n• **OKR** - Créer des objectifs trimestriels\n\nQue souhaitez-vous explorer?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isEn]);

  const handleQuickAction = useCallback((actionId: string) => {
    const prompts: Record<string, { en: string; fr: string }> = {
      'extend-runway': {
        en: 'How can I extend my cash runway? Provide specific strategies based on my current financial position.',
        fr: "Comment puis-je prolonger mon runway de trésorerie? Fournissez des stratégies spécifiques basées sur ma situation financière actuelle.",
      },
      'reduce-burn': {
        en: 'What strategies can reduce my monthly burn rate while maintaining growth?',
        fr: 'Quelles stratégies peuvent réduire mon taux de burn mensuel tout en maintenant la croissance?',
      },
      'initiatives': {
        en: 'Generate 3-5 strategic initiatives for this quarter that will improve our financial position.',
        fr: 'Générez 3-5 initiatives stratégiques pour ce trimestre qui amélioreront notre position financière.',
      },
      'okrs': {
        en: `Create OKRs for Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} focused on financial health and growth.`,
        fr: `Créez des OKR pour le T${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} axés sur la santé financière et la croissance.`,
      },
    };
    const prompt = prompts[actionId];
    if (prompt) {
      handleSend(isEn ? prompt.en : prompt.fr);
    }
  }, [isEn]);

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleSend = useCallback(
    async (content?: string) => {
      const userMessage = content || input.trim();
      if (!userMessage || isLoading) return;

      // Validate message length
      if (userMessage.length > 10000) {
        setError(isEn
          ? "Message is too long. Please keep it under 10,000 characters."
          : "Le message est trop long. Veuillez le limiter à 10 000 caractères.");
        return;
      }

      // Clear previous errors
      setError(null);

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setShowSuggestions(false);
      setIsLoading(true);

      try {
        // Determine message type
        let type: 'strategy' | 'initiative' | 'okr' | 'general' = 'general';
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('initiative') || lowerMessage.includes('generate initiative')) {
          type = 'initiative';
        } else if (lowerMessage.includes('okr') || lowerMessage.includes('objective')) {
          type = 'okr';
        } else if (
          lowerMessage.includes('strategy') ||
          lowerMessage.includes('extend') ||
          lowerMessage.includes('reduce') ||
          lowerMessage.includes('optimize')
        ) {
          type = 'strategy';
        }

        // Build enhanced context
        const enhancedContext: FinancialContext = {
          ...financialContext,
          scenarios,
          activeScenario: scenarios.find((s) => s.id === activeScenarioId) || undefined,
          initiatives: scenarios.find((s) => s.id === activeScenarioId)?.initiatives || [],
        };

        // Send to James AI
        const response = await jamesAI.sendMessage(userMessage, enhancedContext, { type });

        // Check for errors in response
        if (response.error) {
          throw new Error(response.error);
        }

        // Add assistant response
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Handle structured outputs
        if (response.metadata?.initiatives && onInitiativesGenerated) {
          onInitiativesGenerated(response.metadata.initiatives);
        }

        if (response.metadata?.okrs && response.metadata.okrs.length > 0 && onOKRGenerated) {
          onOKRGenerated(response.metadata.okrs[0]);
        }

        // Track analytics
        jamesAnalytics.trackMessageSent(userMessage.length, type);
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Determine error type and show appropriate message
        const errorMessage = error instanceof Error ? error.message : String(error);
        let userFriendlyMessage = isEn
          ? "I apologize, but I encountered an error processing your request. Please try again."
          : "Je m'excuse, mais j'ai rencontré une erreur lors du traitement de votre demande. Veuillez réessayer.";

        if (errorMessage.includes('timeout')) {
          userFriendlyMessage = isEn
            ? "The request took too long. Please try again with a shorter message."
            : "La requête a pris trop de temps. Veuillez réessayer avec un message plus court.";
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('Too many')) {
          userFriendlyMessage = isEn
            ? "Too many requests. Please wait a moment and try again."
            : "Trop de requêtes. Veuillez attendre un moment et réessayer.";
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          userFriendlyMessage = isEn
            ? "Network error. Please check your connection and try again."
            : "Erreur réseau. Veuillez vérifier votre connexion et réessayer.";
        }

        // Track error
        jamesAnalytics.trackError(
          error instanceof Error ? error.name : 'UnknownError',
          errorMessage
        );

        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: userFriendlyMessage,
          timestamp: new Date(),
          metadata: { error: errorMessage },
        };
        setMessages((prev) => [...prev, errorMsg]);
        setError(userFriendlyMessage);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [
      input,
      isLoading,
      financialContext,
      scenarios,
      activeScenarioId,
      onInitiativesGenerated,
      onOKRGenerated,
      isEn,
    ]
  );

  const handleSuggestionClick = useCallback(
    (prompt: { id: string; en: string; fr: string }) => {
      handleSend(isEn ? prompt.en : prompt.fr);
    },
    [handleSend, isEn]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatRunway = (months: number) => {
    if (!isFinite(months)) return isEn ? 'Infinite' : 'Infini';
    if (months < 0) return isEn ? 'Critical' : 'Critique';
    return `${Math.round(months)} ${isEn ? 'months' : 'mois'}`;
  };

  // Render message content with markdown-like formatting
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Bold
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (formattedLine.startsWith('• ') || formattedLine.startsWith('- ')) {
        formattedLine = `<span class="flex gap-2"><span class="text-primary-500">•</span><span>${formattedLine.slice(2)}</span></span>`;
      }
      return (
        <span 
          key={i} 
          dangerouslySetInnerHTML={{ __html: formattedLine }} 
          className={line === '' ? 'block h-2' : 'block'}
        />
      );
    });
  };

  // Closed state - floating button
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 group"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
        }}
        aria-label={isEn ? 'Open James AI' : 'Ouvrir James IA'}
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="text-white font-medium text-sm hidden sm:inline group-hover:inline transition-all">
          {isEn ? 'Ask James' : 'Demander à James'}
        </span>
        <Sparkles className="w-4 h-4 text-white/60" />
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 flex flex-col transition-all duration-300 ease-out ${
        panelMode === 'side' 
          ? 'right-0 top-0 h-full w-full sm:w-[420px] lg:w-[460px]' 
          : 'right-6 bottom-6 w-80 h-96 rounded-2xl shadow-2xl'
      }`}
      style={{
        backgroundColor: 'rgb(var(--color-bg))',
        borderLeft: panelMode === 'side' ? '1px solid rgb(var(--color-border))' : undefined,
        boxShadow: panelMode === 'side' 
          ? '-4px 0 24px rgb(0 0 0 / 0.1)' 
          : '0 20px 60px rgb(0 0 0 / 0.25)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-700)) 100%)',
          borderRadius: panelMode === 'minimized' ? '1rem 1rem 0 0' : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              James AI
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 text-white/80">
                {isEn ? 'Strategic Advisor' : 'Conseiller'}
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span>{isEn ? 'Online' : 'En ligne'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPanelMode(panelMode === 'side' ? 'minimized' : 'side')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
            aria-label={isEn ? 'Toggle panel size' : 'Changer la taille du panneau'}
          >
            {panelMode === 'side' ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
            aria-label={isEn ? 'Close' : 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Financial Context Bar */}
      {panelMode === 'side' && (
        <div
          className="px-4 py-3 flex-shrink-0 border-b"
          style={{
            backgroundColor: 'rgb(var(--color-bg-muted))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Cash' : 'Tréso'}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatCurrency(financialContext.currentCash)}
                </p>
              </div>
            </div>
            
            <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: financialContext.runwayMonths < 6 
                    ? 'rgb(var(--color-error) / 0.1)' 
                    : financialContext.runwayMonths < 12 
                    ? 'rgb(var(--color-warning) / 0.1)' 
                    : 'rgb(var(--color-success) / 0.1)' 
                }}
              >
                <Clock 
                  className="w-4 h-4" 
                  style={{ 
                    color: financialContext.runwayMonths < 6 
                      ? 'rgb(var(--color-error))' 
                      : financialContext.runwayMonths < 12 
                      ? 'rgb(var(--color-warning))' 
                      : 'rgb(var(--color-success))' 
                  }} 
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Runway' : 'Runway'}
                </p>
                <p 
                  className="text-sm font-semibold" 
                  style={{ 
                    color: financialContext.runwayMonths < 6 
                      ? 'rgb(var(--color-error))' 
                      : financialContext.runwayMonths < 12 
                      ? 'rgb(var(--color-warning))' 
                      : 'rgb(var(--color-success))' 
                  }}
                >
                  {formatRunway(financialContext.runwayMonths)}
                </p>
              </div>
            </div>
            
            <div className="w-px h-8 flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
              >
                <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Burn' : 'Burn'}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {formatCurrency(financialContext.burnRate)}/mo
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {panelMode === 'side' && messages.length <= 1 && (
        <div
          className="px-4 py-3 flex-shrink-0 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Quick Actions' : 'Actions rapides'}
          </p>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: `rgb(var(--color-${action.color}) / 0.1)`,
                  color: `rgb(var(--color-${action.color}))`,
                  border: `1px solid rgb(var(--color-${action.color}) / 0.2)`,
                }}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          className="mx-4 mt-3 p-3 rounded-xl flex items-start gap-2 flex-shrink-0"
          style={{
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            border: '1px solid rgb(var(--color-error) / 0.2)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-error))' }} />
          <p className="text-xs flex-1" style={{ color: 'rgb(var(--color-error))' }}>
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            style={{ color: 'rgb(var(--color-error))' }}
            aria-label={isEn ? 'Dismiss error' : 'Ignorer l\'erreur'}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
                }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`relative max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
              }`}
              style={
                message.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                      color: 'white',
                    }
                  : {
                      backgroundColor: 'rgb(var(--color-bg))',
                      border: '1px solid rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }
              }
            >
              <div className="text-sm leading-relaxed">
                {renderMessageContent(message.content)}
              </div>
              
              {/* Generated content indicators */}
              {message.metadata?.initiatives && message.metadata.initiatives.length > 0 && (
                <div 
                  className="mt-3 pt-3 border-t flex items-center gap-2"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
                  >
                    <Zap className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                      {message.metadata.initiatives.length} {isEn ? 'initiative(s) generated' : 'initiative(s) générée(s)'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
              )}
              
              {message.metadata?.okrs && message.metadata.okrs.length > 0 && (
                <div 
                  className="mt-3 pt-3 border-t flex items-center gap-2"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
                  >
                    <Target className="w-3 h-3" style={{ color: 'rgb(var(--color-info))' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium" style={{ color: 'rgb(var(--color-info))' }}>
                      {isEn ? 'OKR created' : 'OKR créé'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
              )}

              {/* Copy button for assistant messages */}
              {message.role === 'assistant' && message.id !== 'welcome' && (
                <button
                  onClick={() => handleCopyMessage(message.id, message.content)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  aria-label={isEn ? 'Copy' : 'Copier'}
                >
                  {copiedMessageId === message.id ? (
                    <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                  ) : (
                    <Copy className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  )}
                </button>
              )}
            </div>
            {message.role === 'user' && (
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}
              >
                <User className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
              }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div 
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'James is thinking...' : 'James réfléchit...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Prompts */}
        {showSuggestions && messages.length <= 1 && panelMode === 'side' && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Suggested questions' : 'Questions suggérées'}
              </span>
            </div>
            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSuggestionClick(prompt)}
                className="w-full text-left p-3 rounded-xl text-sm transition-all hover:translate-x-1 group"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <div className="flex items-center justify-between">
                  <span>{isEn ? prompt.en : prompt.fr}</span>
                  <ChevronRight 
                    className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ color: 'rgb(var(--color-primary-500))' }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div 
        className="p-4 flex-shrink-0 border-t"
        style={{ 
          borderColor: 'rgb(var(--color-border))',
          backgroundColor: 'rgb(var(--color-bg))',
        }}
      >
        <div className="flex items-end gap-2">
          <div 
            className="flex-1 relative rounded-xl overflow-hidden"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              border: error ? '1px solid rgb(var(--color-error))' : '1px solid rgb(var(--color-border))',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isEn ? 'Ask James anything...' : 'Demandez n\'importe quoi à James...'}
              className="w-full min-h-[44px] max-h-32 px-4 py-3 resize-none text-sm bg-transparent focus:outline-none"
              style={{ color: 'rgb(var(--color-text))' }}
              rows={1}
              disabled={isLoading}
              maxLength={10000}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.3)',
            }}
            aria-label={isEn ? 'Send' : 'Envoyer'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
        {input.length > 9000 && (
          <p className="text-xs mt-2 text-right" style={{ color: 'rgb(var(--color-warning))' }}>
            {input.length.toLocaleString()}/10,000 {isEn ? 'characters' : 'caractères'}
          </p>
        )}
      </div>
    </div>
  );
}
