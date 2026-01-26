import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { LanguageToggle, useI18n } from '../lib/i18n';
import { NewsletterSignup, NewsletterArchive, NewsletterPreview } from '../components/Newsletter';
import { 
  ArrowLeft,
  Coffee,
  Users,
  Clock,
  Mail,
} from 'lucide-react';

export default function NewsletterPage() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b" style={{ 
        backgroundColor: 'rgb(var(--color-bg-subtle))',
        borderColor: 'rgb(var(--color-border))'
      }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {isEn ? 'Back to PlainLedger' : 'Retour à PlainLedger'}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{ 
              backgroundColor: 'rgb(var(--color-warning) / 0.1)',
              color: 'rgb(var(--color-warning-dark))'
            }}
          >
            <Coffee className="w-4 h-4" />
            {isEn ? 'The newsletter for CPAs who hate boring content' : 'L\'infolettre pour les CPA qui détestent le contenu ennuyeux'}
          </div>
          
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance
          </h1>
          
          <p 
            className="text-xl max-w-2xl mx-auto mb-8"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? "Real accounting stories. Actual anomalies caught. Zero corporate speak. Every Thursday in your inbox."
              : "Vraies histoires comptables. Vraies anomalies détectées. Zéro jargon corporatif. Chaque jeudi dans votre boîte."}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {[
              { icon: Users, value: '500+', labelEn: 'Subscribers', labelFr: 'Abonnés' },
              { icon: Clock, value: '5 min', labelEn: 'Read time', labelFr: 'Temps de lecture' },
              { icon: Mail, value: '47', labelEn: 'Issues sent', labelFr: 'Éditions envoyées' },
            ].map((stat) => (
              <div key={stat.labelEn} className="flex items-center gap-2">
                <stat.icon className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {stat.value}
                </span>
                <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {isEn ? stat.labelEn : stat.labelFr}
                </span>
              </div>
            ))}
          </div>

          {/* Signup Form */}
          <div 
            className="max-w-md mx-auto p-6 rounded-2xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <NewsletterSignup variant="minimal" />
            <p className="text-xs mt-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Unsubscribe anytime. We respect your inbox.' : 'Désabonnez-vous quand vous voulez. On respecte votre boîte.'}
            </p>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? "What's inside every issue" : "Ce que contient chaque édition"}
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                titleEn: '🔍 Anomaly of the Week',
                titleFr: '🔍 Anomalie de la semaine',
                descEn: 'Real cases of accounting errors caught by AI and humans. Names changed, lessons learned, careers saved.',
                descFr: 'Vrais cas d\'erreurs comptables détectées par l\'IA et les humains. Noms changés, leçons apprises, carrières sauvées.',
              },
              {
                titleEn: '⚡ Tech That Actually Helps',
                titleFr: '⚡ Tech qui aide vraiment',
                descEn: 'No "AI will replace accountants" takes. Just tools and automations that make your life easier.',
                descFr: 'Pas de "l\'IA va remplacer les comptables". Juste des outils et automatisations qui vous facilitent la vie.',
              },
              {
                titleEn: '📊 Numbers That Matter',
                titleFr: '📊 Chiffres qui comptent',
                descEn: 'Industry benchmarks, salary data, and trends. The stuff you actually want to know but nobody talks about.',
                descFr: 'Benchmarks de l\'industrie, données salariales et tendances. Ce que vous voulez vraiment savoir mais personne n\'en parle.',
              },
              {
                titleEn: '💬 CPA Corner',
                titleFr: '💬 Coin CPA',
                descEn: 'Hot takes, unpopular opinions, and honest conversations about the profession. Sometimes spicy.',
                descFr: 'Opinions franches, positions impopulaires et conversations honnêtes sur la profession. Parfois épicé.',
              },
            ].map((item) => (
              <div 
                key={item.titleEn}
                className="p-6 rounded-2xl"
                style={{ backgroundColor: 'rgb(var(--color-surface))' }}
              >
                <h3 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn ? item.titleEn : item.titleFr}
                </h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {isEn ? item.descEn : item.descFr}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Issue Preview */}
      <section 
        className="py-16 px-6"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Latest issue' : 'Dernière édition'}
          </h2>
          
          <div className="max-w-xl mx-auto">
            <NewsletterPreview />
          </div>
        </div>
      </section>

      {/* Archive */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Past issues' : 'Éditions passées'}
          </h2>
          
          <NewsletterArchive />
          
          <p 
            className="text-center text-sm mt-6"
            style={{ color: 'rgb(var(--color-text-muted))' }}
          >
            {isEn ? 'Subscribe to get access to the full archive' : 'Abonnez-vous pour accéder aux archives complètes'}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section 
        className="py-16 px-6"
        style={{ backgroundColor: 'rgb(var(--color-bg))' }}
      >
        <div className="max-w-md mx-auto text-center">
          <h2 
            className="text-2xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? "Don't miss the next one" : 'Ne manquez pas la prochaine'}
          </h2>
          <p 
            className="text-sm mb-6"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Join 500+ CPAs and finance pros who look forward to Thursdays.'
              : 'Rejoignez 500+ CPA et pros de la finance qui attendent les jeudis avec impatience.'}
          </p>
          
          <div 
            className="p-6 rounded-2xl"
            style={{ backgroundColor: 'rgb(var(--color-surface))' }}
          >
            <NewsletterSignup variant="minimal" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer 
        className="py-8 px-6 border-t"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg" style={{ color: 'rgb(var(--color-text-muted))' }}>▢</span>
            <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>PlainLedger</span>
          </Link>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>Off</span>Balance {isEn ? 'is a' : 'est une'} PlainLedger {isEn ? 'publication' : 'publication'}
          </p>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger
          </p>
        </div>
      </footer>
    </div>
  );
}
