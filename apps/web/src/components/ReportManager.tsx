/**
 * Report Manager Component
 * 
 * UI for managing saved reports:
 * - Create new reports from templates
 * - Save/update reports
 * - Delete reports
 * - Favorite reports
 * - Export reports
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Save,
  Trash2,
  Copy,
  Star,
  StarOff,
  Search,
  MoreVertical,
  FileText,
  Calendar,
  Eye,
  X,
  ChevronRight,
  FolderOpen,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Coins,
  ClipboardList,
  Target,
  PieChart,
  Wallet,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import {
  reportManagementService,
  SavedReport,
  ReportTemplate,
  REPORT_TEMPLATES,
  ReportType,
} from '../lib/reportManagement';

// =====================================================
// SAVE REPORT MODAL
// =====================================================

interface SaveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, nameEn: string, description?: string) => void;
  initialName?: string;
  initialNameEn?: string;
  initialDescription?: string;
  mode: 'create' | 'save' | 'saveAs';
}

export function SaveReportModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialNameEn = '',
  initialDescription = '',
  mode,
}: SaveReportModalProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [name, setName] = useState(initialName);
  const [nameEn, setNameEn] = useState(initialNameEn);
  const [description, setDescription] = useState(initialDescription);
  
  useEffect(() => {
    setName(initialName);
    setNameEn(initialNameEn);
    setDescription(initialDescription);
  }, [initialName, initialNameEn, initialDescription, isOpen]);
  
  if (!isOpen) return null;
  
  const titles = {
    create: { fr: 'Créer un nouveau rapport', en: 'Create New Report' },
    save: { fr: 'Enregistrer le rapport', en: 'Save Report' },
    saveAs: { fr: 'Enregistrer sous...', en: 'Save As...' },
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), nameEn.trim() || name.trim(), description.trim());
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <form onSubmit={handleSubmit}>
          <div 
            className="p-6 border-b"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? titles[mode].en : titles[mode].fr}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-muted"
              >
                <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Report Name' : 'Nom du rapport'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEn ? 'Enter report name...' : 'Entrez le nom du rapport...'}
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-primary-500/20"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
                required
                autoFocus
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'English Name' : 'Nom en anglais'}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={isEn ? 'Enter English name...' : 'Entrez le nom en anglais...'}
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-primary-500/20"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Description' : 'Description'}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? 'Add a description...' : 'Ajoutez une description...'}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border outline-none transition-colors focus:ring-2 focus:ring-primary-500/20 resize-none"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  borderColor: 'rgb(var(--color-border))',
                  color: 'rgb(var(--color-text))',
                }}
              />
            </div>
          </div>
          
          <div 
            className="p-6 border-t flex justify-end gap-3"
            style={{ borderColor: 'rgb(var(--color-border))' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: 'rgb(var(--color-primary-500))',
                color: 'white',
              }}
            >
              <Save className="w-4 h-4" />
              {isEn ? 'Save' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// TEMPLATE SELECTOR
// =====================================================

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: ReportTemplate) => void;
}

// Template type to icon mapping with colors
const templateTypeIcons: Record<ReportType, { icon: LucideIcon; color: string; bgColor: string }> = {
  'financial-overview': { 
    icon: BarChart3, 
    color: 'rgb(var(--color-primary-500))',
    bgColor: 'rgb(var(--color-primary-500) / 0.1)'
  },
  'income-statement': { 
    icon: TrendingUp, 
    color: 'rgb(var(--color-success))',
    bgColor: 'rgb(var(--color-success) / 0.1)'
  },
  'balance-sheet': { 
    icon: PieChart, 
    color: 'rgb(var(--color-info))',
    bgColor: 'rgb(var(--color-info) / 0.1)'
  },
  'cash-flow': { 
    icon: Coins, 
    color: 'rgb(var(--color-warning))',
    bgColor: 'rgb(var(--color-warning) / 0.1)'
  },
  'budget-variance': { 
    icon: Target, 
    color: 'rgb(var(--color-error))',
    bgColor: 'rgb(var(--color-error) / 0.1)'
  },
  'ar-aging': { 
    icon: ClipboardList, 
    color: 'rgb(var(--color-primary-400))',
    bgColor: 'rgb(var(--color-primary-400) / 0.1)'
  },
  'ap-aging': { 
    icon: Wallet, 
    color: 'rgb(var(--color-primary-600))',
    bgColor: 'rgb(var(--color-primary-600) / 0.1)'
  },
  'custom': { 
    icon: FileText, 
    color: 'rgb(var(--color-text-muted))',
    bgColor: 'rgb(var(--color-bg-muted))'
  },
};

// Template Icon Component
function TemplateIcon({ type, size = 'md' }: { type: ReportType; size?: 'sm' | 'md' | 'lg' }) {
  const { icon: IconComponent, color, bgColor } = templateTypeIcons[type] || templateTypeIcons['custom'];
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: bgColor }}
    >
      <IconComponent className={iconSizes[size]} style={{ color }} />
    </div>
  );
}

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const [selectedCategory, setSelectedCategory] = useState<'all' | ReportType>('all');
  
  if (!isOpen) return null;
  
  const categories = [
    { id: 'all', label: isEn ? 'All Templates' : 'Tous les modèles' },
    { id: 'financial-overview', label: isEn ? 'Financial Overview' : 'Aperçu financier' },
    { id: 'income-statement', label: isEn ? 'Income Statement' : 'État des résultats' },
    { id: 'cash-flow', label: isEn ? 'Cash Flow' : 'Flux de trésorerie' },
    { id: 'ar-aging', label: isEn ? 'AR Aging' : 'Vieillissement CR' },
    { id: 'budget-variance', label: isEn ? 'Budget Variance' : 'Écart budgétaire' },
  ];
  
  const filteredTemplates = selectedCategory === 'all' 
    ? REPORT_TEMPLATES 
    : REPORT_TEMPLATES.filter(t => t.type === selectedCategory);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div 
          className="p-6 border-b"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Choose a Template' : 'Choisir un modèle'}
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Start with a pre-built report template'
                  : 'Commencez avec un modèle de rapport pré-construit'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-muted"
            >
              <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          </div>
          
          {/* Category Tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="p-4 rounded-xl text-left transition-all hover:shadow-lg group"
                style={{
                  backgroundColor: 'rgb(var(--color-bg))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-start gap-3">
                  <TemplateIcon type={template.type} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold group-hover:text-primary-500 transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? template.nameEn : template.name}
                    </h3>
                    <p 
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {isEn ? template.descriptionEn : template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                            color: 'rgb(var(--color-primary-600))',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight 
                    className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'rgb(var(--color-primary-500))' }}
                  />
                </div>
              </button>
            ))}
          </div>
          
          {/* Blank Report Option */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button
              onClick={() => onSelect({
                id: 'blank',
                name: 'Rapport vierge',
                nameEn: 'Blank Report',
                description: 'Créez un rapport de zéro',
                descriptionEn: 'Create a report from scratch',
                type: 'custom',
                icon: '📄',
                charts: [],
                defaultFilters: {},
                defaultLayout: {},
                tags: ['custom'],
              })}
              className="w-full p-4 rounded-xl text-left transition-all hover:shadow-lg flex items-center gap-3"
              style={{
                backgroundColor: 'rgb(var(--color-bg-muted))',
                border: '2px dashed rgb(var(--color-border))',
              }}
            >
              <Plus className="w-6 h-6" style={{ color: 'rgb(var(--color-text-muted))' }} />
              <div>
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Blank Report' : 'Rapport vierge'}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? 'Start with an empty canvas' : 'Commencez avec une page vierge'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// DELETE CONFIRMATION MODAL
// =====================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reportName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, reportName }: DeleteConfirmModalProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      
      <div 
        className="relative w-full max-w-sm rounded-2xl overflow-hidden p-6"
        style={{ 
          backgroundColor: 'rgb(var(--color-surface))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div 
          className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgb(var(--color-error) / 0.1)' }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: 'rgb(var(--color-error))' }} />
        </div>
        
        <h2 
          className="text-lg font-semibold text-center mb-2"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? 'Delete Report?' : 'Supprimer le rapport ?'}
        </h2>
        
        <p 
          className="text-sm text-center mb-6"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn 
            ? `Are you sure you want to delete "${reportName}"? This action cannot be undone.`
            : `Êtes-vous sûr de vouloir supprimer « ${reportName} » ? Cette action est irréversible.`}
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-bg-muted))',
              color: 'rgb(var(--color-text-secondary))',
            }}
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: 'rgb(var(--color-error))',
              color: 'white',
            }}
          >
            <Trash2 className="w-4 h-4" />
            {isEn ? 'Delete' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// REPORT CARD
// =====================================================

interface ReportCardProps {
  report: SavedReport;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onExport: (format: 'pdf' | 'excel' | 'json') => void;
  isEn: boolean;
}

function ReportCard({
  report,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onExport,
  isEn,
}: ReportCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const typeColors: Record<ReportType, string> = {
    'financial-overview': 'rgb(var(--color-primary-500))',
    'income-statement': 'rgb(var(--color-success))',
    'balance-sheet': 'rgb(var(--color-info))',
    'cash-flow': 'rgb(var(--color-warning))',
    'budget-variance': 'rgb(var(--color-error))',
    'ar-aging': 'rgb(var(--color-primary-400))',
    'ap-aging': 'rgb(var(--color-primary-600))',
    'custom': 'rgb(var(--color-text-muted))',
  };
  
  return (
    <div 
      className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
      onClick={onOpen}
    >
      {/* Top accent bar */}
      <div 
        className="h-1 w-full"
        style={{ backgroundColor: typeColors[report.type] }}
      />
      
      <div className="p-4">
        {/* Header with icon and favorite */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <TemplateIcon type={report.type} size="lg" />
          <div className="flex items-center gap-2">
            {report.isFavorite && (
              <Star className="w-5 h-5 fill-warning text-warning" />
            )}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <MoreVertical className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div 
                    className="absolute top-full right-0 mt-1 w-48 rounded-xl border shadow-xl z-50 overflow-hidden py-1"
                    style={{
                      backgroundColor: 'rgb(var(--color-surface))',
                      borderColor: 'rgb(var(--color-border))',
                    }}
                  >
                    <button
                      onClick={() => { onOpen(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Eye className="w-4 h-4" />
                      {isEn ? 'Open' : 'Ouvrir'}
                    </button>
                    <button
                      onClick={() => { onToggleFavorite(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {report.isFavorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      {report.isFavorite ? (isEn ? 'Unfavorite' : 'Retirer') : (isEn ? 'Favorite' : 'Favoris')}
                    </button>
                    <button
                      onClick={() => { onDuplicate(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Copy className="w-4 h-4" />
                      {isEn ? 'Duplicate' : 'Dupliquer'}
                    </button>
                    <div className="my-1 border-t" style={{ borderColor: 'rgb(var(--color-border))' }} />
                    <button
                      onClick={() => { onExport('pdf'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      <Download className="w-4 h-4" />
                      {isEn ? 'Export PDF' : 'Exporter PDF'}
                    </button>
                    <div className="my-1 border-t" style={{ borderColor: 'rgb(var(--color-border))' }} />
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                      style={{ color: 'rgb(var(--color-error))' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      {isEn ? 'Delete' : 'Supprimer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h3 
          className="font-bold text-lg mb-1 group-hover:text-primary-500 transition-colors"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? report.nameEn : report.name}
        </h3>
        {report.description && (
          <p 
            className="text-sm line-clamp-2 mb-4"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? report.descriptionEn : report.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <Calendar className="w-3.5 h-3.5" />
            {new Date(report.updatedAt).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}>
            <FileText className="w-3.5 h-3.5" />
            {report.charts.length} {isEn ? 'charts' : 'graph.'}
          </span>
        </div>

        {/* Tags */}
        {report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {report.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500) / 0.1)',
                  color: 'rgb(var(--color-primary-600))',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick action buttons */}
        <div 
          className="mt-4 pt-3 border-t flex items-center justify-between"
          style={{ borderColor: 'rgb(var(--color-border))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onOpen}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            {isEn ? 'Open' : 'Ouvrir'}
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleFavorite()}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              title={report.isFavorite ? (isEn ? 'Remove from favorites' : 'Retirer des favoris') : (isEn ? 'Add to favorites' : 'Favoris')}
            >
              {report.isFavorite 
                ? <Star className="w-4 h-4 fill-warning text-warning" />
                : <Star className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              }
            </button>
            <button
              onClick={() => onExport('pdf')}
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              title={isEn ? 'Download PDF' : 'Télécharger PDF'}
            >
              <Download className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN REPORT MANAGER
// =====================================================

interface ReportManagerProps {
  onOpenReport?: (report: SavedReport) => void;
  onCreateReport?: (template: ReportTemplate, name: string, nameEn: string) => void;
}

export function ReportManager({ onOpenReport, onCreateReport }: ReportManagerProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent'>('all');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null);
  
  // Load reports
  useEffect(() => {
    loadReports();
  }, []);
  
  const loadReports = () => {
    setReports(reportManagementService.getAllReports());
  };
  
  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowSaveModal(true);
  };
  
  const handleSaveNewReport = (name: string, nameEn: string, description?: string) => {
    if (selectedTemplate) {
      const newReport = reportManagementService.createFromTemplate(
        selectedTemplate.id,
        name,
        nameEn
      );
      
      if (newReport && description) {
        reportManagementService.updateReport(newReport.id, { 
          description,
          descriptionEn: description,
        });
      }
      
      loadReports();
      setShowSaveModal(false);
      setSelectedTemplate(null);
      
      if (newReport && onCreateReport) {
        onCreateReport(selectedTemplate, name, nameEn);
      }
    }
  };
  
  const handleDuplicate = (report: SavedReport) => {
    reportManagementService.duplicateReport(report.id);
    loadReports();
  };
  
  const handleDelete = () => {
    if (reportToDelete) {
      reportManagementService.deleteReport(reportToDelete.id);
      loadReports();
      setReportToDelete(null);
    }
  };
  
  const handleToggleFavorite = (report: SavedReport) => {
    reportManagementService.toggleFavorite(report.id);
    loadReports();
  };
  
  const handleExport = (report: SavedReport, format: 'pdf' | 'excel' | 'json') => {
    const blob = reportManagementService.exportReport(report.id, format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  // Filter reports
  const filteredReports = reports.filter(report => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        report.name.toLowerCase().includes(query) ||
        report.nameEn.toLowerCase().includes(query) ||
        report.description?.toLowerCase().includes(query) ||
        report.tags.some(t => t.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    // Type filter
    if (filterType === 'favorites') {
      return report.isFavorite;
    }
    
    return true;
  });
  
  // Sort by updated date
  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
            {isEn ? 'My Reports' : 'Mes rapports'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? `${reports.length} saved reports`
              : `${reports.length} rapports enregistrés`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg))',
              borderColor: 'rgb(var(--color-border))',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search reports...' : 'Rechercher...'}
              className="bg-transparent border-none outline-none text-sm w-40"
              style={{ color: 'rgb(var(--color-text))' }}
            />
          </div>
          
          {/* Filter */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'rgb(var(--color-border))' }}>
            {(['all', 'favorites'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className="px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: filterType === type 
                    ? 'rgb(var(--color-primary-500))'
                    : 'rgb(var(--color-bg))',
                  color: filterType === type 
                    ? 'white'
                    : 'rgb(var(--color-text-secondary))',
                }}
              >
                {type === 'all' 
                  ? (isEn ? 'All' : 'Tous')
                  : (isEn ? 'Favorites' : 'Favoris')}
              </button>
            ))}
          </div>
          
          {/* New Report Button */}
          <button
            onClick={() => setShowTemplateSelector(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--color-primary-500))',
              color: 'white',
            }}
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'New Report' : 'Nouveau rapport'}
          </button>
        </div>
      </div>
      
      {/* Reports Grid */}
      {sortedReports.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {sortedReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isEn={isEn}
              onOpen={() => onOpenReport?.(report)}
              onEdit={() => onOpenReport?.(report)}
              onDuplicate={() => handleDuplicate(report)}
              onDelete={() => {
                setReportToDelete(report);
                setShowDeleteModal(true);
              }}
              onToggleFavorite={() => handleToggleFavorite(report)}
              onExport={(format) => handleExport(report, format)}
            />
          ))}
          
          {/* Quick Add Card - Always visible to fill space */}
          <div
            onClick={() => setShowTemplateSelector(true)}
            className="group cursor-pointer rounded-xl p-6 transition-all duration-200 hover:scale-[1.02] flex flex-col items-center justify-center min-h-[200px]"
            style={{ 
              border: '2px dashed rgb(var(--color-border))',
              backgroundColor: 'rgb(var(--color-bg-muted) / 0.5)',
            }}
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Plus className="w-7 h-7" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h4 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? 'Create New Report' : 'Créer un rapport'}
            </h4>
            <p className="text-xs text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Start from a template' : 'À partir d\'un modèle'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Empty State */}
          <div 
            className="rounded-2xl p-8 text-center lg:text-left flex flex-col justify-center"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.05) 0%, rgb(var(--color-bg-muted)) 100%)',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div 
              className="w-16 h-16 mx-auto lg:mx-0 mb-4 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <FolderOpen className="w-8 h-8" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {searchQuery 
                ? (isEn ? 'No reports found' : 'Aucun rapport trouvé')
                : (isEn ? 'Create Your First Report' : 'Créez votre premier rapport')}
            </h3>
            <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {searchQuery 
                ? (isEn 
                    ? 'Try a different search term'
                    : 'Essayez un autre terme de recherche')
                : (isEn 
                    ? 'Save your customized dashboards as reports. Use templates to get started quickly with pre-configured charts and layouts.'
                    : 'Enregistrez vos tableaux de bord personnalisés. Utilisez des modèles pour démarrer rapidement avec des graphiques préconfigurés.')}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="px-6 py-3 rounded-xl flex items-center gap-2 mx-auto lg:mx-0 text-sm font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: 'rgb(var(--color-primary-500))',
                  color: 'white',
                  boxShadow: '0 4px 14px -4px rgb(var(--color-primary-500) / 0.5)',
                }}
              >
                <Plus className="w-4 h-4" />
                {isEn ? 'Browse Templates' : 'Parcourir les modèles'}
              </button>
            )}
          </div>
          
          {/* Template Quick Access */}
          <div 
            className="rounded-2xl p-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
              <FileText className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-500))' }} />
              {isEn ? 'Popular Templates' : 'Modèles populaires'}
            </h4>
            <div className="space-y-3">
              {REPORT_TEMPLATES.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group"
                  style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                >
                  <TemplateIcon type={template.type} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                      {isEn ? template.nameEn : template.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? template.descriptionEn : template.description}
                    </p>
                  </div>
                  <ChevronRight 
                    className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ color: 'rgb(var(--color-primary-500))' }} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleSelectTemplate}
      />
      
      <SaveReportModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setSelectedTemplate(null);
        }}
        onSave={handleSaveNewReport}
        mode="create"
        initialName={selectedTemplate ? (isEn ? selectedTemplate.nameEn : selectedTemplate.name) : ''}
        initialNameEn={selectedTemplate?.nameEn}
      />
      
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReportToDelete(null);
        }}
        onConfirm={handleDelete}
        reportName={reportToDelete ? (isEn ? reportToDelete.nameEn : reportToDelete.name) : ''}
      />
    </div>
  );
}

export default ReportManager;
