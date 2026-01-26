/**
 * James AI Chatbot Component - Enterprise Grade
 * 
 * AI-powered strategic advisor chatbot with:
 * - Comprehensive error handling
 * - User-friendly error messages
 * - Input validation
 * - Analytics tracking
 * - Performance optimization
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  AlertCircle,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
          ? "Hi! I'm James, your AI strategic advisor. I'm here to help you with cashflow planning, strategic initiatives, and OKRs. What would you like to work on today?"
          : "Bonjour! Je suis James, votre conseiller stratégique IA. Je suis là pour vous aider avec la planification de trésorerie, les initiatives stratégiques et les OKR. Sur quoi souhaitez-vous travailler aujourd'hui?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isEn]);

  const handleSend = useCallback(
    async (content?: string) => {
      const userMessage = content || input.trim();
      if (!userMessage || isLoading) return;

      // Validate message length
      if (userMessage.length > 10000) {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: isEn
            ? "Message is too long. Please keep it under 10,000 characters."
            : "Le message est trop long. Veuillez le limiter à 10 000 caractères.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setError(null);
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

        // Track error if present
        if (response.error) {
          jamesAnalytics.trackError('ResponseError', response.error);
        }
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
          metadata: {
            error: errorMessage,
          },
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

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-l-lg shadow-lg hover:shadow-xl transition-all opacity-100"
        style={{ color: 'rgb(var(--color-text-on-primary))' }}
        aria-label={isEn ? 'Open James AI' : 'Ouvrir James IA'}
      >
        <Bot className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 h-full w-full sm:w-96 lg:w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out"
      style={{
        backgroundColor: 'rgb(var(--color-bg))',
        borderLeft: '1px solid rgb(var(--color-border))',
        transform: 'translateX(0)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              James AI
            </h3>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span>{isEn ? 'Strategic Advisor' : 'Conseiller stratégique'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-opacity-10 transition-colors"
          style={{ color: 'rgb(var(--color-text-muted))' }}
          aria-label={isEn ? 'Close' : 'Fermer'}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="mx-4 mt-4 p-3 rounded-lg flex items-start gap-2"
          style={{
            backgroundColor: 'rgb(var(--color-error) / 0.1)',
            border: '1px solid rgb(var(--color-error) / 0.3)',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-error))' }} />
          <p className="text-xs flex-1" style={{ color: 'rgb(var(--color-error))' }}>
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-opacity-20"
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
        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 transition-all ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white border shadow-sm'
                }`}
                style={
                  message.role === 'assistant'
                    ? {
                        backgroundColor: 'rgb(var(--color-bg))',
                        borderColor: 'rgb(var(--color-border))',
                        color: 'rgb(var(--color-text))',
                      }
                    : {}
                }
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                {message.metadata?.initiatives && message.metadata.initiatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Generated Initiatives' : 'Initiatives générées'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn
                        ? `${message.metadata.initiatives.length} initiative(s) ready to add`
                        : `${message.metadata.initiatives.length} initiative(s) prête(s) à ajouter`}
                    </p>
                  </div>
                )}
                {message.metadata?.okrs && message.metadata.okrs.length > 0 && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'OKR Generated' : 'OKR généré'}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'OKR ready to review' : 'OKR prêt à être examiné'}
                    </p>
                  </div>
                )}
                {message.metadata?.error && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
                    <p className="text-xs italic" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Error details logged' : 'Détails de l\'erreur enregistrés'}
                    </p>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
                  <User className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex gap-3 justify-start transition-all">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border rounded-2xl px-4 py-3 shadow-sm" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(var(--color-primary-400))', animationDelay: '0s' }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(var(--color-primary-400))', animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'rgb(var(--color-primary-400))', animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggested Prompts */}
        {showSuggestions && messages.length <= 1 && (
          <div className="space-y-2 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Suggested questions' : 'Questions suggérées'}
              </span>
            </div>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSuggestionClick(prompt)}
                className="w-full text-left p-3 rounded-lg border text-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                {isEn ? prompt.en : prompt.fr}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))' }}>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null); // Clear error when typing
            }}
            onKeyDown={handleKeyDown}
            placeholder={isEn ? 'Ask James anything...' : 'Demandez n\'importe quoi à James...'}
            className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 rounded-lg border resize-none text-sm"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              borderColor: error ? 'rgb(var(--color-error))' : 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
            rows={1}
            disabled={isLoading}
            maxLength={10000}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'rgb(var(--color-text-on-primary))',
            }}
            aria-label={isEn ? 'Send' : 'Envoyer'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {input.length > 9000 && (
          <p className="text-xs mt-1 text-right" style={{ color: 'rgb(var(--color-warning))' }}>
            {input.length}/10,000 {isEn ? 'characters' : 'caractères'}
          </p>
        )}
      </div>
    </div>
  );
}
