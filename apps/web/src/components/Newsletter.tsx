import { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { 
  Mail, 
  CheckCircle, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Coffee,
  BookOpen,
  ArrowRight,
  Loader2,
} from 'lucide-react';

// Newsletter brand: "Off Balance" - A newsletter that's anything but boring
// Tagline: "Accounting insights that won't put you to sleep"

interface NewsletterSignupProps {
  variant?: 'inline' | 'full' | 'minimal';
  className?: string;
}

export function NewsletterSignup({ variant = 'inline', className = '' }: NewsletterSignupProps) {
  const { language } = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const isEn = language === 'en';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('loading');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStatus('success');
    setEmail('');
  };

  if (variant === 'minimal') {
    return (
      <div className={className}>
        {status === 'success' ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-success))' }}>
            <CheckCircle className="w-4 h-4" />
            {isEn ? "You're in! Check your inbox." : 'Inscrit! Vérifiez votre boîte.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
              className="px-4 py-2 rounded-full text-sm flex-1 min-w-0"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))'
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap"
              style={{ 
                backgroundColor: 'rgb(var(--color-text))',
                color: 'rgb(var(--color-bg))'
              }}
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isEn ? 'Subscribe' : "S'abonner"
              )}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`py-20 sm:py-32 px-6 ${className}`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ 
                backgroundColor: 'rgb(var(--color-warning) / 0.1)',
                color: 'rgb(var(--color-warning-dark))'
              }}
            >
              <Coffee className="w-4 h-4" />
              {isEn ? 'Free newsletter' : 'Infolettre gratuite'}
            </div>
            
            <h2 
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
            </h2>
            
            <p 
              className="text-lg max-w-xl mx-auto"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
            >
              {isEn 
                ? "Accounting insights that won't put you to sleep. Real talk about anomalies, automation, and surviving month-end."
                : "Des insights comptables qui ne vous endormiront pas. Discussions franches sur les anomalies, l'automatisation et la survie des fins de mois."}
            </p>
          </div>

          {/* What you get */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              {
                icon: AlertTriangle,
                titleEn: 'Anomaly of the Week',
                titleFr: 'Anomalie de la semaine',
                descEn: 'Real catches, real lessons',
                descFr: 'Vraies erreurs, vraies leçons',
              },
              {
                icon: TrendingUp,
                titleEn: 'Industry Trends',
                titleFr: 'Tendances du secteur',
                descEn: 'Without the corporate speak',
                descFr: 'Sans le jargon corporatif',
              },
              {
                icon: Zap,
                titleEn: 'Tech Tips',
                titleFr: 'Astuces tech',
                descEn: 'Actually useful stuff',
                descFr: 'Des trucs vraiment utiles',
              },
              {
                icon: BookOpen,
                titleEn: 'CPA Corner',
                titleFr: 'Coin CPA',
                descEn: 'Expert takes & hot takes',
                descFr: 'Opinions d\'experts',
              },
            ].map((item) => (
              <div 
                key={item.titleEn}
                className="p-4 rounded-xl text-center"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                <item.icon 
                  className="w-6 h-6 mx-auto mb-2" 
                  style={{ color: 'rgb(var(--color-primary-600))' }} 
                />
                <h3 className="font-medium text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? item.titleEn : item.titleFr}
                </h3>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? item.descEn : item.descFr}
                </p>
              </div>
            ))}
          </div>

          {/* Signup Form */}
          <div 
            className="p-8 rounded-2xl text-center"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            {status === 'success' ? (
              <div className="py-8">
                <CheckCircle 
                  className="w-12 h-12 mx-auto mb-4" 
                  style={{ color: 'rgb(var(--color-success))' }} 
                />
                <h3 className="text-xl font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? "You're on the list!" : 'Vous êtes inscrit!'}
                </h3>
                <p style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn 
                    ? "Check your inbox. First issue drops every Thursday."
                    : "Vérifiez votre boîte. Première édition chaque jeudi."}
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isEn ? 'Enter your email' : 'Entrez votre courriel'}
                    required
                    className="flex-1 px-5 py-3 rounded-full text-center sm:text-left"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-bg-muted))',
                      color: 'rgb(var(--color-text))',
                      border: '1px solid rgb(var(--color-border))'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-6 py-3 rounded-full font-medium inline-flex items-center justify-center gap-2 transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'rgb(var(--color-text))',
                      color: 'rgb(var(--color-bg))'
                    }}
                  >
                    {status === 'loading' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {isEn ? 'Subscribe' : "S'abonner"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                <p className="text-xs mt-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn 
                    ? 'Every Thursday · 5-minute read · Unsubscribe anytime'
                    : 'Chaque jeudi · 5 minutes de lecture · Désabonnement facile'}
                </p>
              </>
            )}
          </div>

          {/* Social proof */}
          <p className="text-center text-sm mt-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {isEn 
              ? 'Join 500+ CPAs and finance pros who read us weekly'
              : 'Rejoignez 500+ CPA et professionnels de la finance'}
          </p>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div 
      className={`p-6 rounded-2xl ${className}`}
      style={{ backgroundColor: 'rgb(var(--color-surface))' }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgb(var(--color-warning) / 0.1)' }}
        >
          <Mail className="w-5 h-5" style={{ color: 'rgb(var(--color-warning-dark))' }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1" style={{ color: 'rgb(var(--color-text))' }}>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
          </h3>
          <p className="text-sm mb-3" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {isEn 
              ? "Weekly accounting insights that won't bore you."
              : "Insights comptables hebdomadaires qui ne vous ennuieront pas."}
          </p>
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--color-success))' }}>
              <CheckCircle className="w-4 h-4" />
              {isEn ? "You're in!" : 'Inscrit!'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isEn ? 'your@email.com' : 'votre@courriel.com'}
                className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-muted))',
                  color: 'rgb(var(--color-text))',
                  border: '1px solid rgb(var(--color-border))'
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ 
                  backgroundColor: 'rgb(var(--color-text))',
                  color: 'rgb(var(--color-bg))'
                }}
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isEn ? 'Join' : 'Joindre'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Sample newsletter content preview
export function NewsletterPreview() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const sampleIssue = {
    number: 47,
    date: 'Jan 23, 2026',
    titleEn: "The $50K Duplicate Nobody Caught (Until AI Did)",
    titleFr: "Le doublon de 50K$ que personne n'a vu (sauf l'IA)",
    snippetEn: "A Montreal firm discovered their AP system had been paying the same vendor twice for 8 months. Here's how it happened, why their audit missed it, and the 3-minute check that would have caught it...",
    snippetFr: "Une firme montréalaise a découvert que son système AP payait le même fournisseur deux fois depuis 8 mois. Voici comment c'est arrivé, pourquoi leur audit l'a manqué, et la vérification de 3 minutes qui l'aurait détecté...",
  };

  return (
    <div 
      className="rounded-2xl overflow-hidden"
      style={{ 
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid rgb(var(--color-border))'
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4 border-b"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
            </span>
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: 'rgb(var(--color-primary-100))',
                color: 'rgb(var(--color-primary-700))'
              }}
            >
              #{sampleIssue.number}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {sampleIssue.date}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 
          className="text-lg font-semibold mb-3 leading-tight"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? sampleIssue.titleEn : sampleIssue.titleFr}
        </h3>
        <p 
          className="text-sm leading-relaxed mb-4"
          style={{ color: 'rgb(var(--color-text-secondary))' }}
        >
          {isEn ? sampleIssue.snippetEn : sampleIssue.snippetFr}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {['Anomaly', 'AP', 'Case Study'].map(tag => (
            <span 
              key={tag}
              className="text-xs px-2 py-1 rounded"
              style={{ 
                backgroundColor: 'rgb(var(--color-bg-muted))',
                color: 'rgb(var(--color-text-muted))'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div 
        className="px-6 py-3 border-t flex items-center justify-between"
        style={{ 
          borderColor: 'rgb(var(--color-border))',
          backgroundColor: 'rgb(var(--color-bg-subtle))'
        }}
      >
        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {isEn ? '5 min read' : '5 min de lecture'}
        </span>
        <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
          {isEn ? 'Read full issue →' : 'Lire l\'édition complète →'}
        </span>
      </div>
    </div>
  );
}

// Archive list of past issues
export function NewsletterArchive() {
  const { language } = useI18n();
  const isEn = language === 'en';

  const issues = [
    {
      number: 47,
      date: '2026-01-23',
      titleEn: "The $50K Duplicate Nobody Caught",
      titleFr: "Le doublon de 50K$ que personne n'a vu",
      category: 'anomaly',
    },
    {
      number: 46,
      date: '2026-01-16',
      titleEn: "Why Your Month-End Takes 3 Days Too Long",
      titleFr: "Pourquoi votre fin de mois prend 3 jours de trop",
      category: 'efficiency',
    },
    {
      number: 45,
      date: '2026-01-09',
      titleEn: "2026 CPA Tech Predictions (No Buzzwords)",
      titleFr: "Prédictions tech CPA 2026 (sans buzzwords)",
      category: 'trends',
    },
    {
      number: 44,
      date: '2026-01-02',
      titleEn: "The Reconciliation Checklist That Saved Q4",
      titleFr: "La liste de réconciliation qui a sauvé Q4",
      category: 'tips',
    },
  ];

  const categoryColors: Record<string, { bg: string; text: string }> = {
    anomaly: { bg: 'rgb(var(--color-error) / 0.1)', text: 'rgb(var(--color-error))' },
    efficiency: { bg: 'rgb(var(--color-success) / 0.1)', text: 'rgb(var(--color-success))' },
    trends: { bg: 'rgb(var(--color-info) / 0.1)', text: 'rgb(var(--color-info))' },
    tips: { bg: 'rgb(var(--color-warning) / 0.1)', text: 'rgb(var(--color-warning-dark))' },
  };

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <a
          key={issue.number}
          href={`#issue-${issue.number}`}
          className="block p-4 rounded-xl transition-all hover:scale-[1.01]"
          style={{ 
            backgroundColor: 'rgb(var(--color-surface))',
            border: '1px solid rgb(var(--color-border))'
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-xs font-medium"
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  #{issue.number}
                </span>
                <span 
                  className="text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{ 
                    backgroundColor: categoryColors[issue.category].bg,
                    color: categoryColors[issue.category].text
                  }}
                >
                  {issue.category}
                </span>
              </div>
              <h4 
                className="font-medium truncate"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? issue.titleEn : issue.titleFr}
              </h4>
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {new Date(issue.date).toLocaleDateString(isEn ? 'en-US' : 'fr-CA', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

export default NewsletterSignup;
