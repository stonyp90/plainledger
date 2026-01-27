/**
 * Board Meeting Service
 * Manages virtual board meetings, agendas, presentations, and decision tracking
 */

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AgendaItemType = 'presentation' | 'discussion' | 'vote' | 'break' | 'action_review';
export type VoteType = 'approve' | 'reject' | 'abstain';
export type ParticipantRole = 'chair' | 'presenter' | 'board_member' | 'observer' | 'secretary';

// ============================================================================
// BOARD PANEL SYSTEM (Inspired by SigNoz Dashboard)
// ============================================================================

export type BoardPanelType = 
  | 'balance_sheet'
  | 'income_statement'
  | 'cash_flow'
  | 'anomaly_summary'
  | 'anomaly_list'
  | 'montage_financier'
  | 'kpi_metrics'
  | 'health_score'
  | 'runway_chart'
  | 'expense_breakdown'
  | 'revenue_trend'
  | 'ratio_analysis'
  | 'strategic_metrics'
  | 'cash_forecast'
  | 'variance_analysis'
  | 'action_items'
  | 'custom_chart'
  | 'text_block';

export type PanelSize = 'small' | 'medium' | 'large' | 'full';

export interface BoardPanel {
  id: string;
  type: BoardPanelType;
  title: string;
  titleEn: string;
  description?: string;
  descriptionEn?: string;
  size: PanelSize;
  order: number;
  config?: Record<string, any>;
  // For custom panels
  customContent?: string;
  chartConfig?: {
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
    dataSource: string;
    filters?: Record<string, any>;
  };
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPanelCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  panels: BoardPanelTemplate[];
}

export interface BoardPanelTemplate {
  type: BoardPanelType;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  defaultSize: PanelSize;
  category: string;
  previewImage?: string;
}

