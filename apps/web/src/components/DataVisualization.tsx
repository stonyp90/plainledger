/**
 * PlainLedger Data Visualization System
 * 
 * Multi-format data visualization with:
 * - Multiple chart types (line, bar, pie, etc.)
 * - Pinning/favorites functionality
 * - Chart type selector
 * - Export capabilities
 */

import { useState, useMemo } from 'react';
import {
  Pin,
  PinOff,
  Download,
  Maximize2,
  Minimize2,
  Settings2,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronDown,
  Check,
  Grid3X3,
  Table,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Target,
  Share2,
  Link,
  Mail,
  Users,
  Eye,
  EyeOff,
  Bookmark,
  BookmarkCheck,
  Layers,
  X,
  CheckCircle,
  Clock,
  AreaChart,
  Radar,
  Gauge,
  Flame,
  Waves,
  CircleDot,
  LayoutGrid,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { InfoTooltip } from './Tooltip';
import {
  chartFavoritesService,
  ChartConfig,
  ChartType,
  CHART_TYPE_INFO,
  METRIC_INFO,
  TIME_RANGE_INFO,
  TimeRange,
  DataMetric,
  PRESET_CHARTS,
} from '../lib/chartFavorites';

// =====================================================
// CHART TYPE ICONS
// =====================================================

export const ChartTypeIcon: Record<ChartType, LucideIcon> = {
  line: LineChart,
  bar: BarChart3,
  area: AreaChart,
  pie: PieChart,
  donut: CircleDot,
  scatter: Activity,
  radar: Radar,
  treemap: LayoutGrid,
  heatmap: Flame,
  waterfall: Waves,
  gauge: Gauge,
  sparkline: Sparkles,
  table: Table,
};

// =====================================================
// CHART TYPE SELECTOR
// =====================================================

interface ChartTypeSelectorProps {
  selected: ChartType;
  onChange: (type: ChartType) => void;
  availableTypes?: ChartType[];
  isEn: boolean;
}

export function ChartTypeSelector({ 
  selected, 
  onChange, 
  availableTypes,
  isEn 
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const types = availableTypes || (Object.keys(CHART_TYPE_INFO) as ChartType[]);
  const selectedInfo = CHART_TYPE_INFO[selected];
  const Icon = ChartTypeIcon[selected];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-colors hover:border-primary-500"
        style={{
          backgroundColor: 'rgb(var(--color-bg))',
          borderColor: 'rgb(var(--color-border))',
          color: 'rgb(var(--color-text))',
        }}
      >
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-xs sm:text-sm font-medium hidden sm:inline">
          {isEn ? selectedInfo.labelEn : selectedInfo.label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden"
            style={{
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <div className="p-2 max-h-80 overflow-y-auto">
              {types.map((type) => {
                const info = CHART_TYPE_INFO[type];
                const TypeIcon = ChartTypeIcon[type];
                const isSelected = type === selected;
                
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onChange(type);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: isSelected 
                        ? 'rgb(var(--color-primary-500) / 0.1)' 
                        : 'transparent',
                    }}
                  >
                    <div 
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{
                        backgroundColor: isSelected 
                          ? 'rgb(var(--color-primary-500) / 0.2)'
                          : 'rgb(var(--color-bg-muted))',
                      }}
                    >
                      <TypeIcon 
                        className="w-4 h-4" 
                        style={{ 
                          color: isSelected 
                            ? 'rgb(var(--color-primary-500))'
                            : 'rgb(var(--color-text-muted))',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium text-sm"
                          style={{ color: 'rgb(var(--color-text))' }}
                        >
                          {info.icon} {isEn ? info.labelEn : info.label}
                        </span>
                        {isSelected && (
                          <Check 
                            className="w-4 h-4" 
                            style={{ color: 'rgb(var(--color-primary-500))' }}
                          />
                        )}
                      </div>
                      <p 
                        className="text-xs mt-0.5"
                        style={{ color: 'rgb(var(--color-text-muted))' }}
                      >
                        {isEn ? info.descriptionEn : info.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// TIME RANGE SELECTOR
// =====================================================

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  isEn: boolean;
}

export function TimeRangeSelector({ selected, onChange, isEn }: TimeRangeSelectorProps) {
  const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', 'YTD', '1Y', '2Y', 'ALL'];
  
  return (
    <div 
      className="flex rounded-lg border overflow-x-auto scrollbar-hide max-w-[180px] sm:max-w-none"
      style={{ borderColor: 'rgb(var(--color-border))' }}
    >
      {ranges.map((range) => {
        const isSelected = range === selected;
        
        return (
          <button
            key={range}
            onClick={() => onChange(range)}
            className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-colors border-r last:border-r-0 flex-shrink-0"
            style={{
              backgroundColor: isSelected 
                ? 'rgb(var(--color-primary-500))'
                : 'rgb(var(--color-bg))',
              color: isSelected 
                ? 'white'
                : 'rgb(var(--color-text-secondary))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}

// =====================================================
// SHARE MODAL
// =====================================================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartName: string;
  chartNameEn: string;
  isEn: boolean;
}

function ShareModal({ isOpen, onClose, chartName, chartNameEn, isEn }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'email' | 'embed'>('link');
  const [copied, setCopied] = useState(false);
  const [shareLink] = useState(`https://app.plainledger.ca/shared/chart/${Date.now()}`);
  const [emailInput, setEmailInput] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [expiresIn, setExpiresIn] = useState<'never' | '7d' | '30d' | '90d'>('never');
  const [sharedWith, setSharedWith] = useState<Array<{ email: string; permission: string; date: string }>>([]);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleShareEmail = () => {
    if (emailInput && emailInput.includes('@')) {
      setSharedWith([...sharedWith, { 
        email: emailInput, 
        permission, 
        date: new Date().toLocaleDateString() 
      }]);
      setEmailInput('');
    }
  };
  
  const handleRemoveShare = (email: string) => {
    setSharedWith(sharedWith.filter(s => s.email !== email));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Share2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Share Chart' : 'Partager le graphique'}
              </h3>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? chartNameEn : chartName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tabs */}
        <div 
          className="flex border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          {[
            { id: 'link', label: isEn ? 'Link' : 'Lien', icon: Link },
            { id: 'email', label: isEn ? 'Email' : 'Courriel', icon: Mail },
            { id: 'embed', label: isEn ? 'Embed' : 'Intégrer', icon: ExternalLink },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? '2px solid rgb(var(--color-primary-500))' : '2px solid transparent',
                color: activeTab === tab.id ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Link Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Share Link' : 'Lien de partage'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                      color: 'white',
                    }}
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy' : 'Copier')}
                  </button>
                </div>
              </div>
              
              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Link expires' : 'Expiration du lien'}
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'never', label: isEn ? 'Never' : 'Jamais' },
                    { id: '7d', label: '7 jours' },
                    { id: '30d', label: '30 jours' },
                    { id: '90d', label: '90 jours' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setExpiresIn(opt.id as typeof expiresIn)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: expiresIn === opt.id 
                          ? 'rgb(var(--color-primary-500))' 
                          : 'rgb(var(--color-bg-muted))',
                        color: expiresIn === opt.id ? 'white' : 'rgb(var(--color-text))',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Permission */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Anyone with the link can' : 'Quiconque avec le lien peut'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPermission('view')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: permission === 'view' 
                        ? 'rgb(var(--color-primary-500))' 
                        : 'rgb(var(--color-bg-muted))',
                      color: permission === 'view' ? 'white' : 'rgb(var(--color-text))',
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    {isEn ? 'View only' : 'Voir seulement'}
                  </button>
                  <button
                    onClick={() => setPermission('edit')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: permission === 'edit' 
                        ? 'rgb(var(--color-primary-500))' 
                        : 'rgb(var(--color-bg-muted))',
                      color: permission === 'edit' ? 'white' : 'rgb(var(--color-text))',
                    }}
                  >
                    <Settings2 className="w-4 h-4" />
                    {isEn ? 'Can edit' : 'Peut modifier'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Invite by email' : 'Inviter par courriel'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={isEn ? 'email@example.com' : 'courriel@exemple.com'}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleShareEmail()}
                  />
                  <button
                    onClick={handleShareEmail}
                    disabled={!emailInput || !emailInput.includes('@')}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500))',
                      color: 'white',
                    }}
                  >
                    {isEn ? 'Invite' : 'Inviter'}
                  </button>
                </div>
              </div>
              
              {/* Permission for email */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPermission('view')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    permission === 'view' ? 'bg-primary-500 text-white' : 'bg-muted'
                  }`}
                  style={permission !== 'view' ? {
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text))',
                  } : { backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
                >
                  <Eye className="w-4 h-4" />
                  {isEn ? 'Viewer' : 'Lecteur'}
                </button>
                <button
                  onClick={() => setPermission('edit')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={permission !== 'edit' ? {
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    color: 'rgb(var(--color-text))',
                  } : { backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
                >
                  <Settings2 className="w-4 h-4" />
                  {isEn ? 'Editor' : 'Éditeur'}
                </button>
              </div>
              
              {/* Shared With List */}
              {sharedWith.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Shared with' : 'Partagé avec'}
                  </label>
                  <div 
                    className="rounded-lg border divide-y"
                    style={{ 
                      borderColor: 'rgb(var(--color-border))',
                      divideColor: 'rgb(var(--color-border))',
                    }}
                  >
                    {sharedWith.map((share) => (
                      <div 
                        key={share.email}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                              color: 'rgb(var(--color-primary-500))',
                            }}
                          >
                            {share.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                              {share.email}
                            </p>
                            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                              {share.permission === 'view' ? (isEn ? 'Viewer' : 'Lecteur') : (isEn ? 'Editor' : 'Éditeur')} • {share.date}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveShare(share.email)}
                          className="p-1.5 rounded hover:bg-error/10 transition-colors"
                          style={{ color: 'rgb(var(--color-error))' }}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Embed Code' : 'Code d\'intégration'}
                </label>
                <textarea
                  readOnly
                  value={`<iframe src="${shareLink}/embed" width="100%" height="400" frameborder="0"></iframe>`}
                  className="w-full px-3 py-2 rounded-lg border text-sm font-mono h-24 resize-none"
                  style={{
                    backgroundColor: 'rgb(var(--color-bg-muted))',
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text))',
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`<iframe src="${shareLink}/embed" width="100%" height="400" frameborder="0"></iframe>`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all"
                  style={{
                    backgroundColor: copied ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? (isEn ? 'Copied!' : 'Copié!') : (isEn ? 'Copy Code' : 'Copier le code')}
                </button>
              </div>
              
              <div 
                className="p-3 rounded-lg text-sm flex items-start gap-2"
                style={{ 
                  backgroundColor: 'rgb(var(--color-info) / 0.1)',
                  color: 'rgb(var(--color-info))',
                }}
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  {isEn 
                    ? 'The embedded chart will update automatically when data changes.'
                    : 'Le graphique intégré se mettra à jour automatiquement lors des changements de données.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// DATA VISUALIZATION CARD
// =====================================================

interface DataVisualizationCardProps {
  config: ChartConfig;
  data?: any[];
  onConfigChange?: (config: ChartConfig) => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isPinned?: boolean;
  showControls?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  onShare?: () => void;
  onAddToView?: (viewName: string) => void;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

export function DataVisualizationCard({
  config,
  data,
  onConfigChange,
  onPin,
  onUnpin,
  isPinned = false,
  showControls = true,
  size = 'medium',
  isBookmarked = false,
  onBookmark,
}: DataVisualizationCardProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);
  
  const chartInfo = CHART_TYPE_INFO[config.chartType];
  const Icon = ChartTypeIcon[config.chartType];
  
  // Mock views for demo
  const savedViews = [
    { id: '1', name: isEn ? 'Executive View' : 'Vue exécutive' },
    { id: '2', name: isEn ? 'Monthly Review' : 'Revue mensuelle' },
    { id: '3', name: isEn ? 'Team Dashboard' : 'Tableau équipe' },
  ];
  
  const sizeClasses = {
    small: 'h-48',
    medium: 'h-72',
    large: 'h-96',
    full: 'h-[500px]',
  };
  
  const handleChartTypeChange = (type: ChartType) => {
    if (onConfigChange) {
      onConfigChange({ ...config, chartType: type });
    }
  };
  
  const handleTimeRangeChange = (range: TimeRange) => {
    if (onConfigChange) {
      onConfigChange({ ...config, timeRange: range });
    }
  };
  
  const handleExport = (format: 'png' | 'csv' | 'pdf') => {
    // Export functionality would be implemented here
    console.log(`Exporting ${config.name} as ${format}`);
    setShowOptions(false);
  };
  
  const handleBookmark = () => {
    setLocalBookmarked(!localBookmarked);
    onBookmark?.();
  };
  
  const handleAddToView = (viewId: string) => {
    console.log(`Adding chart to view: ${viewId}`);
    setShowViewMenu(false);
    setShowOptions(false);
  };
  
  // Generate mock visualization based on chart type
  const renderChart = () => {
    const mockData = data || generateMockData(config);
    
    switch (config.chartType) {
      case 'gauge':
        return <GaugeChart data={mockData} config={config} isEn={isEn} />;
      case 'donut':
      case 'pie':
        return <PieDonutChart data={mockData} config={config} isEn={isEn} />;
      case 'radar':
        return <RadarChart data={mockData} config={config} isEn={isEn} />;
      case 'table':
        return <TableView data={mockData} config={config} isEn={isEn} />;
      case 'heatmap':
        return <HeatmapChart data={mockData} config={config} isEn={isEn} />;
      case 'waterfall':
        return <WaterfallChart data={mockData} config={config} isEn={isEn} />;
      default:
        return <LineBarAreaChart data={mockData} config={config} isEn={isEn} />;
    }
  };
  
  return (
    <div 
      className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50' : 'hover:shadow-xl hover:-translate-y-1'
      }`}
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
        boxShadow: isExpanded 
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Hover Gradient Accent */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, rgb(var(--color-primary-500)), rgb(var(--color-primary-400)))',
        }}
      />
      
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b gap-3"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            className="p-2 sm:p-2.5 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
              boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.15)',
            }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
          </div>
          <div className="min-w-0">
            <h3 
              className="font-bold text-sm sm:text-base truncate"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? config.nameEn : config.name}
            </h3>
            {config.description && (
              <p 
                className="text-[10px] sm:text-xs truncate hidden sm:block"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn ? config.descriptionEn : config.description}
              </p>
            )}
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
            {/* Chart Type Selector */}
            <ChartTypeSelector
              selected={config.chartType}
              onChange={handleChartTypeChange}
              isEn={isEn}
            />
            
            {/* Time Range */}
            <TimeRangeSelector
              selected={config.timeRange}
              onChange={handleTimeRangeChange}
              isEn={isEn}
            />
            
            {/* Pin Button */}
            <button
              onClick={isPinned ? onUnpin : onPin}
              className="p-1.5 sm:p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isPinned 
                  ? 'rgb(var(--color-warning) / 0.1)'
                  : 'rgb(var(--color-bg-muted))',
                color: isPinned 
                  ? 'rgb(var(--color-warning))'
                  : 'rgb(var(--color-text-muted))',
              }}
              title={isPinned 
                ? (isEn ? 'Unpin from dashboard' : 'Détacher du tableau de bord')
                : (isEn ? 'Pin to dashboard' : 'Épingler au tableau de bord')
              }
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
            
            {/* Expand Button - hidden on mobile */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 sm:p-2 rounded-lg transition-colors hidden sm:flex"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))',
              }}
              title={isExpanded 
                ? (isEn ? 'Minimize' : 'Réduire')
                : (isEn ? 'Expand' : 'Agrandir')
              }
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            {/* Options Menu */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-1.5 sm:p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-muted))',
                }}
              >
                <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              
              {showOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setShowOptions(false);
                      setShowViewMenu(false);
                    }}
                  />
                  <div 
                    className="absolute top-full right-0 mt-2 w-56 rounded-xl border shadow-xl z-50 overflow-hidden py-1"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                  >
                    {/* Share */}
                    <button
                      onClick={() => {
                        setShowShareModal(true);
                        setShowOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Share2 className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                      {isEn ? 'Share' : 'Partager'}
                    </button>
                    
                    {/* Bookmark */}
                    <button
                      onClick={handleBookmark}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {localBookmarked ? (
                        <BookmarkCheck className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                      {localBookmarked 
                        ? (isEn ? 'Bookmarked' : 'Enregistré')
                        : (isEn ? 'Bookmark' : 'Enregistrer')}
                    </button>
                    
                    {/* Add to View */}
                    <div className="relative">
                      <button
                        onClick={() => setShowViewMenu(!showViewMenu)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                        style={{ color: 'rgb(var(--color-text))' }}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          {isEn ? 'Add to View' : 'Ajouter à une vue'}
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showViewMenu ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showViewMenu && (
                        <div 
                          className="border-t py-1"
                          style={{ 
                            backgroundColor: 'rgb(var(--color-bg-muted))',
                            borderColor: 'rgb(var(--color-border))',
                          }}
                        >
                          {savedViews.map((view) => (
                            <button
                              key={view.id}
                              onClick={() => handleAddToView(view.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                              style={{ color: 'rgb(var(--color-text))' }}
                            >
                              <Eye className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                              {view.name}
                            </button>
                          ))}
                          <div 
                            className="border-t mt-1 pt-1"
                            style={{ borderColor: 'rgb(var(--color-border))' }}
                          >
                            <button
                              onClick={() => {
                                // Create new view
                                setShowViewMenu(false);
                                setShowOptions(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                              style={{ color: 'rgb(var(--color-primary-500))' }}
                            >
                              <Layers className="w-3 h-3" />
                              {isEn ? 'Create New View' : 'Créer une nouvelle vue'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className="my-1 border-t"
                      style={{ borderColor: 'rgb(var(--color-border))' }}
                    />
                    
                    {/* Export Options */}
                    <button
                      onClick={() => handleExport('png')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? 'Export as PNG' : 'Exporter en PNG'}
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? 'Export as CSV' : 'Exporter en CSV'}
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? 'Export as PDF' : 'Exporter en PDF'}
                    </button>
                    
                    <div 
                      className="my-1 border-t"
                      style={{ borderColor: 'rgb(var(--color-border))' }}
                    />
                    
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Copy className="w-4 h-4" />
                      {isEn ? 'Duplicate' : 'Dupliquer'}
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Settings2 className="w-4 h-4" />
                      {isEn ? 'Configure' : 'Configurer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Chart Area */}
      <div className={`p-4 ${isExpanded ? 'flex-1' : sizeClasses[size]}`}>
        {renderChart()}
      </div>
      
      {/* Expanded Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        chartName={config.name}
        chartNameEn={config.nameEn}
        isEn={isEn}
      />
    </div>
  );
}

// =====================================================
// CHART COMPONENTS
// =====================================================

// Simple Line/Bar/Area Chart with Hover Tooltips
function LineBarAreaChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const metricInfo = METRIC_INFO[config.metrics[0]];
  
  const formatValue = (value: number) => {
    if (metricInfo.unit === 'currency') {
      return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (metricInfo.unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };
  
  // Calculate trend
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const trend = lastValue - firstValue;
  const trendPercent = firstValue !== 0 ? ((trend / firstValue) * 100) : 0;
  
  const getPointPosition = (index: number) => {
    const x = (index / (data.length - 1)) * 400;
    const y = 200 - ((data[index].value - minValue) / range) * 180;
    return { x, y };
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p 
            className="text-2xl font-bold"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {formatValue(hoveredIndex !== null ? data[hoveredIndex].value : lastValue)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-error" />
            )}
            <span 
              className="text-sm font-medium"
              style={{ color: trend >= 0 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
            >
              {trend >= 0 ? '+' : ''}{trendPercent.toFixed(1)}%
            </span>
            <span className="text-xs text-muted ml-1">
              {hoveredIndex !== null ? data[hoveredIndex].label : (isEn ? 'vs prior period' : 'vs période précédente')}
            </span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="flex-1 relative group">
        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={200 - y * 2}
              x2="400"
              y2={200 - y * 2}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
              strokeDasharray="4,4"
            />
          ))}
          
          {/* Hover vertical line */}
          {hoveredIndex !== null && (
            <line
              x1={getPointPosition(hoveredIndex).x}
              y1="0"
              x2={getPointPosition(hoveredIndex).x}
              y2="200"
              stroke="rgb(var(--color-primary-500))"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.5"
            />
          )}
          
          {config.chartType === 'area' && (
            <path
              d={`M ${data.map((d, i) => 
                `${(i / (data.length - 1)) * 400} ${200 - ((d.value - minValue) / range) * 180}`
              ).join(' L ')} L 400 200 L 0 200 Z`}
              fill={metricInfo.color}
              fillOpacity="0.2"
              className="transition-all duration-200"
            />
          )}
          
          {config.chartType === 'line' || config.chartType === 'area' ? (
            <path
              d={`M ${data.map((d, i) => 
                `${(i / (data.length - 1)) * 400} ${200 - ((d.value - minValue) / range) * 180}`
              ).join(' L ')}`}
              fill="none"
              stroke={metricInfo.color}
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          ) : (
            data.map((d, i) => (
              <rect
                key={i}
                x={(i / data.length) * 400 + 5}
                y={200 - ((d.value - minValue) / range) * 180}
                width={(400 / data.length) - 10}
                height={((d.value - minValue) / range) * 180}
                fill={metricInfo.color}
                rx="2"
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.5}
                className="transition-all duration-200 cursor-pointer hover:opacity-80"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))
          )}
          
          {/* Data points with hover */}
          {(config.chartType === 'line' || config.chartType === 'area') && data.map((d, i) => (
            <g key={i}>
              {/* Larger invisible hit area */}
              <circle
                cx={(i / (data.length - 1)) * 400}
                cy={200 - ((d.value - minValue) / range) * 180}
                r="16"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Visible point */}
              <circle
                cx={(i / (data.length - 1)) * 400}
                cy={200 - ((d.value - minValue) / range) * 180}
                r={hoveredIndex === i ? 6 : 4}
                fill={hoveredIndex === i ? metricInfo.color : 'white'}
                stroke={metricInfo.color}
                strokeWidth="2"
                className="transition-all duration-200 pointer-events-none"
              />
              {/* Pulse animation on hover */}
              {hoveredIndex === i && (
                <circle
                  cx={(i / (data.length - 1)) * 400}
                  cy={200 - ((d.value - minValue) / range) * 180}
                  r="12"
                  fill={metricInfo.color}
                  opacity="0.2"
                  className="animate-pulse"
                />
              )}
            </g>
          ))}
        </svg>
        
        {/* Floating Tooltip */}
        {hoveredIndex !== null && (
          <div 
            className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg shadow-lg text-sm transform -translate-x-1/2"
            style={{
              left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
              top: '10px',
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          >
            <p className="font-semibold">{formatValue(data[hoveredIndex].value)}</p>
            <p className="text-xs opacity-70">{data[hoveredIndex].label}</p>
          </div>
        )}
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pie/Donut Chart with Hover
function PieDonutChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
  
  // Pre-calculate angles for all segments
  const segments = data.map((d, i) => {
    const prevAngles = data.slice(0, i).reduce((sum, item) => sum + (item.value / total) * 360, 0);
    const angle = (d.value / total) * 360;
    return {
      ...d,
      startAngle: prevAngles,
      endAngle: prevAngles + angle,
      angle,
      color: colors[i % colors.length],
    };
  });
  
  return (
    <div className="h-full flex items-center justify-center gap-8">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="w-48 h-48">
          {segments.map((seg, i) => {
            const x1 = 100 + 80 * Math.cos((seg.startAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((seg.startAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((seg.endAngle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((seg.endAngle - 90) * Math.PI / 180);
            const largeArc = seg.angle > 180 ? 1 : 0;
            
            // Calculate offset for hover effect
            const midAngle = (seg.startAngle + seg.endAngle) / 2 - 90;
            const hoverOffset = hoveredIndex === i ? 5 : 0;
            const offsetX = hoverOffset * Math.cos(midAngle * Math.PI / 180);
            const offsetY = hoverOffset * Math.sin(midAngle * Math.PI / 180);
            
            return (
              <path
                key={i}
                d={`M ${100 + offsetX} ${100 + offsetY} L ${x1 + offsetX} ${y1 + offsetY} A 80 80 0 ${largeArc} 1 ${x2 + offsetX} ${y2 + offsetY} Z`}
                fill={seg.color}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  filter: hoveredIndex === i ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none',
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.6,
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
          {config.chartType === 'donut' && (
            <circle cx="100" cy="100" r="50" fill="rgb(var(--color-surface))" />
          )}
        </svg>
        
        {config.chartType === 'donut' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold transition-all" style={{ color: 'rgb(var(--color-text))' }}>
                {hoveredIndex !== null ? (
                  new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    notation: 'compact',
                  }).format(data[hoveredIndex].value)
                ) : (
                  new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    notation: 'compact',
                  }).format(total)
                )}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {hoveredIndex !== null ? data[hoveredIndex].label : 'Total'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Legend with hover */}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div 
            key={i} 
            className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all cursor-pointer"
            style={{
              backgroundColor: hoveredIndex === i ? `${colors[i % colors.length]}20` : 'transparent',
              transform: hoveredIndex === i ? 'translateX(4px)' : 'none',
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div 
              className="w-3 h-3 rounded-full transition-transform"
              style={{ 
                backgroundColor: colors[i % colors.length],
                transform: hoveredIndex === i ? 'scale(1.3)' : 'scale(1)',
              }}
            />
            <span 
              className="text-sm transition-all"
              style={{ 
                color: 'rgb(var(--color-text))',
                fontWeight: hoveredIndex === i ? 600 : 400,
              }}
            >
              {d.label}
            </span>
            <span 
              className="text-sm font-medium" 
              style={{ color: hoveredIndex === i ? colors[i % colors.length] : 'rgb(var(--color-text-muted))' }}
            >
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Radar Chart
function RadarChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const maxValue = Math.max(...data.map(d => d.value));
  const numPoints = data.length;
  const angleStep = (2 * Math.PI) / numPoints;
  
  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (d.value / maxValue) * 70;
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle),
    };
  });
  
  return (
    <div className="h-full flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-64 h-64">
        {/* Grid circles */}
        {[20, 40, 60, 80].map((r) => (
          <circle
            key={r}
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke="rgb(var(--color-border))"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}
        
        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 80 * Math.cos(angle)}
              y2={100 + 80 * Math.sin(angle)}
              stroke="rgb(var(--color-border))"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* Data polygon */}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="rgb(var(--color-primary-500))"
          fillOpacity="0.3"
          stroke="rgb(var(--color-primary-500))"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="white"
            stroke="rgb(var(--color-primary-500))"
            strokeWidth="2"
          />
        ))}
        
        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = 90;
          return (
            <text
              key={i}
              x={100 + labelRadius * Math.cos(angle)}
              y={100 + labelRadius * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px]"
              fill="rgb(var(--color-text-muted))"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// Gauge Chart
function GaugeChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const value = data[0]?.value || 0;
  const maxValue = data[0]?.max || 3;
  const percentage = Math.min(100, (value / maxValue) * 100);
  
  const getColor = () => {
    if (percentage < 33) return 'rgb(var(--color-error))';
    if (percentage < 66) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-success))';
  };
  
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="relative">
        <svg viewBox="0 0 200 120" className="w-48 h-28">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="rgb(var(--color-border))"
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getColor()}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
          />
          
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos((percentage * 1.8 - 180) * Math.PI / 180)}
            y2={100 + 60 * Math.sin((percentage * 1.8 - 180) * Math.PI / 180)}
            stroke="rgb(var(--color-text))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          <circle cx="100" cy="100" r="6" fill="rgb(var(--color-text))" />
        </svg>
        
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {value.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between w-48 mt-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <span>0</span>
        <span>{maxValue}</span>
      </div>
    </div>
  );
}

// Heatmap Chart
function HeatmapChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getColor = (value: number) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'rgb(var(--color-success) / 0.1)';
    if (intensity < 0.4) return 'rgb(var(--color-success) / 0.3)';
    if (intensity < 0.6) return 'rgb(var(--color-success) / 0.5)';
    if (intensity < 0.8) return 'rgb(var(--color-success) / 0.7)';
    return 'rgb(var(--color-success))';
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 mb-2">
        <div className="w-6" />
        {weeks.map((w) => (
          <div key={w} className="flex-1 text-center text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {w}
          </div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="flex gap-1 flex-1">
            <div className="w-6 flex items-center justify-center text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {day}
            </div>
            {weeks.map((_, weekIndex) => {
              const index = dayIndex * weeks.length + weekIndex;
              const value = data[index]?.value || 0;
              return (
                <div
                  key={weekIndex}
                  className="flex-1 rounded-sm"
                  style={{ backgroundColor: getColor(value) }}
                  title={`${value.toLocaleString()}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'Less' : 'Moins'}
        </span>
        {[0.1, 0.3, 0.5, 0.7, 1].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: `rgb(var(--color-success) / ${i})` }}
          />
        ))}
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? 'More' : 'Plus'}
        </span>
      </div>
    </div>
  );
}

// Waterfall Chart
function WaterfallChart({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  let cumulative = 0;
  const processedData = data.map((d, i) => {
    const start = cumulative;
    cumulative += d.value;
    return {
      ...d,
      start,
      end: cumulative,
      isPositive: d.value >= 0,
    };
  });
  
  const maxValue = Math.max(...processedData.map(d => Math.max(d.start, d.end)));
  const minValue = Math.min(...processedData.map(d => Math.min(d.start, d.end)));
  const range = maxValue - minValue || 1;
  
  return (
    <div className="h-full flex flex-col">
      <svg className="flex-1" viewBox="0 0 400 200" preserveAspectRatio="none">
        {/* Grid */}
        {[0, 50, 100, 150, 200].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="400"
            y2={y}
            stroke="rgb(var(--color-border))"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}
        
        {/* Bars */}
        {processedData.map((d, i) => {
          const x = (i / processedData.length) * 400 + 10;
          const width = (400 / processedData.length) - 20;
          const y1 = 200 - ((d.start - minValue) / range) * 180 - 10;
          const y2 = 200 - ((d.end - minValue) / range) * 180 - 10;
          const height = Math.abs(y1 - y2);
          const y = Math.min(y1, y2);
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={d.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))'}
                rx="2"
              />
              {i < processedData.length - 1 && (
                <line
                  x1={x + width}
                  y1={y2}
                  x2={(i + 1) / processedData.length * 400 + 10}
                  y2={y2}
                  stroke="rgb(var(--color-border))"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Labels */}
      <div className="flex justify-around mt-2">
        {processedData.map((d, i) => (
          <div key={i} className="text-center">
            <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {d.label}
            </p>
            <p 
              className="text-xs font-medium"
              style={{ color: d.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
            >
              {d.isPositive ? '+' : ''}{d.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table View
function TableView({ data, config, isEn }: { data: any[]; config: ChartConfig; isEn: boolean }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <th 
              className="text-left py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Period' : 'Période'}
            </th>
            <th 
              className="text-right py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Value' : 'Valeur'}
            </th>
            <th 
              className="text-right py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Change' : 'Variation'}
            </th>
            <th 
              className="text-center py-2 px-3 font-medium"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Trend' : 'Tendance'}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const prevValue = data[i - 1]?.value || d.value;
            const change = d.value - prevValue;
            const changePercent = prevValue !== 0 ? (change / prevValue) * 100 : 0;
            
            return (
              <tr 
                key={i}
                className="border-b hover:bg-muted/50 transition-colors"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <td 
                  className="py-2 px-3"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {d.label}
                </td>
                <td 
                  className="py-2 px-3 text-right font-mono"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {d.value.toLocaleString()}
                </td>
                <td 
                  className="py-2 px-3 text-right font-medium"
                  style={{ 
                    color: change >= 0 
                      ? 'rgb(var(--color-success))' 
                      : 'rgb(var(--color-error))'
                  }}
                >
                  {change >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </td>
                <td className="py-2 px-3 text-center">
                  {change > 0 ? (
                    <TrendingUp className="w-4 h-4 inline text-success" />
                  ) : change < 0 ? (
                    <TrendingDown className="w-4 h-4 inline text-error" />
                  ) : (
                    <Minus className="w-4 h-4 inline text-muted" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =====================================================
// MOCK DATA GENERATOR
// =====================================================

function generateMockData(config: ChartConfig): any[] {
  const periods = {
    '1W': 7,
    '1M': 30,
    '3M': 12,
    '6M': 6,
    'YTD': 12,
    '1Y': 12,
    '2Y': 24,
    'ALL': 36,
    'custom': 12,
  };
  
  const count = periods[config.timeRange];
  const baseValue = 100000;
  
  if (config.chartType === 'pie' || config.chartType === 'donut') {
    return [
      { label: 'Salaires', value: 45000 },
      { label: 'Marketing', value: 25000 },
      { label: 'Opérations', value: 15000 },
      { label: 'R&D', value: 10000 },
      { label: 'Autres', value: 5000 },
    ];
  }
  
  if (config.chartType === 'gauge') {
    return [{ value: 1.85, max: 3 }];
  }
  
  if (config.chartType === 'radar') {
    return config.metrics.map(metric => ({
      label: METRIC_INFO[metric].label,
      value: Math.random() * 100,
    }));
  }
  
  if (config.chartType === 'waterfall') {
    return [
      { label: 'Revenus', value: 150000 },
      { label: 'Coûts', value: -80000 },
      { label: 'Salaires', value: -35000 },
      { label: 'Marketing', value: -10000 },
      { label: 'Autres', value: -5000 },
      { label: 'Net', value: 20000 },
    ];
  }
  
  if (config.chartType === 'heatmap') {
    return Array.from({ length: 84 }, () => ({
      value: Math.random() * 10000,
    }));
  }
  
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  
  return Array.from({ length: count }, (_, i) => ({
    label: months[i % 12],
    value: baseValue + (Math.random() - 0.3) * baseValue * 0.5 + i * 2000,
  }));
}

// =====================================================
// CHART GALLERY
// =====================================================

interface ChartGalleryProps {
  onSelectChart?: (config: ChartConfig) => void;
}

export function ChartGallery({ onSelectChart }: ChartGalleryProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'financial' | 'ratio' | 'operational'>('all');
  
  const categories = [
    { id: 'all', label: isEn ? 'All Charts' : 'Tous les graphiques' },
    { id: 'financial', label: isEn ? 'Financial' : 'Financiers' },
    { id: 'ratio', label: isEn ? 'Ratios' : 'Ratios' },
    { id: 'operational', label: isEn ? 'Operational' : 'Opérationnels' },
  ];
  
  const filteredCharts = PRESET_CHARTS.filter(chart => {
    if (selectedCategory === 'all') return true;
    const primaryMetric = chart.metrics[0];
    return METRIC_INFO[primaryMetric].category === selectedCategory;
  });
  
  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: selectedCategory === cat.id 
                ? 'rgb(var(--color-primary-500))'
                : 'rgb(var(--color-bg-muted))',
              color: selectedCategory === cat.id 
                ? 'white'
                : 'rgb(var(--color-text-secondary))',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCharts.map((chart) => {
          const isPinned = chartFavoritesService.isPinned(chart.id);
          const ChartIcon = ChartTypeIcon[chart.chartType];
          
          return (
            <div
              key={chart.id}
              className="card p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectChart?.(chart)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                  >
                    <ChartIcon className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  </div>
                  <div>
                    <h4 className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? chart.nameEn : chart.name}
                    </h4>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? CHART_TYPE_INFO[chart.chartType].labelEn : CHART_TYPE_INFO[chart.chartType].label}
                    </p>
                  </div>
                </div>
                {isPinned && (
                  <Pin className="w-4 h-4" style={{ color: 'rgb(var(--color-warning))' }} />
                )}
              </div>
              
              <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {isEn ? chart.descriptionEn : chart.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {chart.metrics.slice(0, 3).map((metric) => (
                  <span
                    key={metric}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                      color: 'rgb(var(--color-primary-600))',
                    }}
                  >
                    {isEn ? METRIC_INFO[metric].labelEn : METRIC_INFO[metric].label}
                  </span>
                ))}
                {chart.metrics.length > 3 && (
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text-muted))',
                    }}
                  >
                    +{chart.metrics.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataVisualizationCard;
