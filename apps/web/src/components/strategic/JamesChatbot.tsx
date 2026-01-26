/**
 * James AI Chatbot Component - Full-Featured Executive Tool
 * 
 * A comprehensive AI assistant for executive strategic planning with:
 * - Multiple workspace modes (Chat, Actions, Templates, History)
 * - Conversation management and export
 * - Quick action buttons with direct impact
 * - Keyboard shortcuts
 * - Resizable panel
 * - Voice input support
 * - Rich interactive responses
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
  RefreshCw,
  Settings,
  Mic,
  MicOff,
  FileText,
  History,
  Layout,
  PlusCircle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Briefcase,
  TrendingUp as Growth,
  Users,
  Building,
  Cog,
  ArrowRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  GripVertical,
  Command,
  Keyboard,
  Star,
  StarOff,
  Pin,
  ChevronUp,
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

type WorkspaceTab = 'chat' | 'actions' | 'templates' | 'history';

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
}

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    id: 'extend-runway',
    icon: TrendingUp,
    title: { en: 'Extend Runway', fr: 'Prolonger le runway' },
    description: { en: 'Get strategies to extend your cash runway', fr: 'Obtenir des stratégies pour prolonger votre runway' },
    prompt: { 
      en: 'Analyze my current financial position and provide 3-5 specific, actionable strategies to extend my cash runway. Include estimated impact for each strategy.',
      fr: 'Analysez ma position financière actuelle et fournissez 3-5 stratégies spécifiques et actionnables pour prolonger mon runway de trésorerie. Incluez l\'impact estimé pour chaque stratégie.'
    },
    category: 'runway',
    color: 'success',
  },
  {
    id: 'reduce-burn',
    icon: TrendingDown,
    title: { en: 'Reduce Burn Rate', fr: 'Réduire le burn rate' },
    description: { en: 'Find ways to decrease monthly burn', fr: 'Trouver des moyens de réduire le burn mensuel' },
    prompt: {
      en: 'Analyze my expenses and suggest 3-5 ways to reduce my monthly burn rate while maintaining growth potential. Be specific about amounts and trade-offs.',
      fr: 'Analysez mes dépenses et suggérez 3-5 façons de réduire mon burn rate mensuel tout en maintenant le potentiel de croissance. Soyez précis sur les montants et les compromis.'
    },
    category: 'runway',
    color: 'warning',
  },
  {
    id: 'generate-q-initiatives',
    icon: Zap,
    title: { en: 'Q1 Initiatives', fr: 'Initiatives Q1' },
    description: { en: 'Generate strategic initiatives for this quarter', fr: 'Générer des initiatives stratégiques pour ce trimestre' },
    prompt: {
      en: 'Generate 3-5 strategic initiatives for Q1 2026 that will improve our financial position. For each, include: name, category, timeline, expected cash impact, and confidence level.',
      fr: 'Générez 3-5 initiatives stratégiques pour le T1 2026 qui amélioreront notre position financière. Pour chacune, incluez: nom, catégorie, calendrier, impact de trésorerie attendu et niveau de confiance.'
    },
    category: 'initiatives',
    color: 'primary',
  },
  {
    id: 'revenue-initiatives',
    icon: Growth,
    title: { en: 'Revenue Growth', fr: 'Croissance des revenus' },
    description: { en: 'Initiatives to increase revenue', fr: 'Initiatives pour augmenter les revenus' },
    prompt: {
      en: 'Suggest 3 revenue-focused initiatives that could increase our monthly revenue within 3-6 months. Include implementation timeline and expected revenue impact.',
      fr: 'Suggérez 3 initiatives axées sur les revenus qui pourraient augmenter nos revenus mensuels dans les 3-6 mois. Incluez le calendrier de mise en œuvre et l\'impact de revenus attendu.'
    },
    category: 'initiatives',
    color: 'success',
  },
  {
    id: 'create-okrs',
    icon: Target,
    title: { en: 'Create OKRs', fr: 'Créer des OKR' },
    description: { en: 'Generate quarterly OKRs', fr: 'Générer des OKR trimestriels' },
    prompt: {
      en: 'Create OKRs for Q1 2026 focused on financial health. Generate 2-3 objectives, each with 3-4 measurable key results tied to cashflow and growth metrics.',
      fr: 'Créez des OKR pour le T1 2026 axés sur la santé financière. Générez 2-3 objectifs, chacun avec 3-4 résultats clés mesurables liés aux métriques de trésorerie et de croissance.'
    },
    category: 'okrs',
    color: 'info',
  },
  {
    id: 'scenario-analysis',
    icon: Layout,
    title: { en: 'Scenario Analysis', fr: 'Analyse de scénarios' },
    description: { en: 'Compare and optimize scenarios', fr: 'Comparer et optimiser les scénarios' },
    prompt: {
      en: 'Analyze my current scenario and suggest optimizations. What assumptions should I adjust? What initiatives would have the biggest impact on runway?',
      fr: 'Analysez mon scénario actuel et suggérez des optimisations. Quelles hypothèses devrais-je ajuster? Quelles initiatives auraient le plus grand impact sur le runway?'
    },
    category: 'analysis',
    color: 'primary',
  },
  {
    id: 'funding-strategy',
    icon: Briefcase,
    title: { en: 'Funding Strategy', fr: 'Stratégie de financement' },
    description: { en: 'Evaluate funding options', fr: 'Évaluer les options de financement' },
    prompt: {
      en: 'Based on my current runway and burn rate, what funding strategy should I consider? Evaluate timing, amount to raise, and type of funding (equity, debt, grants).',
      fr: 'Basé sur mon runway actuel et mon burn rate, quelle stratégie de financement devrais-je envisager? Évaluez le timing, le montant à lever et le type de financement (equity, dette, subventions).'
    },
    category: 'planning',
    color: 'info',
  },
  {
    id: 'cost-optimization',
    icon: Cog,
    title: { en: 'Cost Optimization', fr: 'Optimisation des coûts' },
    description: { en: 'Identify cost savings opportunities', fr: 'Identifier les opportunités d\'économies' },
    prompt: {
      en: 'Perform a cost optimization analysis. Identify the top 5 areas where we could reduce expenses without significantly impacting growth or operations.',
      fr: 'Effectuez une analyse d\'optimisation des coûts. Identifiez les 5 principaux domaines où nous pourrions réduire les dépenses sans impact significatif sur la croissance ou les opérations.'
    },
    category: 'analysis',
    color: 'warning',
  },
];

const CATEGORY_INFO = {
  runway: { en: 'Runway & Cash', fr: 'Runway & Trésorerie', icon: Clock },
  initiatives: { en: 'Initiatives', fr: 'Initiatives', icon: Zap },
  okrs: { en: 'OKRs & Goals', fr: 'OKR & Objectifs', icon: Target },
  analysis: { en: 'Analysis', fr: 'Analyse', icon: Layout },
  planning: { en: 'Planning', fr: 'Planification', icon: Calendar },
};

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
  const [isListening, setIsListening] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(true);
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

  // Focus input when opened or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'chat' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to toggle James
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onToggle();
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // Cmd/Ctrl + N for new conversation
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
          ? "Hi! I'm James, your AI strategic advisor. I can help you:\n\n• **Extend runway** and reduce burn rate\n• **Generate initiatives** and OKRs\n• **Analyze scenarios** and optimize planning\n\nUse the **Actions** tab for quick tasks, or ask me anything!"
          : "Bonjour! Je suis James, votre conseiller stratégique IA. Je peux vous aider à:\n\n• **Prolonger le runway** et réduire le burn rate\n• **Générer des initiatives** et des OKR\n• **Analyser des scénarios** et optimiser la planification\n\nUtilisez l'onglet **Actions** pour des tâches rapides, ou posez-moi n'importe quelle question!",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, isEn]);

  const handleNewConversation = useCallback(() => {
    // Save current conversation if it has messages
    if (messages.length > 1 && currentConversationId) {
      const updatedHistories = conversationHistories.map(c => 
        c.id === currentConversationId 
          ? { ...c, messages, updatedAt: new Date() }
          : c
      );
      setConversationHistories(updatedHistories);
      saveConversations(updatedHistories);
    }

    // Start new conversation
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
        } else if (lowerMessage.includes('okr') || lowerMessage.includes('objective') || lowerMessage.includes('key result')) {
          type = 'okr';
        } else if (lowerMessage.includes('strategy') || lowerMessage.includes('extend') || lowerMessage.includes('reduce') || lowerMessage.includes('optimize')) {
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
          userFriendlyMessage = isEn ? "Request timed out. Try a shorter message." : "Requête expirée. Essayez un message plus court.";
        } else if (errorMessage.includes('rate limit')) {
          userFriendlyMessage = isEn ? "Too many requests. Please wait a moment." : "Trop de requêtes. Attendez un moment.";
        }

        jamesAnalytics.trackError(error instanceof Error ? error.name : 'UnknownError', errorMessage);

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
    [input, isLoading, financialContext, scenarios, activeScenarioId, onInitiativesGenerated, onOKRGenerated, isEn, messages, currentConversationId, conversationHistories, saveConversations]
  );

  const handleTemplateClick = useCallback((template: ActionTemplate) => {
    const prompt = isEn ? template.prompt.en : template.prompt.fr;
    setActiveTab('chat');
    handleSend(prompt);
  }, [handleSend, isEn]);

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
    if (!isFinite(months)) return isEn ? '∞' : '∞';
    if (months < 0) return isEn ? 'Critical' : 'Critique';
    return `${Math.round(months)}mo`;
  };

  const getRunwayColor = (months: number) => {
    if (months < 6) return 'error';
    if (months < 12) return 'warning';
    return 'success';
  };

  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      if (formattedLine.startsWith('• ') || formattedLine.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 pl-1">
            <span style={{ color: 'rgb(var(--color-primary-500))' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.slice(2) }} />
          </div>
        );
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} className={line === '' ? 'block h-3' : 'block'} />;
    });
  };

  const filteredTemplates = selectedCategory
    ? ACTION_TEMPLATES.filter(t => t.category === selectedCategory)
    : ACTION_TEMPLATES;

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all active:scale-95"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
        }}
        aria-label={isEn ? 'Open James AI (⌘K)' : 'Ouvrir James IA (⌘K)'}
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
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
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
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
            title={isEn ? 'Export conversation' : 'Exporter la conversation'}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            title={isEn ? 'Keyboard shortcuts' : 'Raccourcis clavier'}
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

      {/* Keyboard shortcuts tooltip */}
      {showShortcuts && (
        <div
          className="absolute top-16 right-4 p-4 rounded-xl shadow-xl z-10 text-sm"
          style={{
            backgroundColor: 'rgb(var(--color-bg))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <h4 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Shortcuts' : 'Raccourcis'}
          </h4>
          <div className="space-y-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <div className="flex justify-between gap-4">
              <span>⌘K</span>
              <span>{isEn ? 'Toggle James' : 'Basculer James'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>⌘N</span>
              <span>{isEn ? 'New chat' : 'Nouveau chat'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Esc</span>
              <span>{isEn ? 'Close' : 'Fermer'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Enter</span>
              <span>{isEn ? 'Send' : 'Envoyer'}</span>
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
          { id: 'actions' as WorkspaceTab, icon: Zap, label: { en: 'Actions', fr: 'Actions' } },
          { id: 'templates' as WorkspaceTab, icon: FileText, label: { en: 'Templates', fr: 'Modèles' } },
          { id: 'history' as WorkspaceTab, icon: History, label: { en: 'History', fr: 'Historique' } },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-all relative`}
            style={{
              color: activeTab === tab.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))',
              backgroundColor: activeTab === tab.id ? 'rgb(var(--color-primary-500) / 0.05)' : 'transparent',
            }}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? tab.label.en : tab.label.fr}</span>
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Financial Context Bar */}
      {showContextPanel && activeTab === 'chat' && (
        <div
          className="px-4 py-2.5 flex-shrink-0 border-b flex items-center gap-3 overflow-x-auto"
          style={{
            backgroundColor: 'rgb(var(--color-bg-subtle))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <DollarSign className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>Cash</p>
              <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(financialContext.currentCash)}</p>
            </div>
          </div>
          
          <div className="w-px h-8" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock className="w-4 h-4" style={{ color: `rgb(var(--color-${getRunwayColor(financialContext.runwayMonths)}))` }} />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>Runway</p>
              <p className="text-sm font-semibold" style={{ color: `rgb(var(--color-${getRunwayColor(financialContext.runwayMonths)}))` }}>{formatRunway(financialContext.runwayMonths)}</p>
            </div>
          </div>
          
          <div className="w-px h-8" style={{ backgroundColor: 'rgb(var(--color-border))' }} />
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgb(var(--color-text-muted))' }}>Burn</p>
              <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{formatCurrency(financialContext.burnRate)}</p>
            </div>
          </div>

          <button
            onClick={() => setShowContextPanel(false)}
            className="ml-auto p-1 rounded hover:bg-black/5"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      )}

      {!showContextPanel && activeTab === 'chat' && (
        <button
          onClick={() => setShowContextPanel(true)}
          className="px-4 py-1.5 text-xs flex items-center justify-center gap-2 border-b"
          style={{
            borderColor: 'rgb(var(--color-border))',
            color: 'rgb(var(--color-text-muted))',
            backgroundColor: 'rgb(var(--color-bg-subtle))',
          }}
        >
          <ChevronDown className="w-3 h-3" />
          {isEn ? 'Show context' : 'Afficher contexte'}
        </button>
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
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 group ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                  style={message.role === 'user'
                    ? { background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)', color: 'white' }
                    : { backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text))' }
                  }
                >
                  <div className="text-sm leading-relaxed">{renderMessageContent(message.content)}</div>
                  
                  {message.metadata?.initiatives && message.metadata.initiatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'rgb(var(--color-border))' }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}>
                        <Zap className="w-3 h-3" style={{ color: 'rgb(var(--color-success))' }} />
                      </div>
                      <p className="text-xs font-medium flex-1" style={{ color: 'rgb(var(--color-success))' }}>
                        {message.metadata.initiatives.length} {isEn ? 'initiative(s) added' : 'initiative(s) ajoutée(s)'}
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

                  {message.role === 'assistant' && message.id !== 'welcome' && (
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg opacity-50 sm:opacity-30 hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
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
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-100))' }}>
                    <User className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)' }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-bl-md px-4 py-3" style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))' }}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
                    <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{isEn ? 'Thinking...' : 'Réflexion...'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick suggestions for empty/welcome state */}
            {messages.length <= 1 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium px-1 flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--color-warning))' }} />
                  {isEn ? 'Try asking:' : 'Essayez:'}
                </p>
                {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handleSend(isEn ? prompt.en : prompt.fr)}
                    className="w-full text-left p-3 rounded-xl text-sm transition-colors active:opacity-80"
                    style={{ backgroundColor: 'rgb(var(--color-bg))', border: '1px solid rgb(var(--color-border))', color: 'rgb(var(--color-text))' }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{isEn ? prompt.en : prompt.fr}</span>
                      <ArrowRight className="w-4 h-4 opacity-50" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="p-4 space-y-4">
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Quick actions to help you plan strategically' : 'Actions rapides pour vous aider à planifier stratégiquement'}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {ACTION_TEMPLATES.slice(0, 6).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="p-4 rounded-xl text-left transition-colors active:opacity-80"
                  style={{
                    backgroundColor: `rgb(var(--color-${template.color}) / 0.05)`,
                    border: `1px solid rgb(var(--color-${template.color}) / 0.15)`,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `rgb(var(--color-${template.color}) / 0.1)` }}>
                    <template.icon className="w-4 h-4" style={{ color: `rgb(var(--color-${template.color}))` }} />
                  </div>
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? template.title.en : template.title.fr}
                  </h4>
                  <p className="text-xs line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? template.description.en : template.description.fr}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-4 space-y-4">
            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedCategory ? 'ring-2 ring-offset-1' : ''}`}
                style={{
                  backgroundColor: !selectedCategory ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg))',
                  color: !selectedCategory ? 'white' : 'rgb(var(--color-text))',
                  border: '1px solid rgb(var(--color-border))',
                  ringColor: 'rgb(var(--color-primary-500))',
                }}
              >
                {isEn ? 'All' : 'Tous'}
              </button>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${selectedCategory === key ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    backgroundColor: selectedCategory === key ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg))',
                    color: selectedCategory === key ? 'white' : 'rgb(var(--color-text))',
                    border: '1px solid rgb(var(--color-border))',
                    ringColor: 'rgb(var(--color-primary-500))',
                  }}
                >
                  <info.icon className="w-3 h-3" />
                  {isEn ? info.en : info.fr}
                </button>
              ))}
            </div>

            {/* Template list */}
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="w-full p-4 rounded-xl text-left transition-colors active:opacity-80"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `rgb(var(--color-${template.color}) / 0.1)` }}>
                      <template.icon className="w-5 h-5" style={{ color: `rgb(var(--color-${template.color}))` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {isEn ? template.title.en : template.title.fr}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? template.description.en : template.description.fr}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            {conversationHistories.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'No conversation history yet' : 'Pas d\'historique de conversation'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Starred conversations first */}
                {conversationHistories.filter(c => c.starred).length > 0 && (
                  <>
                    <p className="text-xs font-medium px-1 flex items-center gap-2" style={{ color: 'rgb(var(--color-warning))' }}>
                      <Star className="w-3 h-3" />
                      {isEn ? 'Starred' : 'Favoris'}
                    </p>
                    {conversationHistories.filter(c => c.starred).map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 rounded-xl group"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg))',
                          border: '1px solid rgb(var(--color-border))',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleLoadConversation(conv)} className="flex-1 text-left">
                            <h4 className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{conv.title}</h4>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {conv.messages.length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
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

                {/* Regular conversations */}
                {conversationHistories.filter(c => !c.starred).length > 0 && (
                  <>
                    <p className="text-xs font-medium px-1 mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Recent' : 'Récents'}
                    </p>
                    {conversationHistories.filter(c => !c.starred).slice(0, 10).map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 rounded-xl group"
                        style={{
                          backgroundColor: 'rgb(var(--color-bg))',
                          border: '1px solid rgb(var(--color-border))',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <button onClick={() => handleLoadConversation(conv)} className="flex-1 text-left">
                            <h4 className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{conv.title}</h4>
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {conv.messages.length} messages • {new Date(conv.updatedAt).toLocaleDateString()}
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

      {/* Input Area - Only show on chat tab */}
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
                border: error ? '1px solid rgb(var(--color-error))' : '1px solid rgb(var(--color-border))',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                placeholder={isEn ? 'Ask James anything... (Enter to send)' : 'Demandez à James... (Entrée pour envoyer)'}
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
                boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.3)',
              }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
          {input.length > 9000 && (
            <p className="text-xs mt-2 text-right" style={{ color: 'rgb(var(--color-warning))' }}>
              {input.length.toLocaleString()}/10,000
            </p>
          )}
        </div>
      )}
    </div>
  );
}