// Available panel templates organized by category
export const BOARD_PANEL_CATEGORIES: BoardPanelCategory[] = [
  {
    id: 'financial_statements',
    name: 'États financiers',
    nameEn: 'Financial Statements',
    icon: 'FileText',
    panels: [
      {
        type: 'balance_sheet',
        name: 'Bilan',
        nameEn: 'Balance Sheet',
        description: 'État de la situation financière avec comparatif',
        descriptionEn: 'Statement of financial position with comparison',
        icon: 'Scale',
        defaultSize: 'large',
        category: 'financial_statements',
      },
      {
        type: 'income_statement',
        name: 'État des résultats',
        nameEn: 'Income Statement',
        description: 'Revenus, dépenses et bénéfice net',
        descriptionEn: 'Revenue, expenses and net profit',
        icon: 'TrendingUp',
        defaultSize: 'large',
        category: 'financial_statements',
      },
      {
        type: 'cash_flow',
        name: 'Flux de trésorerie',
        nameEn: 'Cash Flow Statement',
        description: 'Mouvements de trésorerie par activité',
        descriptionEn: 'Cash movements by activity',
        icon: 'ArrowRightLeft',
        defaultSize: 'large',
        category: 'financial_statements',
      },
    ],
  },
  {
    id: 'analysis',
    name: 'Analyse',
    nameEn: 'Analysis',
    icon: 'BarChart3',
    panels: [
      {
        type: 'anomaly_summary',
        name: 'Résumé des anomalies',
        nameEn: 'Anomaly Summary',
        description: 'Score de santé et anomalies détectées',
        descriptionEn: 'Health score and detected anomalies',
        icon: 'AlertTriangle',
        defaultSize: 'medium',
        category: 'analysis',
      },
      {
        type: 'anomaly_list',
        name: 'Liste des anomalies',
        nameEn: 'Anomaly List',
        description: 'Détail des anomalies par sévérité',
        descriptionEn: 'Detailed anomalies by severity',
        icon: 'List',
        defaultSize: 'large',
        category: 'analysis',
      },
      {
        type: 'variance_analysis',
        name: 'Analyse des variances',
        nameEn: 'Variance Analysis',
        description: 'Écarts budget vs réel par compte',
        descriptionEn: 'Budget vs actual variance by account',
        icon: 'GitCompare',
        defaultSize: 'large',
        category: 'analysis',
      },
      {
        type: 'ratio_analysis',
        name: 'Analyse des ratios',
        nameEn: 'Ratio Analysis',
        description: 'Ratios financiers clés et tendances',
        descriptionEn: 'Key financial ratios and trends',
        icon: 'PieChart',
        defaultSize: 'medium',
        category: 'analysis',
      },
    ],
  },
  {
    id: 'strategic',
    name: 'Stratégique',
    nameEn: 'Strategic',
    icon: 'Target',
    panels: [
      {
        type: 'montage_financier',
        name: 'Montage financier',
        nameEn: 'Financial Setup',
        description: 'Sources et utilisations du financement',
        descriptionEn: 'Financing sources and uses',
        icon: 'Layers',
        defaultSize: 'large',
        category: 'strategic',
      },
      {
        type: 'strategic_metrics',
        name: 'Métriques Strategix',
        nameEn: 'Strategix Metrics',
        description: 'Trésorerie, burn rate et autonomie',
        descriptionEn: 'Cash position, burn rate and runway',
        icon: 'Gauge',
        defaultSize: 'medium',
        category: 'strategic',
      },
      {
        type: 'runway_chart',
        name: 'Graphique de runway',
        nameEn: 'Runway Chart',
        description: 'Projection de trésorerie dans le temps',
        descriptionEn: 'Cash projection over time',
        icon: 'LineChart',
        defaultSize: 'large',
        category: 'strategic',
      },
      {
        type: 'cash_forecast',
        name: 'Prévision de trésorerie',
        nameEn: 'Cash Forecast',
        description: 'Projection des flux de trésorerie',
        descriptionEn: 'Cash flow projection',
        icon: 'TrendingUp',
        defaultSize: 'large',
        category: 'strategic',
      },
    ],
  },
  {
    id: 'kpis',
    name: 'Indicateurs',
    nameEn: 'KPIs',
    icon: 'Activity',
    panels: [
      {
        type: 'kpi_metrics',
        name: 'KPIs financiers',
        nameEn: 'Financial KPIs',
        description: 'Indicateurs clés de performance',
        descriptionEn: 'Key performance indicators',
        icon: 'Target',
        defaultSize: 'medium',
        category: 'kpis',
      },
      {
        type: 'health_score',
        name: 'Score de santé',
        nameEn: 'Health Score',
        description: 'Score global de santé financière',
        descriptionEn: 'Overall financial health score',
        icon: 'Heart',
        defaultSize: 'small',
        category: 'kpis',
      },
      {
        type: 'revenue_trend',
        name: 'Tendance des revenus',
        nameEn: 'Revenue Trend',
        description: 'Évolution des revenus sur la période',
        descriptionEn: 'Revenue evolution over period',
        icon: 'TrendingUp',
        defaultSize: 'medium',
        category: 'kpis',
      },
      {
        type: 'expense_breakdown',
        name: 'Répartition des dépenses',
        nameEn: 'Expense Breakdown',
        description: 'Distribution des dépenses par catégorie',
        descriptionEn: 'Expense distribution by category',
        icon: 'PieChart',
        defaultSize: 'medium',
        category: 'kpis',
      },
    ],
  },
  {
    id: 'custom',
    name: 'Personnalisé',
    nameEn: 'Custom',
    icon: 'Sparkles',
    panels: [
      {
        type: 'action_items',
        name: 'Points d\'action',
        nameEn: 'Action Items',
        description: 'Liste des actions à suivre',
        descriptionEn: 'Action items to follow up',
        icon: 'CheckSquare',
        defaultSize: 'medium',
        category: 'custom',
      },
      {
        type: 'text_block',
        name: 'Bloc de texte',
        nameEn: 'Text Block',
        description: 'Notes et commentaires personnalisés',
        descriptionEn: 'Custom notes and comments',
        icon: 'Type',
        defaultSize: 'small',
        category: 'custom',
      },
      {
        type: 'custom_chart',
        name: 'Graphique personnalisé',
        nameEn: 'Custom Chart',
        description: 'Créer un graphique sur mesure',
        descriptionEn: 'Create a custom chart',
        icon: 'BarChart2',
        defaultSize: 'medium',
        category: 'custom',
      },
    ],
  },
];

