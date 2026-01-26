/**
 * James AI Chatbot Component - Premium Executive Experience
 * 
 * A beautifully designed AI assistant with:
 * - Rich markdown rendering with code blocks, headers, and tables
 * - Smooth animations and transitions
 * - Context-aware suggestions
 * - Beautiful message bubbles with proper formatting
 * - Premium visual design following the theme
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
  MessageCircle,
  DollarSign,
  Calendar,
  Zap,
  ChevronRight,
  ChevronDown,
  Clock,
  Copy,
  Check,
  Trash2,
  Download,
  FileText,
  History,
  Layout,
  PlusCircle,
  Briefcase,
  Users,
  Cog,
  ArrowRight,
  Maximize2,
  Minimize2,
  Keyboard,
  Star,
  StarOff,
  ChevronUp,
  BarChart3,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  BookOpen,
  Cpu,
  CircleDot,
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

type WorkspaceTab = 'chat' | 'actions' | 'history';

interface ConversationHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  starred: boolean;
}

interface ActionTemplate {
  id: string;
  icon: typeof Target;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  prompt: { en: string; fr: string };
  category: 'runway' | 'initiatives' | 'okrs' | 'analysis' | 'planning';
  color: string;
  gradient?: string;
}

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'extend-runway',
    icon: TrendingUp,
    title: { en: 'Extend Runway', fr: 'Prolonger le runway' },
    description: { en: 'Strategic options to extend cash runway', fr: 'Options stratégiques pour prolonger le runway' },
    prompt: { 
      en: 'Analyze my current financial position and provide 3-5 specific, actionable strategies to extend my cash runway. Include estimated impact for each strategy.',
      fr: 'Analysez ma position financière actuelle et fournissez 3-5 stratégies spécifiques et actionnables pour prolonger mon runway de trésorerie.'
    },
    category: 'runway',
    color: 'success',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'reduce-burn',
    icon: TrendingDown,
    title: { en: 'Reduce Burn Rate', fr: 'Réduire le burn rate' },
    description: { en: 'Identify cost reduction opportunities', fr: 'Identifier les opportunités de réduction des coûts' },
    prompt: {
      en: 'Analyze my expenses and suggest 3-5 ways to reduce my monthly burn rate while maintaining growth potential.',
      fr: 'Analysez mes dépenses et suggérez 3-5 façons de réduire mon burn rate mensuel.'
    },
    category: 'runway',
    color: 'warning',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'generate-initiatives',
    icon: Zap,
    title: { en: 'Generate Initiatives', fr: 'Générer des initiatives' },
    description: { en: 'Create strategic initiatives for growth', fr: 'Créer des initiatives stratégiques' },
    prompt: {
      en: 'Generate 3-5 strategic initiatives for Q1 2026 that will improve our financial position. Include name, timeline, and expected cash impact.',
      fr: 'Générez 3-5 initiatives stratégiques pour le T1 2026 qui amélioreront notre position financière.'
    },
    category: 'initiatives',
    color: 'primary',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'revenue-growth',
    icon: BarChart3,
    title: { en: 'Revenue Growth Plan', fr: 'Plan de croissance' },
    description: { en: 'Strategies to increase monthly revenue', fr: 'Stratégies pour augmenter les revenus' },
    prompt: {
      en: 'Suggest 3 revenue-focused initiatives that could increase our monthly revenue within 3-6 months. Include implementation steps.',
      fr: 'Suggérez 3 initiatives axées sur les revenus qui pourraient augmenter nos revenus mensuels.'
    },
    category: 'initiatives',
    color: 'success',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'create-okrs',
    icon: Target,
    title: { en: 'Create OKRs', fr: 'Créer des OKR' },
    description: { en: 'Generate quarterly objectives & key results', fr: 'Générer des OKR trimestriels' },
    prompt: {
      en: 'Create OKRs for Q1 2026 focused on financial health. Generate 2-3 objectives with 3-4 measurable key results each.',
      fr: 'Créez des OKR pour le T1 2026 axés sur la santé financière.'
    },
    category: 'okrs',
    color: 'info',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'hiring-analysis',
    icon: Users,
    title: { en: 'Hiring Analysis', fr: 'Analyse d\'embauche' },
    description: { en: 'Evaluate if you can afford new hires', fr: 'Évaluer si vous pouvez embaucher' },
    prompt: {
      en: 'Can we afford to hire a new team member? Analyze our financial position and provide recommendations on hiring timing and budget.',
      fr: 'Pouvons-nous nous permettre d\'embaucher? Analysez notre position financière et fournissez des recommandations.'
    },
    category: 'analysis',
    color: 'primary',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    id: 'funding-strategy',
    icon: Briefcase,
    title: { en: 'Funding Strategy', fr: 'Stratégie de financement' },
    description: { en: 'Evaluate fundraising options', fr: 'Évaluer les options de financement' },
    prompt: {
      en: 'Based on my runway and burn rate, what funding strategy should I consider? Evaluate timing, amount, and type of funding.',
      fr: 'Basé sur mon runway et burn rate, quelle stratégie de financement devrais-je envisager?'
    },
    category: 'planning',
    color: 'info',
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'scenario-compare',
    icon: Layout,
    title: { en: 'Compare Scenarios', fr: 'Comparer les scénarios' },
    description: { en: 'Analyze and optimize your scenarios', fr: 'Analyser et optimiser vos scénarios' },
    prompt: {
      en: 'Compare my current scenarios (base, optimistic, pessimistic) and suggest which assumptions I should adjust for better outcomes.',
      fr: 'Comparez mes scénarios actuels et suggérez les hypothèses à ajuster.'
    },
    category: 'analysis',
    color: 'warning',
    gradient: 'from-orange-500 to-red-600',
  },
];

const QUICK_ACTIONS = [
  { id: 'runway', label: { en: 'What\'s my runway?', fr: 'Quel est mon runway?' }, icon: Clock },
  { id: 'hiring', label: { en: 'Can I afford to hire?', fr: 'Puis-je embaucher?' }, icon: Users },
  { id: 'costs', label: { en: 'How to cut costs?', fr: 'Comment réduire les coûts?' }, icon: TrendingDown },
  { id: 'revenue', label: { en: 'Grow revenue', fr: 'Augmenter les revenus' }, icon: TrendingUp },
];

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversationHistories, setConversationHistories] = useState<ConversationHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('james-conversations');
      if (stored) {
        const parsed = JSON.parse(stored);
        setConversationHistories(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })));
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, []);

  // Save conversations to localStorage
  const saveConversations = useCallback((convos: ConversationHistory[]) => {
    try {
      localStorage.setItem('james-conversations', JSON.stringify(convos));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && activeTab === 'chat' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onToggle();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && isOpen) {
        e.preventDefault();
        handleNewConversation();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle, onClose]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: isEn
          ? `## Welcome! 👋\n\nI'm **James**, your AI strategic advisor. I'm here to help you make smarter financial decisions.\n\n### What I can help with:\n- **Runway Analysis** - Understand how long your cash will last\n- **Cost Optimization** - Find ways to reduce expenses\n- **Growth Strategy** - Plan initiatives to increase revenue\n- **Hiring Decisions** - Evaluate if you can afford new team members\n\nTry one of the quick actions below, or ask me anything!`
          : `## Bienvenue! 👋\n\nJe suis **James**, votre conseiller stratégique IA. Je suis là pour vous aider à prendre de meilleures décisions financières.\n\n### Comment je peux vous aider:\n- **Analyse du runway** - Comprendre combien de temps durera votre trésorerie\n- **Optimisation des coûts** - Trouver des moyens de réduire les dépenses\n- **Stratégie de croissance** - Planifier des initiatives pour augmenter les revenus\n- **Décisions d'embauche** - Évaluer si vous pouvez embaucher\n\nEssayez une action rapide ci-dessous, ou posez-moi n'importe quelle question!`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isEn]);

  const handleNewConversation = useCallback(() => {
    if (messages.length > 1 && currentConversationId) {
      const updatedHistories = conversationHistories.map(c => 
        c.id === currentConversationId 
          ? { ...c, messages, updatedAt: new Date() }
          : c
      );
      setConversationHistories(updatedHistories);
      saveConversations(updatedHistories);
    }
    setMessages([]);
    setCurrentConversationId(null);
    setActiveTab('chat');
  }, [messages, currentConversationId, conversationHistories, saveConversations]);

  const handleLoadConversation = useCallback((conversation: ConversationHistory) => {
    setMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
    setActiveTab('chat');
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    const updatedHistories = conversationHistories.filter(c => c.id !== id);
    setConversationHistories(updatedHistories);
    saveConversations(updatedHistories);
    if (currentConversationId === id) {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationHistories, currentConversationId, saveConversations]);

  const handleToggleStar = useCallback((id: string) => {
    const updatedHistories = conversationHistories.map(c => 
      c.id === id ? { ...c, starred: !c.starred } : c
    );
    setConversationHistories(updatedHistories);
    saveConversations(updatedHistories);
  }, [conversationHistories, saveConversations]);

  const handleExportConversation = useCallback(() => {
    const exportData = {
      title: `James AI Conversation - ${new Date().toISOString()}`,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      financialContext: {
        cash: financialContext.currentCash,
        runway: financialContext.runwayMonths,
        burnRate: financialContext.burnRate,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `james-conversation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, financialContext]);

  const handleCopyMessage = useCallback((messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleFeedback = useCallback((messageId: string, positive: boolean) => {
    setFeedbackGiven(prev => new Set([...prev, messageId]));
    jamesAnalytics.trackFeedback(messageId, positive);
  }, []);

  const handleSend = useCallback(
    async (content?: string) => {
      const userMessage = content || input.trim();
      if (!userMessage || isLoading) return;

      if (userMessage.length > 10000) {
        setError(isEn ? "Message too long (max 10,000 chars)" : "Message trop long (max 10 000 car.)");
        return;
      }

      setError(null);

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      try {
        let type: 'strategy' | 'initiative' | 'okr' | 'general' = 'general';
        const lowerMessage = userMessage.toLowerCase();
        if (lowerMessage.includes('initiative') || lowerMessage.includes('generate')) {
          type = 'initiative';
        } else if (lowerMessage.includes('okr') || lowerMessage.includes('objective')) {
          type = 'okr';
        } else if (lowerMessage.includes('strategy') || lowerMessage.includes('extend') || lowerMessage.includes('reduce')) {
          type = 'strategy';
        }

        const enhancedContext: FinancialContext = {
          ...financialContext,
          scenarios,
          activeScenario: scenarios.find((s) => s.id === activeScenarioId) || undefined,
          initiatives: scenarios.find((s) => s.id === activeScenarioId)?.initiatives || [],
        };

        const response = await jamesAI.sendMessage(userMessage, enhancedContext, { type });

        if (response.error) {
          throw new Error(response.error);
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          metadata: response.metadata,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-save conversation
        if (!currentConversationId) {
          const newConvo: ConversationHistory = {
            id: `conv-${Date.now()}`,
            title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
            messages: [...messages, userMsg, assistantMsg],
            createdAt: new Date(),
            updatedAt: new Date(),
            starred: false,
          };
          const updatedHistories = [newConvo, ...conversationHistories];
          setConversationHistories(updatedHistories);
          setCurrentConversationId(newConvo.id);
          saveConversations(updatedHistories);
        }

        if (response.metadata?.initiatives && onInitiativesGenerated) {
          onInitiativesGenerated(response.metadata.initiatives);
        }

        if (response.metadata?.okrs && response.metadata.okrs.length > 0 && onOKRGenerated) {
          onOKRGenerated(response.metadata.okrs[0]);
        }

        jamesAnalytics.trackMessageSent(userMessage.length, type);
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        let userFriendlyMessage = isEn
          ? "Sorry, I encountered an error. Please try again."
          : "Désolé, j'ai rencontré une erreur. Veuillez réessayer.";

        if (errorMessage.includes('timeout')) {
          userFriendlyMessage = isEn ? "Request timed out. Try a shorter message." : "Requête expirée.";
        } else if (errorMessage.includes('rate limit')) {
          userFriendlyMessage = isEn ? "Too many requests. Please wait." : "Trop de requêtes. Attendez.";
        }

        jamesAnalytics.trackError(error instanceof Error ? error.name : 'UnknownError', errorMessage);

        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${userFriendlyMessage}`,
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
    [input, isLoading, financialContext, scenarios, activeScenarioId, onInitiativesGenerated, onOKRGenerated, isEn, messages, currentConversationId, conversationHistories, saveConversations]
  );

  const handleTemplateClick = useCallback((template: ActionTemplate) => {
    const prompt = isEn ? template.prompt.en : template.prompt.fr;
    setActiveTab('chat');
    handleSend(prompt);
  }, [handleSend, isEn]);

  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[0]) => {
    handleSend(isEn ? action.label.en : action.label.fr);
  }, [handleSend, isEn]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatRunway = (months: number) => {
    if (!isFinite(months) || months > 100) return '∞';
    if (months < 0) return isEn ? 'Critical' : 'Critique';
    return `${Math.round(months)} ${isEn ? 'months' : 'mois'}`;
  };

  const getRunwayStatus = (months: number) => {
    if (months < 6) return { color: 'error', label: isEn ? 'Critical' : 'Critique', icon: AlertCircle };
    if (months < 12) return { color: 'warning', label: isEn ? 'Warning' : 'Attention', icon: AlertCircle };
    return { color: 'success', label: isEn ? 'Healthy' : 'Sain', icon: Check };
  };

  // Enhanced markdown rendering
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    lines.forEach((line, i) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3);
          codeContent = '';
        } else {
          inCodeBlock = false;
          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(30, 30, 30)' }}>
              {codeLanguage && (
                <div className="px-3 py-1.5 text-xs font-mono border-b border-gray-700" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {codeLanguage}
                </div>
              )}
              <pre className="p-3 text-sm font-mono overflow-x-auto" style={{ color: '#e5e5e5' }}>
                <code>{codeContent.trim()}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="text-sm font-bold mt-4 mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <CircleDot className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
            {line.slice(4)}
          </h4>
        );
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="text-base font-bold mt-3 mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {line.slice(3)}
          </h3>
        );
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="text-lg font-bold mt-2 mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {line.slice(2)}
          </h2>
        );
        return;
      }

      // Horizontal rule
      if (line.match(/^-{3,}$/) || line.match(/^_{3,}$/)) {
        elements.push(
          <hr key={i} className="my-3" style={{ borderColor: 'rgb(var(--color-border))' }} />
        );
        return;
      }

      // Format inline elements
      let formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold" style="color: rgb(var(--color-text))">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded text-xs font-mono" style="background: rgb(var(--color-bg-muted)); color: rgb(var(--color-primary-500))">$1</code>')
        .replace(/✅/g, '<span style="color: rgb(var(--color-success))">✅</span>')
        .replace(/⚠️/g, '<span style="color: rgb(var(--color-warning))">⚠️</span>')
        .replace(/❌/g, '<span style="color: rgb(var(--color-error))">❌</span>')
        .replace(/💡/g, '<span style="color: rgb(var(--color-warning))">💡</span>')
        .replace(/📊/g, '<span style="color: rgb(var(--color-info))">📊</span>')
        .replace(/🎯/g, '<span style="color: rgb(var(--color-primary-500))">🎯</span>');

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        elements.push(
          <div key={i} className="flex gap-3 my-1.5 pl-1">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' }}>
              {numberedMatch[1]}
            </span>
            <span className="flex-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^\d+\.\s+/, '') }} />
          </div>
        );
        return;
      }

      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        elements.push(
          <div key={i} className="flex gap-2 my-1 pl-1">
            <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-500))' }} />
            <span className="flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine.slice(2) }} />
          </div>
        );
        return;
      }

      // Regular paragraph
      if (line.trim()) {
        elements.push(
          <p key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      } else {
        elements.push(<div key={i} className="h-2" />);
      }
    });

    return <div className="space-y-1">{elements}</div>;
  };

  const runwayStatus = getRunwayStatus(financialContext.runwayMonths);

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all active:scale-95 group"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
        }}
        aria-label={isEn ? 'Open James AI (⌘K)' : 'Ouvrir James IA (⌘K)'}
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <span className="text-white font-semibold text-sm block">James AI</span>
          <span className="text-white/60 text-xs">⌘K</span>
        </div>
        <Sparkles className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 flex flex-col transition-all duration-300 ease-out ${
        isExpanded
          ? 'inset-4 sm:inset-6 rounded-2xl'
          : 'right-0 top-0 h-full w-full sm:w-[440px] lg:w-[480px]'
      }`}
      style={{
        backgroundColor: 'rgb(var(--color-bg))',
        boxShadow: isExpanded ? '0 25px 80px rgb(0 0 0 / 0.25)' : '-8px 0 40px rgb(0 0 0 / 0.15)',
        border: isExpanded ? '1px solid rgb(var(--color-border))' : undefined,
        borderLeft: !isExpanded ? '1px solid rgb(var(--color-border))' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-600)) 0%, rgb(var(--color-primary-800)) 100%)',
          borderRadius: isExpanded ? '1rem 1rem 0 0' : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              James AI
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            </h3>
            <p className="text-xs text-white/60">
              {isEn ? 'Strategic Advisor' : 'Conseiller stratégique'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewConversation}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title={isEn ? 'New conversation (⌘N)' : 'Nouvelle conversation (⌘N)'}
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportConversation}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title={isEn ? 'Export' : 'Exporter'}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shortcuts tooltip */}
      {showShortcuts && (
        <div
          className="absolute top-16 right-4 p-4 rounded-xl shadow-xl z-10 text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <h4 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Keyboard Shortcuts' : 'Raccourcis'}
          </h4>
          <div className="space-y-1.5 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <div className="flex justify-between gap-6">
              <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">⌘K</kbd>
              <span>{isEn ? 'Toggle James' : 'Basculer James'}</span>
            </div>
            <div className="flex justify-between gap-6">
              <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">⌘N</kbd>
              <span>{isEn ? 'New chat' : 'Nouveau chat'}</span>
            </div>
            <div className="flex justify-between gap-6">
              <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">Esc</kbd>
              <span>{isEn ? 'Close' : 'Fermer'}</span>
            </div>
            <div className="flex justify-between gap-6">
              <kbd className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">Enter</kbd>
              <span>{isEn ? 'Send message' : 'Envoyer'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Context Bar */}
      {activeTab === 'chat' && (
        <div
          className="px-4 py-3 flex-shrink-0 border-b"
          style={{
            backgroundColor: 'rgb(var(--color-bg-subtle))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}>
                <Wallet className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Cash</p>
                <p className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(financialContext.currentCash)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgb(var(--color-${runwayStatus.color}) / 0.1)` }}>
                <Clock className="w-4 h-4" style={{ color: `rgb(var(--color-${runwayStatus.color}))` }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Runway</p>
                <p className="text-sm font-bold" style={{ color: `rgb(var(--color-${runwayStatus.color}))` }}>{formatRunway(financialContext.runwayMonths)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}>
                <ArrowDownRight className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Burn</p>
                <p className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(financialContext.burnRate)}/mo</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div
        className="flex border-b flex-shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        {[
          { id: 'chat' as WorkspaceTab, icon: MessageCircle, label: { en: 'Chat', fr: 'Chat' } },
          { id: 'actions' as WorkspaceTab, icon: Zap, label: { en: 'Quick Actions', fr: 'Actions' } },
          { id: 'history' as WorkspaceTab, icon: History, label: { en: 'History', fr: 'Historique' } },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all relative"
            style={{
              color: activeTab === tab.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
              backgroundColor: activeTab === tab.id ? 'rgb(var(--color-primary-500) / 0.05)' : 'transparent',
            }}
          >
            <tab.icon className="w-4 h-4" />
            <span>{isEn ? tab.label.en : tab.label.fr}</span>
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              />
            )}
          </button>
        ))}
      </div>

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
          <p className="text-xs flex-1" style={{ color: 'rgb(var(--color-error))' }}>{error}</p>
          <button onClick={() => setError(null)} className="p-1 rounded hover:bg-white/20" style={{ color: 'rgb(var(--color-error))' }}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}>
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)' }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`relative max-w-[85%] ${message.role === 'user' ? '' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                    style={message.role === 'user'
                      ? { background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)', color: 'white' }
                      : { backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text))' }
                    }
                  >
                    <div className="text-sm">{renderMessageContent(message.content)}</div>
                    
                    {message.metadata?.initiatives && message.metadata.initiatives.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
                          <Zap className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                        </div>
                        <p className="text-xs font-medium flex-1" style={{ color: 'rgb(var(--color-success))' }}>
                          {message.metadata.initiatives.length} {isEn ? 'initiative(s) created' : 'initiative(s) créée(s)'}
                        </p>
                        <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                      </div>
                    )}
                    
                    {message.metadata?.okrs && message.metadata.okrs.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}>
                          <Target className="w-3 h-3" style={{ color: 'rgb(var(--color-info))' }} />
                        </div>
                        <p className="text-xs font-medium flex-1" style={{ color: 'rgb(var(--color-info))' }}>
                          {isEn ? 'OKR created' : 'OKR créé'}
                        </p>
                        <Check className="w-4 h-4" style={{ color: 'rgb(var(--color-info))' }} />
                      </div>
                    )}
                  </div>

                  {/* Message actions */}
                  {message.role === 'assistant' && message.id !== 'welcome' && (
                    <div className="flex items-center gap-1 mt-1.5 pl-1">
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-success))' }} />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {!feedbackGiven.has(message.id) && (
                        <>
                          <button
                            onClick={() => handleFeedback(message.id, true)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-green-500/10"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, false)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                            style={{ color: 'rgb(var(--color-text-muted))' }}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {feedbackGiven.has(message.id) && (
                        <span className="text-xs px-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? 'Thanks for feedback!' : 'Merci!'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
                    <User className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading state */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)' }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'rgb(var(--color-primary-500))', animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'rgb(var(--color-primary-500))', animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'rgb(var(--color-primary-500))', animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'James is thinking...' : 'James réfléchit...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions for welcome state */}
            {messages.length <= 1 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold px-1 flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-warning))' }} />
                  {isEn ? 'Quick questions:' : 'Questions rapides:'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="flex items-center gap-2 p-3 rounded-xl text-sm text-left transition-all active:scale-98"
                      style={{ 
                        backgroundColor: 'rgb(var(--color-bg))', 
                        border: '1px solid rgb(var(--color-border))', 
                        color: 'rgb(var(--color-text))' 
                      }}
                    >
                      <action.icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      <span className="line-clamp-1">{isEn ? action.label.en : action.label.fr}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="p-4 space-y-4">
            <div className="text-center py-2">
              <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'What would you like to do?' : 'Que souhaitez-vous faire?'}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Select an action to get instant strategic advice' : 'Sélectionnez une action pour obtenir des conseils'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {ACTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="p-4 rounded-xl text-left transition-all active:scale-98 group relative overflow-hidden"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `rgb(var(--color-${template.color}) / 0.1)` }}
                  >
                    <template.icon className="w-5 h-5" style={{ color: `rgb(var(--color-${template.color}))` }} />
                  </div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? template.title.en : template.title.fr}
                  </h4>
                  <p className="text-xs line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? template.description.en : template.description.fr}
                  </p>
                  <ArrowRight 
                    className="absolute bottom-3 right-3 w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" 
                    style={{ color: `rgb(var(--color-${template.color}))` }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            {conversationHistories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
                  <History className="w-8 h-8" style={{ color: 'rgb(var(--color-text-muted))' }} />
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'No conversations yet' : 'Pas encore de conversations'}
                </h3>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Your chat history will appear here' : 'Votre historique apparaîtra ici'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Starred */}
                {conversationHistories.filter(c => c.starred).length > 0 && (
                  <>
                    <p className="text-xs font-semibold px-1 flex items-center gap-2" style={{ color: 'rgb(var(--color-warning))' }}>
                      <Star className="w-3 h-3" />
                      {isEn ? 'Starred' : 'Favoris'}
                    </p>
                    {conversationHistories.filter(c => c.starred).map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg))',
                          border: '1px solid rgb(var(--color-border))',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleLoadConversation(conv)} className="flex-1 text-left">
                            <h4 className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{conv.title}</h4>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {conv.messages.length} {isEn ? 'messages' : 'messages'} • {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </button>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggleStar(conv.id)} className="p-1.5 rounded-lg" style={{ color: 'rgb(var(--color-warning))' }}>
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                            <button onClick={() => handleDeleteConversation(conv.id)} className="p-1.5 rounded-lg" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Recent */}
                {conversationHistories.filter(c => !c.starred).length > 0 && (
                  <>
                    <p className="text-xs font-semibold px-1 mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Recent' : 'Récents'}
                    </p>
                    {conversationHistories.filter(c => !c.starred).slice(0, 10).map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg))',
                          border: '1px solid rgb(var(--color-border))',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleLoadConversation(conv)} className="flex-1 text-left">
                            <h4 className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{conv.title}</h4>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {conv.messages.length} {isEn ? 'messages' : 'messages'} • {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </button>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleToggleStar(conv.id)} className="p-1.5 rounded-lg" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              <StarOff className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteConversation(conv.id)} className="p-1.5 rounded-lg" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      {activeTab === 'chat' && (
        <div
          className="p-4 flex-shrink-0 border-t"
          style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg))' }}
        >
          <div className="flex items-end gap-2">
            <div
              className="flex-1 relative rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={isEn ? 'Ask James anything...' : 'Demandez à James...'}
                className="w-full min-h-[48px] max-h-32 px-4 py-3 resize-none text-sm bg-transparent focus:outline-none"
                style={{ color: 'rgb(var(--color-text))' }}
                rows={1}
                disabled={isLoading}
                maxLength={10000}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: input.trim() ? '0 4px 12px rgb(var(--color-primary-500) / 0.3)' : 'none',
              }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Press Enter to send • Shift+Enter for new line' : 'Entrée pour envoyer • Shift+Entrée nouvelle ligne'}
            </p>
            {input.length > 9000 && (
              <p className="text-xs" style={{ color: 'rgb(var(--color-warning))' }}>
                {input.length.toLocaleString()}/10,000
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
