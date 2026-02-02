/**
 * BoardMeetingEmptyState Component
 * 
 * A mobile-first, unified empty state for the Board Meeting page.
 * Combines data readiness checklist with actionable guidance
 * and an integrated Notes panel optimized for all screen sizes.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  FileText,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Presentation,
  Users,
  Send,
  X,
  Sparkles,
  Rocket,
  PlayCircle,
  Layers,
  Building2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useFinancialData } from '../hooks/useFinancialData';
import { useHasRealData } from '../hooks/useHasRealData';
import { useTenant } from '../contexts/TenantContext';
import type { Note } from '../lib/boardMeeting';

interface BoardMeetingEmptyStateProps {
  notes: Note[];
  onAddNote: (content: string) => void;
  onConnect?: () => void;
  onStartMeeting?: () => void;
  onAddSection?: () => void;
}

// Checklist item type
interface ChecklistItem {
  id: string;
  label: { en: string; fr: string };
  description: { en: string; fr: string };
  status: 'complete' | 'partial' | 'missing';
  required: boolean;
  actionLabel: { en: string; fr: string };
  actionLink?: string;
  icon: typeof Link2;
}

export default function BoardMeetingEmptyState({
  notes,
  onAddNote,
  onConnect,
  onStartMeeting,
  onAddSection,
}: BoardMeetingEmptyStateProps) {
  const { language } = useI18n();
  const isEn = language === 'en';
  const { data: financialData } = useFinancialData();
  const { hasRealData, hasQuickBooksConnection } = useHasRealData();
  const { currentTenant } = useTenant();
  
  const [showNotes, setShowNotes] = useState(false);
  const [showChecklist, setShowChecklist] = useState(true);
  const [newNote, setNewNote] = useState('');

  // Compute checklist status
  const dataIsReal = hasRealData || hasQuickBooksConnection;
  const hasAccounts = dataIsReal && (
    (financialData?.accounts?.length > 0) || hasQuickBooksConnection
  );
  const hasTransactions = dataIsReal && (financialData?.trends?.revenue?.data?.length > 0);
  const hasCashData = dataIsReal && (financialData?.summary?.cash?.current > 0);
  const hasBudget = dataIsReal && (financialData?.summary?.hasBudget);

  const checklistItems: ChecklistItem[] = [
    {
      id: 'connection',
      label: { en: 'Connect Accounting Software', fr: 'Connecter le logiciel comptable' },
      description: {
        en: 'Link QuickBooks, Xero, or Sage to sync your financial data',
        fr: 'Liez QuickBooks, Xero ou Sage pour synchroniser vos données financières'
      },
      status: hasQuickBooksConnection ? 'complete' : 'missing',
      required: true,
      actionLabel: { en: 'Connect Now', fr: 'Connecter' },
      actionLink: '/app/connections',
      icon: Link2,
    },
    {
      id: 'accounts',
      label: { en: 'Chart of Accounts', fr: 'Plan comptable' },
      description: {
        en: 'Your account structure syncs automatically',
        fr: 'Votre structure de comptes se synchronise automatiquement'
      },
      status: hasAccounts ? 'complete' : 'missing',
      required: true,
      actionLabel: { en: 'Verify', fr: 'Vérifier' },
      icon: FileText,
    },
    {
      id: 'transactions',
      label: { en: 'Transaction History', fr: 'Historique des transactions' },
      description: {
        en: 'At least 3 months of data for accurate reporting',
        fr: 'Au moins 3 mois de données pour des rapports précis'
      },
      status: hasTransactions && financialData?.trends?.revenue?.data?.length >= 3
        ? 'complete'
        : hasTransactions
          ? 'partial'
          : 'missing',
      required: true,
      actionLabel: { en: 'Sync Data', fr: 'Synchroniser' },
      icon: Calendar,
    },
    {
      id: 'summary',
      label: { en: 'Financial Summary', fr: 'Résumé financier' },
      description: {
        en: 'Key metrics for executive reporting',
        fr: 'Métriques clés pour les rapports exécutifs'
      },
      status: hasCashData && hasTransactions ? 'complete' : 'partial',
      required: true,
      actionLabel: { en: 'View', fr: 'Voir' },
      icon: TrendingUp,
    },
    {
      id: 'budget',
      label: { en: 'Budget Data (Optional)', fr: 'Données budgétaires (Optionnel)' },
      description: {
        en: 'Enable variance analysis with budget comparison',
        fr: 'Activez l\'analyse des écarts avec comparaison budgétaire'
      },
      status: hasBudget ? 'complete' : 'missing',
      required: false,
      actionLabel: { en: 'Set Up', fr: 'Configurer' },
      icon: Target,
    },
  ];

  const completedCount = checklistItems.filter(i => i.status === 'complete').length;
  const requiredCount = checklistItems.filter(i => i.required).length;
  const requiredCompletedCount = checklistItems.filter(i => i.required && i.status === 'complete').length;
  const progress = (completedCount / checklistItems.length) * 100;
  const isReady = requiredCompletedCount === requiredCount;

  const getStatusIcon = (status: ChecklistItem['status'], size = 'w-5 h-5') => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className={size} style={{ color: 'rgb(var(--color-success))' }} />;
      case 'partial':
        return <AlertCircle className={size} style={{ color: 'rgb(var(--color-warning))' }} />;
      case 'missing':
        return <XCircle className={size} style={{ color: 'rgb(var(--color-text-muted))' }} />;
    }
  };

  const handleSubmitNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  const isLargeOrg = currentTenant?.plan === 'enterprise' || currentTenant?.plan === 'professional';

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 h-full overflow-auto">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Hero Empty State Card */}
        <div 
          className="rounded-2xl p-6 sm:p-8 lg:p-10 text-center lg:text-left"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Icon/Illustration */}
            <div 
              className="w-20 h-20 mx-auto lg:mx-0 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Presentation className="w-10 h-10" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn 
                  ? 'Prepare Your Board Meeting' 
                  : 'Préparez votre réunion du conseil'}
              </h2>
              <p className="text-sm sm:text-base mb-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Connect your accounting software to automatically generate professional financial reports and presentations for your board.'
                  : 'Connectez votre logiciel comptable pour générer automatiquement des rapports financiers professionnels et des présentations pour votre conseil.'}
              </p>
              
              {/* Progress Summary */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-24 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
                  >
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: isReady 
                          ? 'rgb(var(--color-success))' 
                          : 'rgb(var(--color-warning))',
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {completedCount}/{checklistItems.length}
                  </span>
                </div>
                
                {!isReady && (
                  <span 
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                      color: 'rgb(var(--color-warning))',
                    }}
                  >
                    {requiredCount - requiredCompletedCount} {isEn ? 'steps remaining' : 'étapes restantes'}
                  </span>
                )}
              </div>
            </div>

            {/* CTA Button - Desktop */}
            <div className="hidden lg:block flex-shrink-0">
              {!hasQuickBooksConnection ? (
                <Link
                  to="/app/connections"
                  onClick={onConnect}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                >
                  <Rocket className="w-5 h-5" />
                  {isEn ? 'Get Started' : 'Commencer'}
                </Link>
              ) : isReady ? (
                <button
                  onClick={onStartMeeting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'rgb(var(--color-success))' }}
                >
                  <PlayCircle className="w-5 h-5" />
                  {isEn ? 'Start Meeting' : 'Démarrer'}
                </button>
              ) : (
                <button
                  onClick={onAddSection}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
                  style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
                >
                  <Layers className="w-5 h-5" />
                  {isEn ? 'Add Sections' : 'Ajouter sections'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile CTA Button */}
          <div className="lg:hidden mt-6">
            {!hasQuickBooksConnection ? (
              <Link
                to="/app/connections"
                onClick={onConnect}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              >
                <Rocket className="w-5 h-5" />
                {isEn ? 'Connect Accounting Software' : 'Connecter un logiciel comptable'}
              </Link>
            ) : isReady ? (
              <button
                onClick={onStartMeeting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all"
                style={{ backgroundColor: 'rgb(var(--color-success))' }}
              >
                <PlayCircle className="w-5 h-5" />
                {isEn ? 'Start Meeting' : 'Démarrer la réunion'}
              </button>
            ) : (
              <button
                onClick={onAddSection}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all"
                style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
              >
                <Layers className="w-5 h-5" />
                {isEn ? 'Add Sections' : 'Ajouter des sections'}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Data Readiness Checklist */}
        <div 
          className="rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {/* Header - Always visible */}
          <button
            onClick={() => setShowChecklist(!showChecklist)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgb(var(--color-bg-muted)/0.5)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
              >
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? 'Data Preparation' : 'Préparation des données'}
                </h3>
                <p className="text-xs sm:text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isReady 
                    ? (isEn ? 'All set! Ready to present' : 'Tout est prêt!')
                    : (isEn 
                        ? `${requiredCount - requiredCompletedCount} required items missing` 
                        : `${requiredCount - requiredCompletedCount} éléments requis manquants`)}
                </p>
              </div>
            </div>
            {showChecklist ? (
              <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            ) : (
              <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
          </button>

          {/* Checklist Items */}
          {showChecklist && (
            <div className="px-4 pb-4 space-y-2">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                    style={{ 
                      backgroundColor: item.status === 'complete' 
                        ? 'rgb(var(--color-success) / 0.05)' 
                        : 'rgb(var(--color-bg-muted))',
                    }}
                  >
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(item.status)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                        <span className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                          {isEn ? item.label.en : item.label.fr}
                        </span>
                        {item.required && item.status !== 'complete' && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: 'rgb(var(--color-error) / 0.1)',
                              color: 'rgb(var(--color-error))',
                            }}
                          >
                            {isEn ? 'Required' : 'Requis'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {isEn ? item.description.en : item.description.fr}
                      </p>
                    </div>

                    {/* Action Button */}
                    {item.status !== 'complete' && item.actionLink && (
                      <Link
                        to={item.actionLink}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={{ 
                          backgroundColor: item.id === 'connection' 
                            ? 'rgb(var(--color-primary-500))' 
                            : 'rgb(var(--color-primary-500) / 0.1)',
                          color: item.id === 'connection' 
                            ? 'white' 
                            : 'rgb(var(--color-primary-600))',
                        }}
                      >
                        {isEn ? item.actionLabel.en : item.actionLabel.fr}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pro Tip for Large Organizations */}
        {isLargeOrg && !hasQuickBooksConnection && (
          <div 
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ 
              backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
              border: '1px solid rgb(var(--color-primary-500) / 0.2)',
            }}
          >
            <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Enterprise Feature' : 'Fonctionnalité Enterprise'}
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Multi-entity consolidation and automated board packages are available with your plan. Connect your accounting software to unlock these features.'
                  : 'La consolidation multi-entités et les packages automatisés pour le conseil sont disponibles avec votre plan. Connectez votre logiciel comptable pour débloquer ces fonctionnalités.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes Panel - Sidebar on desktop, collapsible on mobile */}
      <div className="lg:w-80 flex-shrink-0">
        {/* Mobile: Collapsible Notes */}
        <div className="lg:hidden">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-2"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Meeting Notes' : 'Notes de réunion'}
              </span>
              {notes.length > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-primary-500))',
                    color: 'white',
                  }}
                >
                  {notes.length}
                </span>
              )}
            </div>
            {showNotes ? (
              <ChevronUp className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
            )}
          </button>
          
          {showNotes && (
            <NotesContent
              notes={notes}
              newNote={newNote}
              setNewNote={setNewNote}
              onSubmit={handleSubmitNote}
              isEn={isEn}
            />
          )}
        </div>

        {/* Desktop: Always visible sidebar */}
        <div 
          className="hidden lg:flex flex-col h-full rounded-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))',
          }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <button className="flex-1 px-4 py-3 text-sm font-medium border-b-2 border-primary-500" style={{ color: 'rgb(var(--color-primary-600))' }}>
              <FileText className="w-4 h-4 inline mr-2" />
              Notes
            </button>
            <button className="flex-1 px-4 py-3 text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>
              <Users className="w-4 h-4 inline mr-2" />
              {isEn ? 'Team' : 'Équipe'}
            </button>
          </div>

          <NotesContent
            notes={notes}
            newNote={newNote}
            setNewNote={setNewNote}
            onSubmit={handleSubmitNote}
            isEn={isEn}
          />
        </div>
      </div>
    </div>
  );
}