// Helper to get all panel templates as flat array
export function getAllPanelTemplates(): BoardPanelTemplate[] {
  return BOARD_PANEL_CATEGORIES.flatMap(cat => cat.panels);
}

// Helper to get panel template by type
export function getPanelTemplate(type: BoardPanelType): BoardPanelTemplate | undefined {
  return getAllPanelTemplates().find(p => p.type === type);
}

// Create a new panel from template
export function createBoardPanel(type: BoardPanelType, order: number): BoardPanel {
  const template = getPanelTemplate(type);
  if (!template) {
    throw new Error(`Unknown panel type: ${type}`);
  }
  
  return {
    id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title: template.name,
    titleEn: template.nameEn,
    description: template.description,
    descriptionEn: template.descriptionEn,
    size: template.defaultSize,
    order,
    visible: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Board configuration for a meeting
export interface BoardConfig {
  id: string;
  name: string;
  nameEn: string;
  panels: BoardPanel[];
  layout: 'grid' | 'list' | 'presentation';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SLIDE ELEMENT SYSTEM (PowerPoint-style positioning)
// ============================================================================

export type SlideElementType = 
  | 'text'
  | 'title'
  | 'subtitle'
  | 'chart'
  | 'kpi'
  | 'table'
  | 'image'
  | 'icon'
  | 'shape'
  | 'metric'
  | 'alert'
  | 'trend';

export interface SlideElementPosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
}

export interface SlideElement {
  id: string;
  type: SlideElementType;
  position: SlideElementPosition;
  content: {
    text?: string;
    value?: string | number;
    label?: string;
    icon?: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    chartData?: any;
    imageUrl?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: string;
    fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    textAlign?: 'left' | 'center' | 'right';
  };
  style?: {
    backgroundColor?: string;
    borderRadius?: number;
    padding?: number;
    shadow?: boolean;
  };
  locked?: boolean;
  zIndex: number;
}

export interface SlideWithElements {
  id: string;
  title: string;
  elements: SlideElement[];
  backgroundColor?: string;
  backgroundImage?: string;
}

// Helper to create a new slide element
export function createSlideElement(
  type: SlideElementType, 
  position: Partial<SlideElementPosition> = {},
  content: Partial<SlideElement['content']> = {}
): SlideElement {
  const defaultPositions: Record<SlideElementType, SlideElementPosition> = {
    title: { x: 10, y: 5, width: 80, height: 12 },
    subtitle: { x: 10, y: 18, width: 80, height: 8 },
    text: { x: 10, y: 30, width: 40, height: 20 },
    chart: { x: 10, y: 30, width: 45, height: 50 },
    kpi: { x: 10, y: 30, width: 25, height: 20 },
    table: { x: 10, y: 30, width: 80, height: 50 },
    image: { x: 10, y: 30, width: 30, height: 30 },
    icon: { x: 45, y: 30, width: 10, height: 15 },
    shape: { x: 10, y: 30, width: 20, height: 20 },
    metric: { x: 10, y: 30, width: 20, height: 15 },
    alert: { x: 10, y: 80, width: 80, height: 10 },
    trend: { x: 10, y: 30, width: 25, height: 20 },
  };

  const defaultContent: Record<SlideElementType, Partial<SlideElement['content']>> = {
    title: { text: 'Title', fontSize: '3xl', fontWeight: 'bold', textAlign: 'center' },
    subtitle: { text: 'Subtitle', fontSize: 'xl', textAlign: 'center' },
    text: { text: 'Text content', fontSize: 'base', textAlign: 'left' },
    chart: { chartType: 'bar' },
    kpi: { label: 'KPI', value: '0', fontSize: '2xl', fontWeight: 'bold' },
    table: {},
    image: { imageUrl: '' },
    icon: { icon: 'BarChart3' },
    shape: { color: '#3b82f6' },
    metric: { label: 'Metric', value: '$0', trend: 'neutral' },
    alert: { text: 'Alert message', color: '#ef4444' },
    trend: { label: 'Trend', value: '0%', trend: 'up', trendValue: '+5%' },
  };

  return {
    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    position: { ...defaultPositions[type], ...position },
    content: { ...defaultContent[type], ...content },
    zIndex: Date.now(),
  };
}

// Default board configurations
export const DEFAULT_BOARD_CONFIGS: Omit<BoardConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Revue financière complète',
    nameEn: 'Full Financial Review',
    panels: [],
    layout: 'grid',
  },
  {
    name: 'Tableau de bord exécutif',
    nameEn: 'Executive Dashboard',
    panels: [],
    layout: 'grid',
  },
  {
    name: 'Revue des anomalies',
    nameEn: 'Anomaly Review',
    panels: [],
    layout: 'list',
  },
];

