import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Plus,
  X,
  Edit3,
  Save,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  Calendar,
  User,
  Send,
  Eye,
  EyeOff,
  Presentation,
  LayoutGrid,
  List,
  Timer,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Printer,
  ArrowRight,
  Sparkles,
  Activity,
  Briefcase,
  Lock,
  Link,
  Mail,
  Copy,
  Loader2,
  Shield,
  Users,
  FileDown,
  Layers,
  GripVertical,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import Toggle from '../components/Toggle';
import {
  boardMeetingService,
  generateExecutiveSummarySlides,
  MEETING_TEMPLATES,
  createBoardPanel,
  createSlideElement,
  type BoardMeeting as BoardMeetingType,
  type MeetingSlide,
  type AgendaItem,
  type Participant,
  type Note,
  type BoardPanel,
  type BoardPanelType,
  type PanelSize,
  type SlideElement,
  type SlideElementType,
} from '../lib/boardMeeting';
import BoardPanelPicker from '../components/strategic/BoardPanelPicker';
import BoardPanelRenderer from '../components/strategic/BoardPanelRenderer';
import SlideEditor from '../components/strategic/SlideEditor';

// Slide components
function TitleSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div 
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
        style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
      >
        <Briefcase className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h1>
      {slide.content?.subtitle && (
        <p className="text-xl sm:text-2xl mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {slide.content.subtitle}
        </p>
      )}
      {slide.content?.company && (
        <p className="text-lg font-semibold" style={{ color: 'rgb(var(--color-primary-600))' }}>
          {slide.content.company}
        </p>
      )}
      {slide.content?.date && (
        <p className="text-base mt-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          {slide.content.date}
        </p>
      )}
    </div>
  );
}

function ExecutiveSummarySlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {slide.content?.highlights?.map((item: any, index: number) => (
          <div 
            key={index}
            className="p-4 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <p className="text-sm mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {item.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              {item.value}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {item.trend === 'up' ? (
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color: 'rgb(var(--color-error))' }} />
              )}
              <span 
                className="text-sm font-medium"
                style={{ color: item.trend === 'up' ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))' }}
              >
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {slide.content?.summary && (
        <div 
          className="p-6 rounded-xl flex-1"
          style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <p className="text-lg" style={{ color: 'rgb(var(--color-text))' }}>
              {slide.content.summary}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function KPISlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {slide.content?.kpis?.map((kpi: any, index: number) => (
          <div 
            key={index}
            className="p-5 rounded-xl border flex flex-col"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              borderColor: kpi.status === 'good' ? 'rgb(var(--color-success) / 0.3)' : 'rgb(var(--color-warning) / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {kpi.name}
              </p>
              {kpi.status === 'good' ? (
                <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
              ) : (
                <AlertCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
              )}
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {kpi.value}
            </p>
            <div className="mt-auto">
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn ? 'Target:' : 'Cible:'} {kpi.target}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  const data = slide.content?.data || [];
  const maxValue = Math.max(...data.map((d: any) => d.value));
  
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      {slide.content?.chartType === 'line' && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <line
                  key={i}
                  x1="40"
                  y1={20 + i * 40}
                  x2="390"
                  y2={20 + i * 40}
                  stroke="rgb(var(--color-border))"
                  strokeWidth="0.5"
                  strokeDasharray="2"
                />
              ))}
              
              {/* Area fill */}
              <path
                d={`M 40 180 ${data.map((d: any, i: number) => `L ${40 + (i * 350) / (data.length - 1)} ${180 - ((d.value / maxValue) * 140)}`).join(' ')} L ${40 + 350} 180 Z`}
                fill="rgb(var(--color-primary-500))"
                fillOpacity="0.1"
              />
              
              {/* Line */}
              <path
                d={`M ${data.map((d: any, i: number) => `${40 + (i * 350) / (data.length - 1)} ${180 - ((d.value / maxValue) * 140)}`).join(' L ')}`}
                fill="none"
                stroke="rgb(var(--color-primary-500))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Points */}
              {data.map((d: any, i: number) => (
                <circle
                  key={i}
                  cx={40 + (i * 350) / (data.length - 1)}
                  cy={180 - ((d.value / maxValue) * 140)}
                  r="4"
                  fill="rgb(var(--color-primary-500))"
                />
              ))}
            </svg>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between px-10 mt-2">
            {data.filter((_: any, i: number) => i % 2 === 0).map((d: any, i: number) => (
              <span key={i} className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {d.month}
              </span>
            ))}
          </div>
          
          {/* Insights */}
          {slide.content?.insights && (
            <div className="mt-4 flex gap-4">
              {slide.content.insights.map((insight: string, i: number) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-success))' }}>
                    {insight}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {slide.content?.chartType === 'pie' && (
        <div className="flex-1 flex items-center justify-center gap-8">
          <div className="relative w-64 h-64">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {(() => {
                let cumulative = 0;
                return data.map((d: any, i: number) => {
                  const start = cumulative;
                  cumulative += d.value;
                  const startAngle = (start / 100) * 2 * Math.PI;
                  const endAngle = (cumulative / 100) * 2 * Math.PI;
                  const x1 = 50 + 40 * Math.cos(startAngle);
                  const y1 = 50 + 40 * Math.sin(startAngle);
                  const x2 = 50 + 40 * Math.cos(endAngle);
                  const y2 = 50 + 40 * Math.sin(endAngle);
                  const largeArc = d.value > 50 ? 1 : 0;
                  
                  return (
                    <path
                      key={i}
                      d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={d.color}
                      className="transition-all hover:opacity-80"
                    />
                  );
                });
              })()}
            </svg>
          </div>
          
          <div className="space-y-3">
            {data.map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <span style={{ color: 'rgb(var(--color-text))' }}>{d.category}</span>
                <span className="font-bold" style={{ color: 'rgb(var(--color-text))' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div 
        className="flex-1 rounded-xl border overflow-hidden"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
              {slide.content?.headers?.map((header: string, i: number) => (
                <th 
                  key={i}
                  className="px-6 py-4 text-left text-sm font-semibold"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.content?.rows?.map((row: string[], i: number) => (
              <tr 
                key={i}
                className="border-t"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                {row.map((cell: string, j: number) => (
                  <td 
                    key={j}
                    className={`px-6 py-4 ${j === 0 ? 'font-medium' : ''} ${cell.startsWith('+') ? 'text-green-500' : cell.startsWith('-') ? 'text-red-500' : ''}`}
                    style={{ color: cell.startsWith('+') || cell.startsWith('-') ? undefined : 'rgb(var(--color-text))' }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionItemsSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  const priorityColors = {
    critical: 'rgb(var(--color-error))',
    high: 'rgb(var(--color-warning))',
    medium: 'rgb(var(--color-primary-500))',
    low: 'rgb(var(--color-text-muted))',
  };

  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div className="space-y-4 flex-1">
        {slide.content?.items?.map((item: any, i: number) => (
          <div 
            key={i}
            className="p-5 rounded-xl border-l-4 flex items-center justify-between"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              borderLeftColor: priorityColors[item.priority as keyof typeof priorityColors],
            }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                <Target className="w-5 h-5" style={{ color: priorityColors[item.priority as keyof typeof priorityColors] }} />
              </div>
              <div>
                <p className="font-medium text-lg" style={{ color: 'rgb(var(--color-text))' }}>
                  {item.task}
                </p>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Owner:' : 'Responsable:'} {item.owner}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {new Date(item.due).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
              </p>
              <span 
                className="text-xs px-2 py-1 rounded-full capitalize"
                style={{ 
                  backgroundColor: `${priorityColors[item.priority as keyof typeof priorityColors]}20`,
                  color: priorityColors[item.priority as keyof typeof priorityColors],
                }}
              >
                {item.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {slide.content?.sections?.map((section: any, i: number) => (
          <div 
            key={i}
            className="p-6 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              {i === 0 ? <Target className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} /> : <Calendar className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />}
              {section.heading}
            </h3>
            <ul className="space-y-3">
              {section.points.map((point: string, j: number) => (
                <li key={j} className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function QASlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div 
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
      >
        <MessageSquare className="w-12 h-12" style={{ color: 'rgb(var(--color-primary-500))' }} />
      </div>
      <h2 className="text-4xl font-bold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      <p className="text-xl mb-8" style={{ color: 'rgb(var(--color-text-muted))' }}>
        {isEn ? 'Open floor for questions and discussion' : 'Discussion ouverte pour questions et échanges'}
      </p>
      <div className="flex items-center gap-4">
        <div 
          className="px-6 py-3 rounded-full flex items-center gap-2"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <Clock className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span style={{ color: 'rgb(var(--color-text))' }}>
            {slide.content?.timeAllotted} {isEn ? 'minutes' : 'minutes'}
          </span>
        </div>
        <div 
          className="px-6 py-3 rounded-full flex items-center gap-2"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <User className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          <span style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Moderated by' : 'Modéré par'} {slide.content?.moderator}
          </span>
        </div>
      </div>
    </div>
  );
}

function HealthSlide({ slide, isEn }: { slide: MeetingSlide; isEn: boolean }) {
  const score = slide.content?.healthScore || 0;
  const anomalies = slide.content?.anomalies || { critical: 0, warning: 0, info: 0 };
  
  return (
    <div className="h-full flex flex-col px-8 py-6">
      <h2 className="text-3xl font-bold mb-8" style={{ color: 'rgb(var(--color-text))' }}>
        {slide.title}
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Health Score */}
        <div 
          className="p-6 rounded-xl flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgb(var(--color-border))"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={score >= 70 ? 'rgb(var(--color-success))' : score >= 50 ? 'rgb(var(--color-warning))' : 'rgb(var(--color-error))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 2.51} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{score}</span>
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>/100</span>
            </div>
          </div>
          <p className="mt-4 font-medium" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Financial Health Score' : 'Score de santé financière'}
          </p>
        </div>
        
        {/* Anomalies & Issues */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
            >
              <p className="text-3xl font-bold" style={{ color: 'rgb(var(--color-error))' }}>
                {anomalies.critical}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-error))' }}>
                {isEn ? 'Critical' : 'Critiques'}
              </p>
            </div>
            <div 
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
            >
              <p className="text-3xl font-bold" style={{ color: 'rgb(var(--color-warning))' }}>
                {anomalies.warning}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
                {isEn ? 'Warnings' : 'Avertissements'}
              </p>
            </div>
            <div 
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
            >
              <p className="text-3xl font-bold" style={{ color: 'rgb(var(--color-info))' }}>
                {anomalies.info}
              </p>
              <p className="text-sm" style={{ color: 'rgb(var(--color-info))' }}>Info</p>
            </div>
          </div>
          
          <div 
            className="p-5 rounded-xl"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
              {isEn ? 'Key Issues to Address' : 'Problèmes clés à résoudre'}
            </h4>
            <ul className="space-y-2">
              {slide.content?.topIssues?.map((issue: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  <span style={{ color: 'rgb(var(--color-error))' }}>•</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Share Modal Component
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn: boolean;
  meetingTitle: string;
}

function ShareModal({ isOpen, onClose, isEn, meetingTitle }: ShareModalProps) {
  const [password, setPassword] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const [expiresIn, setExpiresIn] = useState('7d');
  const [allowDownload, setAllowDownload] = useState(true);
  const [requireAuth, setRequireAuth] = useState(false);
  const [emails, setEmails] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  // Generate random password
  useEffect(() => {
    if (generatePassword) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let pwd = '';
      for (let i = 0; i < 8; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setPassword(pwd);
    }
  }, [generatePassword]);
  
  const shareUrl = `https://app.plainledger.ca/meeting/share/abc123?p=${password}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareUrl}\n\n${isEn ? 'Password' : 'Mot de passe'}: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSendEmails = async () => {
    if (!emails.trim()) return;
    setSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
    >
      <div 
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Share2 className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Share Presentation' : 'Partager la présentation'}
              </h2>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {meetingTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-black/5 transition-colors">
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Shareable Link */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Shareable Link' : 'Lien de partage'}
            </label>
            <div 
              className="flex items-center gap-2 p-3 rounded-xl border"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
              }}
            >
              <Link className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'rgb(var(--color-text))' }}
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
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
          
          {/* Password Protection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                <Lock className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
                {isEn ? 'Password Protection' : 'Protection par mot de passe'}
              </label>
              <Toggle
                checked={generatePassword}
                onChange={setGeneratePassword}
                label={isEn ? 'Auto-generate' : 'Auto-générer'}
                labelPosition="left"
                size="sm"
              />
            </div>
            <div 
              className="flex items-center gap-2 p-3 rounded-xl border"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
              }}
            >
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <input
                type="text"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setGeneratePassword(false); }}
                placeholder={isEn ? 'Enter password' : 'Entrer le mot de passe'}
                className="flex-1 bg-transparent text-sm outline-none font-mono"
                style={{ color: 'rgb(var(--color-text))' }}
              />
            </div>
          </div>
          
          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Link Expires' : 'Expiration'}
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full p-3 rounded-xl border text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              >
                <option value="1d">{isEn ? '1 day' : '1 jour'}</option>
                <option value="7d">{isEn ? '7 days' : '7 jours'}</option>
                <option value="30d">{isEn ? '30 days' : '30 jours'}</option>
                <option value="never">{isEn ? 'Never' : 'Jamais'}</option>
              </select>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Allow PDF download' : 'Autoriser téléchargement PDF'}
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireAuth}
                  onChange={(e) => setRequireAuth(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Require login' : 'Connexion requise'}
                </span>
              </label>
            </div>
          </div>
          
          {/* Send by Email */}
          <div 
            className="p-4 rounded-xl border"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <label className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <Mail className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'Send by Email' : 'Envoyer par courriel'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={isEn ? 'Enter email addresses (comma separated)' : 'Entrer les courriels (séparés par virgule)'}
                className="flex-1 p-3 rounded-xl border text-sm"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
              <button
                onClick={handleSendEmails}
                disabled={!emails.trim() || sending}
                className="px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                style={{ 
                  backgroundColor: sent ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary-500))',
                  color: 'white',
                }}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sent ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {sent ? (isEn ? 'Sent!' : 'Envoyé!') : (isEn ? 'Send' : 'Envoyer')}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Recipients will receive an email with the link and password'
                : 'Les destinataires recevront un courriel avec le lien et le mot de passe'}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div 
          className="p-4 border-t flex justify-end gap-3"
          style={{ 
            borderColor: 'rgb(var(--color-border))',
            backgroundColor: 'rgb(var(--color-bg-muted))',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Close' : 'Fermer'}
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Copy className="w-4 h-4" />
            {isEn ? 'Copy Link & Password' : 'Copier lien et mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );
}

// PDF Download function
function generatePDF(slides: MeetingSlide[], title: string, isEn: boolean) {
  // In a real implementation, this would use a library like jspdf or html2pdf
  // For now, we'll simulate the download
  const content = slides.map((slide, i) => 
    `Slide ${i + 1}: ${slide.title}\n${slide.content?.subtitle || ''}\n\n`
  ).join('');
  
  const blob = new Blob([
    `${title}\n${'='.repeat(title.length)}\n\n`,
    `${isEn ? 'Generated on' : 'Généré le'}: ${new Date().toLocaleDateString()}\n\n`,
    content,
  ], { type: 'text/plain' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Main component
export default function BoardMeeting() {
  const { language } = useI18n();
  const isEn = language === 'en';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { data: financialData } = useFinancialData();
  
  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Panel system state
  const [viewMode, setViewMode] = useState<'slides' | 'panels'>('slides');
  const [showPanelPicker, setShowPanelPicker] = useState(false);
  const [boardPanels, setBoardPanels] = useState<BoardPanel[]>(() => {
    try {
      const stored = localStorage.getItem('plainledger-board-panels');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddElementMenu, setShowAddElementMenu] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  
  // Slide elements state (per slide)
  const [slideElements, setSlideElements] = useState<Record<string, SlideElement[]>>(() => {
    try {
      const stored = localStorage.getItem('plainledger-slide-elements');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  
  // Save slide elements to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('plainledger-slide-elements', JSON.stringify(slideElements));
    } catch (error) {
      console.error('Failed to save slide elements:', error);
    }
  }, [slideElements]);
  
  // Save panels to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('plainledger-board-panels', JSON.stringify(boardPanels));
    } catch (error) {
      console.error('Failed to save board panels:', error);
    }
  }, [boardPanels]);
  
  // Panel handlers
  const handleAddPanel = useCallback((type: BoardPanelType) => {
    const newPanel = createBoardPanel(type, boardPanels.length);
    setBoardPanels(prev => [...prev, newPanel]);
  }, [boardPanels.length]);
  
  const handleUpdatePanel = useCallback((updatedPanel: BoardPanel) => {
    setBoardPanels(prev => prev.map(p => p.id === updatedPanel.id ? updatedPanel : p));
  }, []);
  
  const handleDeletePanel = useCallback((panelId: string) => {
    setBoardPanels(prev => prev.filter(p => p.id !== panelId));
  }, []);
  
  const handleResizePanel = useCallback((panelId: string, size: PanelSize) => {
    setBoardPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, size, updatedAt: new Date().toISOString() } : p
    ));
  }, []);
  
  const handleMovePanel = useCallback((fromIndex: number, toIndex: number) => {
    setBoardPanels(prev => {
      const newPanels = [...prev];
      const [moved] = newPanels.splice(fromIndex, 1);
      newPanels.splice(toIndex, 0, moved);
      return newPanels.map((p, i) => ({ ...p, order: i }));
    });
  }, []);
  
  // Get existing panel types for the picker
  const existingPanelTypes = useMemo(() => 
    boardPanels.map(p => p.type),
  [boardPanels]);
  
  // Generate slides
  const slides = useMemo(() => {
    return generateExecutiveSummarySlides(financialData, isEn);
  }, [financialData, isEn]);
  
  const currentSlide = slides[currentSlideIndex];
  
  // Get elements for current slide
  const currentSlideElements = useMemo(() => {
    return slideElements[currentSlide?.id || ''] || [];
  }, [slideElements, currentSlide]);
  
  // Update elements for current slide
  const handleSlideElementsChange = useCallback((elements: SlideElement[]) => {
    if (!currentSlide) return;
    setSlideElements(prev => ({
      ...prev,
      [currentSlide.id]: elements,
    }));
  }, [currentSlide]);
  
  // Add element to slide
  const handleAddSlideElement = useCallback((elementType: string) => {
    if (!currentSlide) return;
    
    // Map display names to element types
    const typeMap: Record<string, SlideElementType> = {
      'Chart': 'chart',
      'Graphique': 'chart',
      'Pie': 'chart',
      'Camembert': 'chart',
      'KPI': 'kpi',
      'Text': 'text',
      'Texte': 'text',
      'Metric': 'metric',
      'Métrique': 'metric',
      'Alert': 'alert',
      'Alerte': 'alert',
      'Trend': 'trend',
      'Tendance': 'trend',
      'Table': 'table',
      'Tableau': 'table',
    };
    
    const type = typeMap[elementType] || 'text';
    const newElement = createSlideElement(type);
    
    // If adding a chart type, set the specific chart type
    if (elementType === 'Pie' || elementType === 'Camembert') {
      newElement.content.chartType = 'pie';
    }
    
    handleSlideElementsChange([...currentSlideElements, newElement]);
    setShowAddElementMenu(false);
  }, [currentSlide, currentSlideElements, handleSlideElementsChange]);
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (meetingStarted && !isPlaying) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStarted, isPlaying]);
  
  // Auto-advance slides when playing
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying && currentSlideIndex < slides.length - 1) {
      timeout = setTimeout(() => {
        setCurrentSlideIndex(prev => prev + 1);
      }, 8000); // 8 seconds per slide
    } else if (isPlaying && currentSlideIndex === slides.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, currentSlideIndex, slides.length]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentSlideIndex < slides.length - 1) {
          setCurrentSlideIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSlideIndex > 0) {
          setCurrentSlideIndex(prev => prev - 1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(prev => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, isFullscreen]);
  
  // Format time
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  
  // Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    generatePDF(slides, isEn ? 'Board Meeting - Quarterly Financial Review' : 'Réunion CA - Revue financière trimestrielle', isEn);
    setIsDownloading(false);
  };
  
  // Add note
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNote,
      author: 'You',
      timestamp: new Date().toISOString(),
      isPrivate: false,
    };
    setNotes(prev => [...prev, note]);
    setNewNote('');
  };
  
  // Render slide content
  const renderSlide = (slide: MeetingSlide) => {
    switch (slide.type) {
      case 'title':
        return <TitleSlide slide={slide} isEn={isEn} />;
      case 'executive_summary':
        return <ExecutiveSummarySlide slide={slide} isEn={isEn} />;
      case 'kpi':
        return <KPISlide slide={slide} isEn={isEn} />;
      case 'chart':
        return <ChartSlide slide={slide} isEn={isEn} />;
      case 'table':
        return <TableSlide slide={slide} isEn={isEn} />;
      case 'action_items':
        return <ActionItemsSlide slide={slide} isEn={isEn} />;
      case 'text':
        return <TextSlide slide={slide} isEn={isEn} />;
      case 'q_and_a':
        return <QASlide slide={slide} isEn={isEn} />;
      case 'custom':
        return <HealthSlide slide={slide} isEn={isEn} />;
      default:
        return (
          <div className="h-full flex items-center justify-center">
            <p style={{ color: 'rgb(var(--color-text-muted))' }}>Slide content</p>
          </div>
        );
    }
  };
  
  // Fullscreen presentation mode
  if (isFullscreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        {/* Top bar */}
        <div 
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-lg hover:bg-black/10 transition-colors"
            >
              <Minimize2 className="w-5 h-5" style={{ color: 'rgb(var(--color-text))' }} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {currentSlideIndex + 1} / {slides.length}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              className="px-4 py-2 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <Timer className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <span className="font-mono text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                {formatTime(elapsedTime)}
              </span>
            </div>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Slide content */}
        <div className="flex-1 overflow-hidden">
          {renderSlide(currentSlide)}
        </div>
        
        {/* Bottom navigation */}
        <div 
          className="flex items-center justify-between px-6 py-3 border-t"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <button
            onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-black/10 transition-colors"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <ChevronLeft className="w-5 h-5" />
            {isEn ? 'Previous' : 'Précédent'}
          </button>
          
          {/* Slide thumbnails */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'w-6' : ''}`}
                style={{ 
                  backgroundColor: idx === currentSlideIndex 
                    ? 'rgb(var(--color-primary-500))' 
                    : 'rgb(var(--color-border))' 
                }}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-black/10 transition-colors"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Next' : 'Suivant'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }
  
  // Regular view with sidebar
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'Board Meeting' : 'Réunion du conseil'}
          </h1>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn ? 'Quarterly Financial Review' : 'Revue financière trimestrielle'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div 
            className="flex items-center rounded-lg p-1"
            style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
          >
            <button
              onClick={() => setViewMode('slides')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'slides' ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'slides' ? 'rgb(var(--color-surface))' : 'transparent',
                color: viewMode === 'slides' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <Presentation className="w-4 h-4" />
              <span className="hidden sm:inline">Slides</span>
            </button>
            <button
              onClick={() => setViewMode('panels')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'panels' ? 'shadow-sm' : ''
              }`}
              style={{
                backgroundColor: viewMode === 'panels' ? 'rgb(var(--color-surface))' : 'transparent',
                color: viewMode === 'panels' ? 'rgb(var(--color-text))' : 'rgb(var(--color-text-muted))',
              }}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isEn ? 'Sections' : 'Sections'}
                {boardPanels.length > 0 && (
                  <span 
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
                  >
                    {boardPanels.length}
                  </span>
                )}
              </span>
            </button>
          </div>
          
          {/* Add Section Button (only in panels view) */}
          {viewMode === 'panels' && (
            <button
              onClick={() => setShowPanelPicker(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'Add Section' : 'Ajouter section'}</span>
            </button>
          )}
          
          {/* Meeting timer */}
          {meetingStarted && (
            <div 
              className="px-3 py-1.5 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: 'rgb(var(--color-success) / 0.1)' }}
            >
              <Activity className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
              <span className="font-mono text-sm" style={{ color: 'rgb(var(--color-success))' }}>
                {formatTime(elapsedTime)}
              </span>
            </div>
          )}
          
          {!meetingStarted ? (
            <button
              onClick={() => setMeetingStarted(true)}
              className="btn-primary flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {isEn ? 'Start Meeting' : 'Démarrer'}
            </button>
          ) : (
            <button
              onClick={() => setMeetingStarted(false)}
              className="btn-secondary flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              {isEn ? 'End Meeting' : 'Terminer'}
            </button>
          )}
          
          {viewMode === 'slides' && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="btn-secondary flex items-center gap-2"
              title={isEn ? 'Enter presentation mode' : 'Mode présentation'}
            >
              <Presentation className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? 'Present' : 'Présenter'}</span>
            </button>
          )}
          
          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="btn-secondary flex items-center gap-2"
            title={isEn ? 'Share presentation' : 'Partager la présentation'}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isEn ? 'Share' : 'Partager'}</span>
          </button>
          
          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="btn-secondary flex items-center gap-2"
            title={isEn ? 'Download PDF' : 'Télécharger PDF'}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isEn ? 'PDF' : 'PDF'}</span>
          </button>
          
          {viewMode === 'slides' && (
            <>
              <button
                onClick={() => setShowAgenda(!showAgenda)}
                className={`p-2 rounded-lg border transition-colors ${showAgenda ? 'bg-primary-500 text-white border-primary-500' : ''}`}
                style={{ borderColor: showAgenda ? undefined : 'rgb(var(--color-border))' }}
                title={isEn ? 'Toggle agenda' : 'Afficher l\'agenda'}
              >
                <List className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`p-2 rounded-lg border transition-colors ${showParticipants ? 'bg-primary-500 text-white border-primary-500' : ''}`}
                style={{ borderColor: showParticipants ? undefined : 'rgb(var(--color-border))' }}
                title={isEn ? 'Toggle participants' : 'Afficher les participants'}
              >
                <Users className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel Picker Modal */}
        <BoardPanelPicker
          isOpen={showPanelPicker}
          onClose={() => setShowPanelPicker(false)}
          onAddPanel={handleAddPanel}
          existingPanels={existingPanelTypes}
        />
        
        {/* Panels View */}
        {viewMode === 'panels' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {boardPanels.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-2xl border-2 border-dashed"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
                >
                  <Layers className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'No sections added yet' : 'Aucune section ajoutée'}
                </h3>
                <p className="text-sm mb-6 max-w-md" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Add financial sections to customize your board meeting presentation. Choose from balance sheets, income statements, anomaly reports, and more.'
                    : 'Ajoutez des sections financières pour personnaliser votre présentation. Choisissez parmi les bilans, états des résultats, rapports d\'anomalies, et plus.'}
                </p>
                <button
                  onClick={() => setShowPanelPicker(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isEn ? 'Add Your First Section' : 'Ajouter votre première section'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boardPanels.map((panel, index) => (
                  <BoardPanelRenderer
                    key={panel.id}
                    panel={panel}
                    onUpdate={handleUpdatePanel}
                    onDelete={handleDeletePanel}
                    onResize={handleResizePanel}
                    financialData={financialData}
                  />
                ))}
                
                {/* Add more button */}
                <button
                  onClick={() => setShowPanelPicker(true)}
                  className="col-span-1 min-h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:border-primary-500 hover:bg-primary-500/5"
                  style={{ borderColor: 'rgb(var(--color-border))' }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <Plus className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? 'Add Section' : 'Ajouter une section'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Slides View - Sidebar - Agenda */}
        {viewMode === 'slides' && showAgenda && (
          <div 
            className="w-64 border-r overflow-y-auto p-4"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Presentation Outline' : 'Plan de présentation'}
            </h3>
            <div className="space-y-1">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${idx === currentSlideIndex ? 'bg-primary-500 text-white' : 'hover:bg-black/5'}`}
                  style={{ color: idx === currentSlideIndex ? undefined : 'rgb(var(--color-text))' }}
                >
                  <span className="opacity-60 mr-2">{idx + 1}.</span>
                  {slide.title}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Main slide area */}
        {viewMode === 'slides' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Edit Toolbar */}
          {isEditMode && (
            <div 
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                borderColor: 'rgb(var(--color-border))',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Edit Mode' : 'Mode édition'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)', color: 'rgb(var(--color-primary-600))' }}>
                  {currentSlide?.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddElementMenu(!showAddElementMenu)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {isEn ? 'Add Element' : 'Ajouter élément'}
                </button>
                <button
                  onClick={() => setIsEditMode(false)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? 'Done' : 'Terminé'}
                </button>
              </div>
              
              {/* Add Element Menu */}
              {showAddElementMenu && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 rounded-xl shadow-lg border z-50"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    borderColor: 'rgb(var(--color-border))',
                  }}
                >
                  <div className="grid grid-cols-4 gap-2 p-2">
                    {[
                      { icon: BarChart3, label: isEn ? 'Chart' : 'Graphique' },
                      { icon: PieChart, label: isEn ? 'Pie' : 'Camembert' },
                      { icon: Target, label: 'KPI' },
                      { icon: FileText, label: isEn ? 'Text' : 'Texte' },
                      { icon: DollarSign, label: isEn ? 'Metric' : 'Métrique' },
                      { icon: AlertTriangle, label: isEn ? 'Alert' : 'Alerte' },
                      { icon: TrendingUp, label: isEn ? 'Trend' : 'Tendance' },
                      { icon: Layers, label: isEn ? 'Table' : 'Tableau' },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          handleAddSlideElement(item.label);
                          setShowAddElementMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-black/5 transition-colors"
                      >
                        <item.icon className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Slide */}
          <div 
            className="flex-1 overflow-hidden relative p-4"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {/* Slide Editor with PowerPoint-style positioning */}
            <div className="w-full h-full relative">
              {/* Base slide content */}
              <div className={`absolute inset-0 ${isEditMode && currentSlideElements.length > 0 ? 'opacity-30' : ''}`}>
                {renderSlide(currentSlide)}
              </div>
              
              {/* Draggable elements layer */}
              {(isEditMode || currentSlideElements.length > 0) && (
                <div className="absolute inset-0">
                  <SlideEditor
                    elements={currentSlideElements}
                    onElementsChange={handleSlideElementsChange}
                    isEditMode={isEditMode}
                    slideTitle={currentSlide?.title}
                  />
                </div>
              )}
            </div>
            
            {/* Navigation arrows */}
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full disabled:opacity-30 transition-all hover:scale-110 z-20"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <ChevronLeft className="w-6 h-6" style={{ color: 'rgb(var(--color-text))' }} />
            </button>
            <button
              onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlideIndex === slides.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full disabled:opacity-30 transition-all hover:scale-110 z-20"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
            >
              <ChevronRight className="w-6 h-6" style={{ color: 'rgb(var(--color-text))' }} />
            </button>
            
            {/* Edit mode indicator */}
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all opacity-0 hover:opacity-100 z-20"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text-secondary))',
                }}
              >
                <Edit3 className="w-4 h-4" />
                {isEn ? 'Edit' : 'Éditer'}
              </button>
            )}
          </div>
          
          {/* Slide thumbnails */}
          <div 
            className="p-3 border-t overflow-x-auto"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <div className="flex gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`flex-shrink-0 w-24 h-16 rounded-lg border-2 overflow-hidden transition-all ${idx === currentSlideIndex ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-transparent hover:border-gray-300'}`}
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <div className="p-2 h-full flex items-center justify-center">
                    <span className="text-[10px] text-center line-clamp-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {slide.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
        
        {/* Right sidebar - Notes & Participants */}
        {viewMode === 'slides' && (showNotes || showParticipants) && (
          <div 
            className={`border-l flex flex-col transition-all duration-300 ${rightSidebarCollapsed ? 'w-12' : 'w-80'}`}
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            {/* Collapse button */}
            <div 
              className="flex items-center justify-between p-2 border-b"
              style={{ borderColor: 'rgb(var(--color-border))' }}
            >
              {!rightSidebarCollapsed && (
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {showNotes && !showParticipants ? 'Notes' : (isEn ? 'Team' : 'Équipe')}
                </span>
              )}
              <button
                onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors ml-auto"
                title={rightSidebarCollapsed ? (isEn ? 'Expand' : 'Agrandir') : (isEn ? 'Collapse' : 'Réduire')}
              >
                {rightSidebarCollapsed ? (
                  <ChevronLeft className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                )}
              </button>
            </div>
            
            {/* Collapsed state - icon buttons */}
            {rightSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2 p-2">
                <button
                  onClick={() => { setShowNotes(true); setShowParticipants(false); setRightSidebarCollapsed(false); }}
                  className={`p-2 rounded-lg transition-colors ${showNotes ? 'bg-primary-500/10' : 'hover:bg-black/5'}`}
                  title="Notes"
                >
                  <FileText className="w-5 h-5" style={{ color: showNotes ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} />
                </button>
                <button
                  onClick={() => { setShowParticipants(true); setShowNotes(false); setRightSidebarCollapsed(false); }}
                  className={`p-2 rounded-lg transition-colors ${showParticipants ? 'bg-primary-500/10' : 'hover:bg-black/5'}`}
                  title={isEn ? 'Team' : 'Équipe'}
                >
                  <Users className="w-5 h-5" style={{ color: showParticipants ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-text-muted))' }} />
                </button>
              </div>
            ) : (
              <>
            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
              <button
                onClick={() => { setShowNotes(true); setShowParticipants(false); }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${showNotes && !showParticipants ? 'border-b-2 border-primary-500' : ''}`}
                style={{ color: showNotes && !showParticipants ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Notes
              </button>
              <button
                onClick={() => { setShowParticipants(true); setShowNotes(false); }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${showParticipants && !showNotes ? 'border-b-2 border-primary-500' : ''}`}
                style={{ color: showParticipants && !showNotes ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-muted))' }}
              >
                <Users className="w-4 h-4 inline mr-2" />
                {isEn ? 'Team' : 'Équipe'}
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {showNotes && !showParticipants && (
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
                      <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? 'No notes yet' : 'Aucune note'}
                      </p>
                    </div>
                  ) : (
                    notes.map(note => (
                      <div 
                        key={note.id}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                      >
                        <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {note.content}
                        </p>
                        <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {note.author} • {new Date(note.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {showParticipants && !showNotes && (
                <div className="space-y-3">
                  {[
                    { name: 'Marie Tremblay', role: 'Chair', status: 'present' },
                    { name: 'Jean-Pierre Martin', role: 'CFO', status: 'present' },
                    { name: 'Sophie Dubois', role: 'Board Member', status: 'present' },
                    { name: 'François Gagnon', role: 'Board Member', status: 'present' },
                    { name: 'Anne-Marie Roy', role: 'Secretary', status: 'present' },
                  ].map((p, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                      >
                        {p.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'rgb(var(--color-text))' }}>
                          {p.name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                          {p.role}
                        </p>
                      </div>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'rgb(var(--color-success))' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Note input */}
            {showNotes && !showParticipants && (
              <div 
                className="p-4 border-t"
                style={{ borderColor: 'rgb(var(--color-border))' }}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder={isEn ? 'Add a note...' : 'Ajouter une note...'}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                      color: 'rgb(var(--color-text))',
                    }}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="p-2 rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        isEn={isEn}
        meetingTitle={isEn ? 'Board Meeting - Quarterly Financial Review' : 'Réunion CA - Revue financière trimestrielle'}
      />
    </div>
  );
}
