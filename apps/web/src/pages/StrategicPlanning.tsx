/**
 * Strategic Planning Page - AI Assistant Mode
 * 
 * Full-screen AI Assistant with industry-specific action recommendations
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  Building2,
  Loader2,
  Target,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  ChevronRight,
  Crown,
  Calendar,
  Check,
  Home,
  UtensilsCrossed,
  Hammer,
  ShoppingBag,
  Factory,
  Heart,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTenant } from '../contexts/TenantContext';
import { useFinancialData } from '../hooks/useFinancialData';
import { useHasRealData } from '../hooks/useHasRealData';
import { usePremiumFeature, PremiumUpgradeBanner } from '../components/PremiumFeatureGate';
import { jamesAI, ChatMessage, ChatResponse } from '../lib/jamesAI';
import { 
  getIndustryStats, 
  getSuggestedActions, 
  SuggestedAction,
  getPatternInsight 
} from '../lib/industryMemory';
import { 
  IndustryType, 
  DataMetric,
  getActionTemplatesForIndustry,
  ActionTemplate 
} from '../lib/decisionContext';
import { ContentLoader } from '../components/PageLoader';

// Calendly link for upgrade consultations
const CALENDLY_URL = 'https://calendly.com/anthonypaquet1508';

// Industry icons mapping
const INDUSTRY_ICONS: Record<string, typeof Building2> = {
  real_estate: Home,
  restaurant: UtensilsCrossed,
  construction: Hammer,
  retail: ShoppingBag,
  professional_services: Briefcase,
  manufacturing: Factory,
  healthcare: Heart,
  transport: Truck,
};

// Industry display names
const INDUSTRY_NAMES: Record<string, { en: string; fr: string }> = {
  real_estate: { en: 'Real Estate', fr: 'Immobilier' },
  restaurant: { en: 'Restaurant', fr: 'Restauration' },
  construction: { en: 'Construction', fr: 'Construction' },
  retail: { en: 'Retail', fr: 'Commerce de détail' },
  professional_services: { en: 'Professional Services', fr: 'Services professionnels' },
  manufacturing: { en: 'Manufacturing', fr: 'Manufacturier' },
  healthcare: { en: 'Healthcare', fr: 'Santé' },
  transport: { en: 'Transport & Logistics', fr: 'Transport et logistique' },
};

// Industry-specific action suggestions
const INDUSTRY_ACTIONS: Record<string, Array<{
  id: string;
  title: { en: string; fr: string };
  description: { en: string; fr: string };
  metric: DataMetric;
  icon: typeof TrendingUp;
  successRate: number;
  avgImpact: number;
  color: string;
}>> = {
  real_estate: [
    {
      id: 're_optimize_expenses',
      title: { en: 'Optimize Operating Expenses', fr: 'Optimiser les dépenses opérationnelles' },
      description: { en: 'Reduce property management costs and negotiate vendor contracts', fr: 'Réduire les coûts de gestion immobilière et négocier les contrats fournisseurs' },
      metric: 'operating_expenses',
      icon: TrendingDown,
      successRate: 80,
      avgImpact: 4500,
      color: '#10B981',
    },
    {
      id: 're_increase_occupancy',
      title: { en: 'Increase Occupancy Rate', fr: 'Augmenter le taux d\'occupation' },
      description: { en: 'Marketing campaigns and tenant retention strategies', fr: 'Campagnes marketing et stratégies de rétention des locataires' },
      metric: 'occupancy_rate',
      icon: TrendingUp,
      successRate: 75,
      avgImpact: 6500,
      color: '#6366F1',
    },
    {
      id: 're_renovate',
      title: { en: 'Property Improvements', fr: 'Améliorations de propriété' },
      description: { en: 'Strategic renovations to increase rental value', fr: 'Rénovations stratégiques pour augmenter la valeur locative' },
      metric: 'rental_income',
      icon: DollarSign,
      successRate: 70,
      avgImpact: 12000,
      color: '#F59E0B',
    },
  ],
  restaurant: [
    {
      id: 'rst_food_cost',
      title: { en: 'Reduce Food Costs', fr: 'Réduire les coûts alimentaires' },
      description: { en: 'Menu engineering and supplier negotiations', fr: 'Ingénierie de menu et négociations fournisseurs' },
      metric: 'food_cost_pct',
      icon: TrendingDown,
      successRate: 85,
      avgImpact: 2400,
      color: '#10B981',
    },
    {
      id: 'rst_labor',
      title: { en: 'Optimize Labor Scheduling', fr: 'Optimiser les horaires' },
      description: { en: 'Smart scheduling to reduce overtime and improve coverage', fr: 'Planification intelligente pour réduire les heures supplémentaires' },
      metric: 'labor_cost_pct',
      icon: Users,
      successRate: 78,
      avgImpact: 1800,
      color: '#6366F1',
    },
    {
      id: 'rst_revenue',
      title: { en: 'Increase Average Check', fr: 'Augmenter l\'addition moyenne' },
      description: { en: 'Upselling training and menu optimization', fr: 'Formation à la vente additionnelle et optimisation du menu' },
      metric: 'revenue_per_seat',
      icon: TrendingUp,
      successRate: 72,
      avgImpact: 3200,
      color: '#F59E0B',
    },
  ],
  professional_services: [
    {
      id: 'ps_utilization',
      title: { en: 'Improve Utilization Rate', fr: 'Améliorer le taux d\'utilisation' },
      description: { en: 'Better project allocation and reduce non-billable time', fr: 'Meilleure allocation des projets et réduction du temps non facturable' },
      metric: 'utilization_rate',
      icon: BarChart3,
      successRate: 72,
      avgImpact: 8500,
      color: '#10B981',
    },
    {
      id: 'ps_pricing',
      title: { en: 'Review Pricing Strategy', fr: 'Réviser la stratégie tarifaire' },
      description: { en: 'Value-based pricing and rate card updates', fr: 'Tarification basée sur la valeur et mise à jour des tarifs' },
      metric: 'avg_hourly_rate',
      icon: DollarSign,
      successRate: 65,
      avgImpact: 12000,
      color: '#6366F1',
    },
    {
      id: 'ps_clients',
      title: { en: 'Expand Client Base', fr: 'Élargir la clientèle' },
      description: { en: 'Business development and marketing initiatives', fr: 'Développement commercial et initiatives marketing' },
      metric: 'new_clients',
      icon: Users,
      successRate: 60,
      avgImpact: 15000,
      color: '#F59E0B',
    },
  ],
  retail: [
    {
      id: 'ret_inventory',
      title: { en: 'Optimize Inventory', fr: 'Optimiser les stocks' },
      description: { en: 'Reduce carrying costs and improve turnover', fr: 'Réduire les coûts de stockage et améliorer la rotation' },
      metric: 'inventory_turnover',
      icon: TrendingUp,
      successRate: 75,
      avgImpact: 5000,
      color: '#10B981',
    },
    {
      id: 'ret_margins',
      title: { en: 'Improve Gross Margins', fr: 'Améliorer les marges brutes' },
      description: { en: 'Pricing strategy and supplier negotiations', fr: 'Stratégie de prix et négociations fournisseurs' },
      metric: 'gross_margin_pct',
      icon: DollarSign,
      successRate: 70,
      avgImpact: 8000,
      color: '#6366F1',
    },
    {
      id: 'ret_traffic',
      title: { en: 'Increase Store Traffic', fr: 'Augmenter l\'achalandage' },
      description: { en: 'Marketing and customer experience improvements', fr: 'Marketing et amélioration de l\'expérience client' },
      metric: 'foot_traffic',
      icon: Users,
      successRate: 65,
      avgImpact: 6000,
      color: '#F59E0B',
    },
  ],
};

// Default actions for industries without specific ones
const DEFAULT_ACTIONS = [
  {
    id: 'default_reduce_costs',
    title: { en: 'Reduce Operating Costs', fr: 'Réduire les coûts opérationnels' },
    description: { en: 'Identify and eliminate inefficiencies in operations', fr: 'Identifier et éliminer les inefficacités opérationnelles' },
    metric: 'operating_expenses' as DataMetric,
    icon: TrendingDown,
    successRate: 75,
    avgImpact: 5000,
    color: '#10B981',
  },
  {
    id: 'default_increase_revenue',
    title: { en: 'Increase Revenue', fr: 'Augmenter les revenus' },
    description: { en: 'Sales growth and new customer acquisition', fr: 'Croissance des ventes et acquisition de nouveaux clients' },
    metric: 'revenue' as DataMetric,
    icon: TrendingUp,
    successRate: 68,
    avgImpact: 10000,
    color: '#6366F1',
  },
  {
    id: 'default_improve_margins',
    title: { en: 'Improve Profit Margins', fr: 'Améliorer les marges bénéficiaires' },
    description: { en: 'Pricing optimization and cost management', fr: 'Optimisation des prix et gestion des coûts' },
    metric: 'net_margin' as DataMetric,
    icon: DollarSign,
    successRate: 70,
    avgImpact: 7500,
    color: '#F59E0B',
  },
];

// Quick prompt suggestions
const QUICK_PROMPTS = {
  en: [
    "How can I reduce my operating costs?",
    "What's the best way to improve my cash flow?",
    "Analyze my industry benchmarks",
    "Help me plan for the next quarter",
    "What hiring decisions should I make?",
    "How can I increase revenue?",
  ],
  fr: [
    "Comment puis-je réduire mes coûts opérationnels?",
    "Quelle est la meilleure façon d'améliorer ma trésorerie?",
    "Analyser mes indicateurs sectoriels",
    "Aidez-moi à planifier le prochain trimestre",
    "Quelles décisions d'embauche devrais-je prendre?",
    "Comment puis-je augmenter mes revenus?",
  ],
};

export default function StrategicPlanning() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { currentTenant } = useTenant();
  const { data: financialData, isLoading: dataLoading } = useFinancialData();
  const { hasQuickBooksConnection, hasRealData } = useHasRealData();
  const { hasAccess } = usePremiumFeature('strategicPlanning');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Get industry from tenant
  const industry = currentTenant?.industry as IndustryType || 'professional_services';
  const IndustryIcon = INDUSTRY_ICONS[industry] || Building2;
  const industryName = INDUSTRY_NAMES[industry]?.[language] || industry.replace('_', ' ');
  
  // Get industry-specific actions
  const industryActions = INDUSTRY_ACTIONS[industry] || DEFAULT_ACTIONS;
  
  // Financial context for AI
  const financialContext = useMemo(() => ({
    currentCash: financialData?.summary?.cashBalance || 0,
    monthlyRevenue: financialData?.metrics?.revenue || 0,
    monthlyExpenses: financialData?.metrics?.expenses || 0,
    industry,
    organizationName: currentTenant?.name || 'Your Business',
    initiatives: [],
  }), [financialData, industry, currentTenant]);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Handle sending a message
  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;
    
    setInputValue('');
    setIsLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await jamesAI.sendMessage(text, financialContext, {
        type: 'strategy',
      });
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: response.metadata,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: isEn 
          ? 'I apologize, but I encountered an error. Please try again.'
          : 'Je m\'excuse, mais j\'ai rencontré une erreur. Veuillez réessayer.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle action card click
  const handleActionClick = (action: typeof industryActions[0]) => {
    const prompt = isEn
      ? `Help me ${action.title.en.toLowerCase()}. ${action.description.en}`
      : `Aidez-moi à ${action.title.fr.toLowerCase()}. ${action.description.fr}`;
    handleSend(prompt);
  };
  
  // Handle quick prompt click
  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };
  
  // Handle key press in textarea
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleUpgradeClick = () => {
    window.open(CALENDLY_URL, '_blank');
  };

  // Show loading state while data is loading
  if (dataLoading && !financialData) {
    return (
      <ContentLoader 
        message="Chargement de l'assistant stratégique..."
        messageEn="Loading strategic assistant..."
      />
    );
  }

  // If user doesn't have access, show premium gate
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
        {/* Compact Header */}
        <div className="flex-shrink-0 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
              }}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap" style={{ color: 'rgb(var(--color-text))' }}>
                <span className="truncate">{isEn ? 'James AI' : 'James IA'}</span>
                <span 
                  className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full uppercase flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                    color: 'white',
                  }}
                >
                  <Crown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  PRO
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Your AI-powered strategic advisor' : 'Votre conseiller stratégique IA'}
              </p>
            </div>
          </div>
          
          <PremiumUpgradeBanner feature="strategicPlanning" />
        </div>
        
        {/* Premium Preview Content */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-auto">
          {/* Value Proposition */}
          <div 
            className="rounded-xl p-4 sm:p-6 relative overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ 
                background: 'linear-gradient(90deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-400)) 50%, rgb(var(--color-accent-500)) 100%)',
              }}
            />
            
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-accent-500)) 0%, rgb(var(--color-accent-600)) 100%)',
                }}
              >
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Industry-Specific Strategic Advice' : 'Conseils stratégiques sectoriels'}
                </h2>
                <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'James AI analyzes your financial data and provides recommendations based on 75,000+ Canadian businesses.'
                    : 'James AI analyse vos données et fournit des recommandations basées sur plus de 75 000 entreprises canadiennes.'}
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  {[
                    { en: 'Industry-specific actions', fr: 'Actions sectorielles' },
                    { en: 'Success rate insights', fr: 'Taux de succès' },
                    { en: 'Cash flow forecasting', fr: 'Prévision de trésorerie' },
                    { en: 'Strategic planning', fr: 'Planification stratégique' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] sm:text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      <span className="truncate">{isEn ? item.en : item.fr}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpgradeClick}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-white text-xs sm:text-sm transition-opacity duration-150 active:opacity-80"
                  style={{ 
                    background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  }}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {isEn ? 'Schedule Demo' : 'Planifier une démo'}
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Preview Action Cards */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2 px-1" style={{ color: 'rgb(var(--color-text))' }}>
              <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'Sample Industry Actions' : 'Exemples d\'actions sectorielles'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 opacity-60">
              {DEFAULT_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <div
                    key={action.id}
                    className="rounded-xl p-3 sm:p-4"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${action.color}15` }}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: action.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1 line-clamp-2" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? action.title.en : action.title.fr}
                        </h4>
                        <p className="text-[10px] sm:text-xs line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {isEn ? action.description.en : action.description.fr}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {/* Header with Industry Badge - Hidden on mobile */}
      <div 
        className="hidden sm:block flex-shrink-0 px-6 py-4 border-b"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 12px rgb(var(--color-primary-500) / 0.3)',
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'James AI' : 'James IA'}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <IndustryIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                <span className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {industryName}
                </span>
              </div>
            </div>
          </div>
          
          {/* Organization Badge */}
          {currentTenant && (
            <div 
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <IndustryIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <span className="text-xs font-medium truncate max-w-[150px]" style={{ color: 'rgb(var(--color-primary-700))' }}>
                {currentTenant.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          /* Empty State - Show Actions */
          <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            {/* Welcome Hero Section - Simplified for mobile */}
            <div className="max-w-3xl mx-auto mb-4 sm:mb-8 text-center">
              {/* Simple header on mobile, animated on desktop */}
              <div 
                className="w-12 h-12 sm:w-16 md:w-20 sm:h-16 md:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                }}
              >
                <MessageSquare className="w-6 h-6 sm:w-8 md:w-10 sm:h-8 md:h-10 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? `Hi, I'm James` : `Bonjour, je suis James`}
              </h2>
              <p className="text-xs sm:text-sm md:text-base mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? `Your AI strategic advisor`
                  : `Votre conseiller stratégique IA`}
              </p>
              {/* Hide badges on very small screens */}
              <div className="hidden xs:flex items-center justify-center gap-2 flex-wrap">
                <span 
                  className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full inline-flex items-center gap-1"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                    color: 'rgb(var(--color-primary-600))',
                  }}
                >
                  <IndustryIcon className="w-3 h-3" />
                  {industryName}
                </span>
              </div>
            </div>

            {/* Industry-Specific Actions */}
            <div className="max-w-4xl mx-auto mb-4 sm:mb-8">
              <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
                <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                  <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <span className="truncate">
                    {isEn ? `Recommended actions` : `Actions recommandées`}
                  </span>
                </h3>
              </div>
              {/* Simpler grid - no stagger animation on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {industryActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className="text-left rounded-lg sm:rounded-xl p-3 sm:p-4 focus:outline-none active:opacity-90 border"
                      style={{
                        backgroundColor: 'rgb(var(--color-surface))',
                        borderColor: 'rgb(var(--color-border))',
                      }}
                    >
                      <div className="flex items-start gap-2.5 sm:gap-3">
                        <div 
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${action.color}15` }}
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: action.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold mb-0.5 line-clamp-2" style={{ color: 'rgb(var(--color-text))' }}>
                            {isEn ? action.title.en : action.title.fr}
                          </h4>
                          {/* Hide description on very small screens */}
                          <p className="hidden xs:block text-[10px] sm:text-xs line-clamp-2 mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                            {isEn ? action.description.en : action.description.fr}
                          </p>
                          
                          {/* Simplified stats row */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                              {action.successRate}%
                            </span>
                            <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              +${(action.avgImpact / 1000).toFixed(0)}k/{isEn ? 'mo' : 'mois'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Prompts - Hide on very small screens */}
            <div className="hidden xs:block max-w-3xl mx-auto px-1">
              <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Or try asking...' : 'Ou essayez...'}
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {QUICK_PROMPTS[language as 'en' | 'fr'].slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium active:opacity-80"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                      color: 'rgb(var(--color-primary-700))',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Messages - Simplified for mobile */
          <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-2 sm:space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Simple message bubble without complex animations */}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                      message.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                    style={{
                      backgroundColor: message.role === 'user' 
                        ? 'rgb(var(--color-primary-500))' 
                        : 'rgb(var(--color-surface))',
                      color: message.role === 'user' 
                        ? 'white' 
                        : 'rgb(var(--color-text))',
                      border: message.role === 'assistant' ? '1px solid rgb(var(--color-border))' : 'none',
                    }}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                        <span className="text-[10px] sm:text-xs font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
                          James AI
                        </span>
                      </div>
                    )}
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Simple loading state */}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-xl sm:rounded-2xl rounded-bl-sm px-3 py-2 sm:px-4 sm:py-3"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      border: '1px solid rgb(var(--color-border))',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      <span className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'Thinking...' : 'Réflexion...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area - Compact on mobile */}
        <div 
          className="flex-shrink-0 p-2 sm:p-4 border-t safe-area-bottom"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="max-w-3xl mx-auto">
            <div 
              className="flex items-center gap-2 rounded-xl p-1.5 sm:p-2"
              style={{
                backgroundColor: 'rgb(var(--color-bg))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isEn ? 'Ask James...' : 'Demandez à James...'}
                className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-sm min-h-[36px] sm:min-h-[44px] max-h-[80px] sm:max-h-[120px] py-1.5 sm:py-2 px-2"
                style={{ color: 'rgb(var(--color-text))' }}
                rows={1}
              />
              
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center disabled:opacity-40 active:opacity-80"
                style={{
                  backgroundColor: inputValue.trim() && !isLoading 
                    ? 'rgb(var(--color-primary-500))'
                    : 'rgb(var(--color-border))',
                  color: 'white',
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