export interface Participant {
  id: string;
  name: string;
  email: string;
  role: ParticipantRole;
  avatar?: string;
  isPresent: boolean;
  joinedAt?: string;
}

export interface Vote {
  participantId: string;
  vote: VoteType;
  timestamp: string;
  comment?: string;
}

export interface VotingItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  votes: Vote[];
  status: 'pending' | 'open' | 'closed';
  result?: 'approved' | 'rejected' | 'no_quorum';
  requiredMajority: number; // percentage
}

export interface ActionItem {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  isPrivate: boolean;
  agendaItemId?: string;
}

export interface AgendaItem {
  id: string;
  order: number;
  type: AgendaItemType;
  title: string;
  titleEn: string;
  description?: string;
  descriptionEn?: string;
  duration: number; // minutes
  presenter?: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  notes: Note[];
  votingItems?: VotingItem[];
  actionItems?: ActionItem[];
  attachments?: string[];
}

export interface MeetingSlide {
  id: string;
  type: 'title' | 'executive_summary' | 'kpi' | 'chart' | 'table' | 'text' | 'action_items' | 'q_and_a' | 'vote' | 'custom';
  title: string;
  titleEn: string;
  content?: any;
  notes?: string;
  agendaItemId?: string;
}

export interface BoardMeeting {
  id: string;
  title: string;
  titleEn: string;
  description?: string;
  descriptionEn?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  type: 'regular' | 'special' | 'annual' | 'emergency';
  location?: string;
  virtualLink?: string;
  participants: Participant[];
  agenda: AgendaItem[];
  slides: MeetingSlide[];
  notes: Note[];
  actionItems: ActionItem[];
  decisions: string[];
  quorumRequired: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Meeting templates
export const MEETING_TEMPLATES = {
  quarterly_review: {
    title: 'Revue trimestrielle',
    titleEn: 'Quarterly Review',
    agenda: [
      { type: 'presentation', title: 'Appel à l\'ordre', titleEn: 'Call to Order', duration: 5 },
      { type: 'presentation', title: 'Revue du procès-verbal', titleEn: 'Minutes Review', duration: 10 },
      { type: 'presentation', title: 'Sommaire exécutif', titleEn: 'Executive Summary', duration: 15 },
      { type: 'presentation', title: 'Performance financière', titleEn: 'Financial Performance', duration: 30 },
      { type: 'presentation', title: 'Indicateurs clés', titleEn: 'Key Metrics', duration: 20 },
      { type: 'discussion', title: 'Risques et opportunités', titleEn: 'Risks & Opportunities', duration: 20 },
      { type: 'action_review', title: 'Suivi des actions', titleEn: 'Action Items Review', duration: 15 },
      { type: 'vote', title: 'Résolutions', titleEn: 'Resolutions', duration: 15 },
      { type: 'discussion', title: 'Questions et discussion', titleEn: 'Q&A Discussion', duration: 20 },
      { type: 'presentation', title: 'Prochaines étapes', titleEn: 'Next Steps', duration: 10 },
    ],
  },
  annual_meeting: {
    title: 'Assemblée annuelle',
    titleEn: 'Annual Meeting',
    agenda: [
      { type: 'presentation', title: 'Mot du président', titleEn: 'Chair\'s Address', duration: 15 },
      { type: 'presentation', title: 'Revue de l\'année', titleEn: 'Year in Review', duration: 30 },
      { type: 'presentation', title: 'États financiers', titleEn: 'Financial Statements', duration: 45 },
      { type: 'vote', title: 'Approbation des états financiers', titleEn: 'Financial Statements Approval', duration: 15 },
      { type: 'presentation', title: 'Stratégie et perspectives', titleEn: 'Strategy & Outlook', duration: 30 },
      { type: 'vote', title: 'Élection des administrateurs', titleEn: 'Board Elections', duration: 20 },
      { type: 'discussion', title: 'Questions des actionnaires', titleEn: 'Shareholder Questions', duration: 30 },
    ],
  },
  budget_review: {
    title: 'Revue budgétaire',
    titleEn: 'Budget Review',
    agenda: [
      { type: 'presentation', title: 'Contexte et objectifs', titleEn: 'Context & Objectives', duration: 10 },
      { type: 'presentation', title: 'Budget vs Réel', titleEn: 'Budget vs Actual', duration: 30 },
      { type: 'presentation', title: 'Analyse des variances', titleEn: 'Variance Analysis', duration: 25 },
      { type: 'discussion', title: 'Ajustements proposés', titleEn: 'Proposed Adjustments', duration: 20 },
      { type: 'vote', title: 'Approbation des ajustements', titleEn: 'Adjustments Approval', duration: 15 },
      { type: 'presentation', title: 'Prévisions mises à jour', titleEn: 'Updated Forecasts', duration: 20 },
    ],
  },
};

// Generate executive summary slides
export function generateExecutiveSummarySlides(
  financialData: any,
  isEn: boolean
): MeetingSlide[] {
  return [
    {
      id: 'slide-title',
      type: 'title',
      title: isEn ? 'Board Meeting' : 'Réunion du conseil',
      titleEn: 'Board Meeting',
      content: {
        subtitle: isEn ? 'Quarterly Financial Review' : 'Revue financière trimestrielle',
        date: new Date().toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        company: 'Demo Corporation',
      },
    },
    {
      id: 'slide-exec-summary',
      type: 'executive_summary',
      title: isEn ? 'Executive Summary' : 'Sommaire exécutif',
      titleEn: 'Executive Summary',
      content: {
        highlights: [
          { 
            label: isEn ? 'Revenue' : 'Revenus', 
            value: '$193,596', 
            change: '+0.1%', 
            trend: 'up' 
          },
          { 
            label: isEn ? 'Cash Position' : 'Trésorerie', 
            value: '$245,000', 
            change: '+23.7%', 
            trend: 'up' 
          },
          { 
            label: isEn ? 'Net Cash Flow' : 'Flux net', 
            value: '$47,000', 
            change: '+15%', 
            trend: 'up' 
          },
          { 
            label: isEn ? 'Working Capital' : 'Fonds de roulement', 
            value: '$372,000', 
            change: '+8%', 
            trend: 'up' 
          },
        ],
        summary: isEn 
          ? 'Strong quarter with revenue growth and improved cash position. Key initiatives on track.'
          : 'Trimestre solide avec croissance des revenus et amélioration de la trésorerie. Initiatives clés sur la bonne voie.',
      },
    },
    {
      id: 'slide-kpis',
      type: 'kpi',
      title: isEn ? 'Key Performance Indicators' : 'Indicateurs clés de performance',
      titleEn: 'Key Performance Indicators',
      content: {
        kpis: [
          { name: isEn ? 'Current Ratio' : 'Ratio de liquidité', value: '3.51x', target: '2.0x', status: 'good' },
          { name: isEn ? 'Quick Ratio' : 'Ratio de liquidité immédiate', value: '2.99x', target: '1.5x', status: 'good' },
          { name: isEn ? 'Gross Margin' : 'Marge brute', value: '42.5%', target: '40%', status: 'good' },
          { name: 'DSO', value: '38d', target: '45d', status: 'good' },
          { name: isEn ? 'Debt/Equity' : 'Dette/Capitaux', value: '0.45x', target: '0.5x', status: 'good' },
          { name: isEn ? 'Operating Margin' : 'Marge opérationnelle', value: '18.2%', target: '15%', status: 'good' },
        ],
      },
    },
    {
      id: 'slide-revenue',
      type: 'chart',
      title: isEn ? 'Revenue Trend' : 'Évolution des revenus',
      titleEn: 'Revenue Trend',
      content: {
        chartType: 'line',
        data: [
          { month: 'Jan', value: 142500 },
          { month: 'Feb', value: 138200 },
          { month: 'Mar', value: 155800 },
          { month: 'Apr', value: 148900 },
          { month: 'May', value: 162300 },
          { month: 'Jun', value: 171200 },
          { month: 'Jul', value: 165400 },
          { month: 'Aug', value: 178600 },
          { month: 'Sep', value: 185200 },
          { month: 'Oct', value: 192800 },
          { month: 'Nov', value: 198500 },
          { month: 'Dec', value: 193596 },
        ],
        insights: [
          isEn ? 'Q4 revenue up 12% vs Q3' : 'Revenus Q4 en hausse de 12% vs Q3',
          isEn ? 'Strong holiday season performance' : 'Excellente performance des fêtes',
        ],
      },
    },
    {
      id: 'slide-expenses',
      type: 'chart',
      title: isEn ? 'Expense Breakdown' : 'Répartition des dépenses',
      titleEn: 'Expense Breakdown',
      content: {
        chartType: 'pie',
        data: [
          { category: isEn ? 'Payroll' : 'Salaires', value: 45, color: '#3B82F6' },
          { category: isEn ? 'Operations' : 'Opérations', value: 25, color: '#10B981' },
          { category: isEn ? 'Marketing' : 'Marketing', value: 15, color: '#F59E0B' },
          { category: isEn ? 'R&D' : 'R&D', value: 10, color: '#8B5CF6' },
          { category: isEn ? 'Other' : 'Autres', value: 5, color: '#6B7280' },
        ],
      },
    },
    {
      id: 'slide-balance',
      type: 'table',
      title: isEn ? 'Balance Sheet Summary' : 'Sommaire du bilan',
      titleEn: 'Balance Sheet Summary',
      content: {
        headers: [isEn ? 'Category' : 'Catégorie', '2026', '2025', isEn ? 'Change' : 'Variation'],
        rows: [
          [isEn ? 'Total Assets' : 'Total actifs', '$598,000', '$512,000', '+16.8%'],
          [isEn ? 'Total Liabilities' : 'Total passifs', '$183,000', '$168,000', '+8.9%'],
          [isEn ? 'Shareholders\' Equity' : 'Capitaux propres', '$415,000', '$344,000', '+20.6%'],
          [isEn ? 'Working Capital' : 'Fonds de roulement', '$372,000', '$312,000', '+19.2%'],
        ],
      },
    },
    {
      id: 'slide-anomalies',
      type: 'custom',
      title: isEn ? 'Financial Health & Anomalies' : 'Santé financière et anomalies',
      titleEn: 'Financial Health & Anomalies',
      content: {
        healthScore: 72,
        anomalies: {
          critical: 3,
          warning: 7,
          info: 10,
        },
        topIssues: [
          isEn ? 'Accounts receivable aging increasing' : 'Vieillissement des comptes clients en hausse',
          isEn ? 'Inventory turnover below target' : 'Rotation des stocks sous la cible',
          isEn ? 'Operating expense variance +8%' : 'Variance des charges d\'exploitation +8%',
        ],
      },
    },
    {
      id: 'slide-actions',
      type: 'action_items',
      title: isEn ? 'Action Items' : 'Points d\'action',
      titleEn: 'Action Items',
      content: {
        items: [
          { 
            task: isEn ? 'Review AR aging report' : 'Revoir le rapport de vieillissement des CR',
            owner: 'CFO',
            due: '2026-02-15',
            priority: 'high',
          },
          { 
            task: isEn ? 'Optimize inventory levels' : 'Optimiser les niveaux de stocks',
            owner: 'Operations',
            due: '2026-02-28',
            priority: 'medium',
          },
          { 
            task: isEn ? 'Cost reduction initiatives' : 'Initiatives de réduction des coûts',
            owner: 'Finance',
            due: '2026-03-15',
            priority: 'medium',
          },
        ],
      },
    },
    {
      id: 'slide-outlook',
      type: 'text',
      title: isEn ? 'Outlook & Next Steps' : 'Perspectives et prochaines étapes',
      titleEn: 'Outlook & Next Steps',
      content: {
        sections: [
          {
            heading: isEn ? 'Q1 2026 Priorities' : 'Priorités Q1 2026',
            points: [
              isEn ? 'Launch new product line' : 'Lancement nouvelle gamme de produits',
              isEn ? 'Expand Canadian market presence' : 'Expansion présence marché canadien',
              isEn ? 'Implement cost optimization program' : 'Implanter programme d\'optimisation des coûts',
            ],
          },
          {
            heading: isEn ? 'Key Dates' : 'Dates clés',
            points: [
              isEn ? 'Feb 28: Q4 filing deadline' : '28 fév: Date limite déclaration Q4',
              isEn ? 'Mar 15: Annual audit completion' : '15 mars: Fin de l\'audit annuel',
              isEn ? 'Apr 1: New fiscal year' : '1er avril: Nouvel exercice fiscal',
            ],
          },
        ],
      },
    },
    {
      id: 'slide-qa',
      type: 'q_and_a',
      title: isEn ? 'Questions & Discussion' : 'Questions et discussion',
      titleEn: 'Questions & Discussion',
      content: {
        moderator: 'Board Chair',
        timeAllotted: 20,
      },
    },
  ];
}

// Meeting service
class BoardMeetingService {
  private storageKey = 'plainledger-board-meetings';