// Extracted Notes content for reuse
function NotesContent({
  notes,
  newNote,
  setNewNote,
  onSubmit,
  isEn,
}: {
  notes: Note[];
  newNote: string;
  setNewNote: (v: string) => void;
  onSubmit: () => void;
  isEn: boolean;
}) {
  return (
    <div 
      className="flex flex-col rounded-xl lg:rounded-none lg:flex-1 overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[300px] lg:max-h-none">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText 
              className="w-12 h-12 mx-auto mb-3 opacity-30" 
              style={{ color: 'rgb(var(--color-text-muted))' }} 
            />
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'No notes yet' : 'Aucune note'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn 
                ? 'Add notes before or during the meeting' 
                : 'Ajoutez des notes avant ou pendant la réunion'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div 
                key={note.id}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  {note.content}
                </p>
                <p className="text-xs mt-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {note.author} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Input */}
      <div 
        className="p-4 border-t"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder={isEn ? 'Add a note...' : 'Ajouter une note...'}
            className="flex-1 px-3 py-2 rounded-xl border text-sm"
            style={{ 
              backgroundColor: 'rgb(var(--color-bg-muted))',
              borderColor: 'rgb(var(--color-border))',
              color: 'rgb(var(--color-text))',
            }}
          />
          <button
            onClick={onSubmit}
            disabled={!newNote.trim()}
            className="p-2 rounded-xl disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))', color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