  getMeetings(): BoardMeeting[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  getMeeting(id: string): BoardMeeting | null {
    const meetings = this.getMeetings();
    return meetings.find(m => m.id === id) || null;
  }

  saveMeeting(meeting: BoardMeeting): void {
    const meetings = this.getMeetings();
    const index = meetings.findIndex(m => m.id === meeting.id);
    if (index >= 0) {
      meetings[index] = { ...meeting, updatedAt: new Date().toISOString() };
    } else {
      meetings.push(meeting);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(meetings));
  }

  deleteMeeting(id: string): void {
    const meetings = this.getMeetings().filter(m => m.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(meetings));
  }

  createMeeting(template: keyof typeof MEETING_TEMPLATES, date: string, participants: Participant[]): BoardMeeting {
    const templateData = MEETING_TEMPLATES[template];
    const id = `meeting-${Date.now()}`;
    
    const agenda: AgendaItem[] = templateData.agenda.map((item, index) => ({
      id: `agenda-${index}`,
      order: index + 1,
      type: item.type as AgendaItemType,
      title: item.title,
      titleEn: item.titleEn,
      duration: item.duration,
      status: 'pending',
      notes: [],
    }));

    const meeting: BoardMeeting = {
      id,
      title: templateData.title,
      titleEn: templateData.titleEn,
      date,
      startTime: '09:00',
      endTime: '12:00',
      status: 'scheduled',
      type: template === 'annual_meeting' ? 'annual' : 'regular',
      participants,
      agenda,
      slides: [],
      notes: [],
      actionItems: [],
      decisions: [],
      quorumRequired: 51,
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveMeeting(meeting);
    return meeting;
  }

  startMeeting(id: string): BoardMeeting | null {
    const meeting = this.getMeeting(id);
    if (meeting) {
      meeting.status = 'in_progress';
      if (meeting.agenda.length > 0) {
        meeting.agenda[0].status = 'current';
        meeting.agenda[0].startedAt = new Date().toISOString();
      }
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  endMeeting(id: string): BoardMeeting | null {
    const meeting = this.getMeeting(id);
    if (meeting) {
      meeting.status = 'completed';
      meeting.agenda.forEach(item => {
        if (item.status === 'current') {
          item.status = 'completed';
          item.completedAt = new Date().toISOString();
        }
      });
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  nextAgendaItem(id: string): BoardMeeting | null {
    const meeting = this.getMeeting(id);
    if (meeting) {
      const currentIndex = meeting.agenda.findIndex(a => a.status === 'current');
      if (currentIndex >= 0) {
        meeting.agenda[currentIndex].status = 'completed';
        meeting.agenda[currentIndex].completedAt = new Date().toISOString();
      }
      const nextIndex = currentIndex + 1;
      if (nextIndex < meeting.agenda.length) {
        meeting.agenda[nextIndex].status = 'current';
        meeting.agenda[nextIndex].startedAt = new Date().toISOString();
      }
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  addNote(meetingId: string, note: Omit<Note, 'id' | 'timestamp'>): BoardMeeting | null {
    const meeting = this.getMeeting(meetingId);
    if (meeting) {
      const newNote: Note = {
        ...note,
        id: `note-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      meeting.notes.push(newNote);
      if (note.agendaItemId) {
        const agendaItem = meeting.agenda.find(a => a.id === note.agendaItemId);
        if (agendaItem) {
          agendaItem.notes.push(newNote);
        }
      }
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  recordVote(meetingId: string, agendaItemId: string, votingItemId: string, vote: Omit<Vote, 'timestamp'>): BoardMeeting | null {
    const meeting = this.getMeeting(meetingId);
    if (meeting) {
      const agendaItem = meeting.agenda.find(a => a.id === agendaItemId);
      if (agendaItem?.votingItems) {
        const votingItem = agendaItem.votingItems.find(v => v.id === votingItemId);
        if (votingItem) {
          const existingVoteIndex = votingItem.votes.findIndex(v => v.participantId === vote.participantId);
          const newVote: Vote = { ...vote, timestamp: new Date().toISOString() };
          if (existingVoteIndex >= 0) {
            votingItem.votes[existingVoteIndex] = newVote;
          } else {
            votingItem.votes.push(newVote);
          }
        }
      }
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  addActionItem(meetingId: string, actionItem: Omit<ActionItem, 'id' | 'createdAt' | 'status'>): BoardMeeting | null {
    const meeting = this.getMeeting(meetingId);
    if (meeting) {
      const newActionItem: ActionItem = {
        ...actionItem,
        id: `action-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      meeting.actionItems.push(newActionItem);
      this.saveMeeting(meeting);
    }
    return meeting;
  }

  generateMinutes(meetingId: string, isEn: boolean): string {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return '';

    const title = isEn ? meeting.titleEn : meeting.title;
    const date = new Date(meeting.date).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let minutes = `# ${title}\n\n`;
    minutes += `**${isEn ? 'Date' : 'Date'}:** ${date}\n`;
    minutes += `**${isEn ? 'Time' : 'Heure'}:** ${meeting.startTime} - ${meeting.endTime}\n\n`;

    // Participants
    minutes += `## ${isEn ? 'Attendees' : 'Participants'}\n\n`;
    meeting.participants.filter(p => p.isPresent).forEach(p => {
      minutes += `- ${p.name} (${p.role})\n`;
    });
    minutes += '\n';

    // Agenda items
    minutes += `## ${isEn ? 'Agenda' : 'Ordre du jour'}\n\n`;
    meeting.agenda.forEach((item, index) => {
      const itemTitle = isEn ? item.titleEn : item.title;
      minutes += `### ${index + 1}. ${itemTitle}\n\n`;
      if (item.notes.length > 0) {
        item.notes.forEach(note => {
          minutes += `- ${note.content}\n`;
        });
        minutes += '\n';
      }
    });

    // Decisions
    if (meeting.decisions.length > 0) {
      minutes += `## ${isEn ? 'Decisions' : 'Décisions'}\n\n`;
      meeting.decisions.forEach((decision, index) => {
        minutes += `${index + 1}. ${decision}\n`;
      });
      minutes += '\n';
    }

    // Action Items
    if (meeting.actionItems.length > 0) {
      minutes += `## ${isEn ? 'Action Items' : 'Points d\'action'}\n\n`;
      minutes += `| ${isEn ? 'Task' : 'Tâche'} | ${isEn ? 'Assignee' : 'Responsable'} | ${isEn ? 'Due Date' : 'Échéance'} |\n`;
      minutes += '|------|----------|----------|\n';
      meeting.actionItems.forEach(item => {
        const itemTitle = isEn ? item.titleEn : item.title;
        minutes += `| ${itemTitle} | ${item.assignee} | ${item.dueDate} |\n`;
      });
    }

    return minutes;
  }
}

export const boardMeetingService = new BoardMeetingService();
