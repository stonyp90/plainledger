/**
 * Security & Compliance Page
 *
 * Public page showing PlainLedger's security posture and compliance status.
 * Required for enterprise sales and SOC 2.
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../lib/i18n';
import PublicHeader from '../components/PublicHeader';
import ComplianceRoadmap from '../components/ComplianceRoadmap';
import SEOHead from '../components/SEOHead';
import {
  Shield,
  Lock,
  Server,
  Eye,
  FileText,
  Users,
  AlertTriangle,
  Mail,
  ExternalLink,
  ArrowLeft,
  Check,
} from 'lucide-react';

// Primary color
const primaryColor = '#059669';

// Security measures
const SECURITY_MEASURES = [
  {
    icon: Lock,
    title: { en: 'Encryption', fr: 'Chiffrement' },
    items: [
      { en: 'AES-256 encryption at rest', fr: 'Chiffrement AES-256 au repos' },
      { en: 'TLS 1.3 encryption in transit', fr: 'Chiffrement TLS 1.3 en transit' },
      { en: 'Encrypted database backups', fr: 'Sauvegardes de base de données chiffrées' },
      { en: 'Secure key management (AWS KMS)', fr: 'Gestion sécurisée des clés (AWS KMS)' },
    ],
  },
  {
    icon: Users,
    title: { en: 'Access Control', fr: 'Contrôle d\'accès' },
    items: [
      { en: 'Multi-factor authentication (MFA)', fr: 'Authentification multi-facteurs (MFA)' },
      { en: 'Role-based access control (RBAC)', fr: 'Contrôle d\'accès basé sur les rôles (RBAC)' },
      { en: 'Session management and timeout', fr: 'Gestion des sessions et expiration' },
      { en: 'IP allowlisting (Enterprise)', fr: 'Liste blanche IP (Entreprise)' },
    ],
  },
  {
    icon: Server,
    title: { en: 'Infrastructure', fr: 'Infrastructure' },
    items: [
      { en: 'AWS Canada region (ca-central-1)', fr: 'Région AWS Canada (ca-central-1)' },
      { en: 'VPC isolation and security groups', fr: 'Isolation VPC et groupes de sécurité' },
      { en: 'Automated patching and updates', fr: 'Correctifs et mises à jour automatiques' },
      { en: 'DDoS protection (AWS Shield)', fr: 'Protection DDoS (AWS Shield)' },
    ],
  },
  {
    icon: Eye,
    title: { en: 'Monitoring & Logging', fr: 'Surveillance et journalisation' },
    items: [
      { en: 'Real-time security monitoring', fr: 'Surveillance de sécurité en temps réel' },
      { en: 'Comprehensive audit logging', fr: 'Journalisation d\'audit complète' },
      { en: 'Anomaly detection alerts', fr: 'Alertes de détection d\'anomalies' },
      { en: '7-year log retention', fr: 'Conservation des journaux sur 7 ans' },
    ],
  },
];

// Privacy officer info
const PRIVACY_OFFICER = {
  title: { en: 'Privacy Officer', fr: 'Responsable de la protection des renseignements personnels' },
  email: 'privacy@plainledger.ca',
  description: {
    en: 'For privacy-related inquiries, data access requests, or to report a concern.',
    fr: 'Pour les demandes liées à la vie privée, les demandes d\'accès aux données ou pour signaler une préoccupation.',
  },
};

export default function Security() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* SEO */}
      <SEOHead 
        title={{
          en: 'Security & Compliance | PlainLedger - SOC 2, PIPEDA, Law 25',
          fr: 'Sécurité et conformité | PlainLedger - SOC 2, PIPEDA, Loi 25',
        }}
        description={{
          en: 'PlainLedger security practices, compliance certifications, and data protection. PIPEDA compliant, Quebec Law 25 compliant, SOC 2 in progress. Data stored in Canada.',
          fr: 'Pratiques de sécurité PlainLedger, certifications de conformité et protection des données. Conforme PIPEDA, conforme Loi 25, SOC 2 en cours. Données stockées au Canada.',
        }}
        canonicalPath="/security"
      />

      {/* Header - Using shared PublicHeader */}
      <PublicHeader minimal />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm hover:underline transition-colors mb-8"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          {isEn ? 'Back to Home' : 'Retour à l\'accueil'}
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div 
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            <Shield className="w-8 h-8" style={{ color: primaryColor }} />
          </div>
          <h1 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Security & Compliance' : 'Sécurité et conformité'}
          </h1>
          <p 
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'rgb(var(--color-text-secondary))' }}
          >
            {isEn 
              ? 'Your financial data deserves enterprise-grade security. Here\'s how we protect it.'
              : 'Vos données financières méritent une sécurité de niveau entreprise. Voici comment nous les protégeons.'}
          </p>
        </motion.div>

        {/* Compliance Roadmap */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <ComplianceRoadmap variant="full" />
        </motion.section>

        {/* Security Measures */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 
            className="text-2xl font-bold mb-8"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Security Measures' : 'Mesures de sécurité'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECURITY_MEASURES.map((measure, index) => {
              const Icon = measure.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl"
                  style={{ 
                    backgroundColor: 'rgb(var(--color-surface))',
                    border: '1px solid rgb(var(--color-border))',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: primaryColor }} />
                    </div>
                    <h3 
                      className="font-semibold"
                      style={{ color: 'rgb(var(--color-text))' }}
                    >
                      {isEn ? measure.title.en : measure.title.fr}
                    </h3>
                  </div>
                  
                  <ul className="space-y-2">
                    {measure.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                        <span 
                          className="text-sm"
                          style={{ color: 'rgb(var(--color-text-secondary))' }}
                        >
                          {isEn ? item.en : item.fr}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Privacy Officer */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div 
            className="p-8 rounded-2xl"
            style={{ 
              backgroundColor: `${primaryColor}05`,
              border: `1px solid ${primaryColor}20`,
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="p-3 rounded-xl flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Users className="w-6 h-6" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 
                  className="text-lg font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? PRIVACY_OFFICER.title.en : PRIVACY_OFFICER.title.fr}
                </h3>
                <p 
                  className="text-sm mb-4"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn ? PRIVACY_OFFICER.description.en : PRIVACY_OFFICER.description.fr}
                </p>
                <a 
                  href={`mailto:${PRIVACY_OFFICER.email}`}
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: primaryColor }}
                >
                  <Mail className="w-4 h-4" />
                  {PRIVACY_OFFICER.email}
                </a>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Incident Response */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 
            className="text-2xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Incident Response' : 'Réponse aux incidents'}
          </h2>
          
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              backgroundColor: 'rgb(var(--color-surface))',
              border: '1px solid rgb(var(--color-border))',
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div 
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-warning-100))' }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning-600))' }} />
              </div>
              <div>
                <h3 
                  className="font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? 'Security Incident Reporting' : 'Signalement d\'incidents de sécurité'}
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}
                >
                  {isEn 
                    ? 'If you discover a security vulnerability or suspect unauthorized access, please report it immediately to our security team.'
                    : 'Si vous découvrez une vulnérabilité de sécurité ou soupçonnez un accès non autorisé, veuillez le signaler immédiatement à notre équipe de sécurité.'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a 
                href="mailto:security@plainledger.ca"
                className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-bg-subtle))',
                }}
              >
                <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Security Team' : 'Équipe de sécurité'}
                  </p>
                  <p className="text-xs" style={{ color: primaryColor }}>
                    security@plainledger.ca
                  </p>
                </div>
              </a>
              
              <div 
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ backgroundColor: 'rgb(var(--color-bg-subtle))' }}
              >
                <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                    {isEn ? 'Notification Timeline' : 'Délai de notification'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {isEn ? '72 hours (Law 25 compliant)' : '72 heures (conforme Loi 25)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Documents */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 
            className="text-2xl font-bold mb-6"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? 'Legal Documents' : 'Documents juridiques'}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { 
                title: { en: 'Privacy Policy', fr: 'Politique de confidentialité' },
                link: '/privacy',
              },
              { 
                title: { en: 'Terms of Service', fr: 'Conditions d\'utilisation' },
                link: '/terms',
              },
              { 
                title: { en: 'Data Processing Agreement', fr: 'Accord de traitement des données' },
                link: '/dpa',
              },
            ].map((doc, index) => (
              <Link
                key={index}
                to={doc.link}
                className="flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: 'rgb(var(--color-surface))',
                  border: '1px solid rgb(var(--color-border))',
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: primaryColor }} />
                  <span 
                    className="text-sm font-medium"
                    style={{ color: 'rgb(var(--color-text))' }}
                  >
                    {isEn ? doc.title.en : doc.title.fr}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
              </Link>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer 
        className="py-8 px-4 sm:px-6 border-t mt-16"
        style={{ borderColor: `${primaryColor}1a` }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            © 2026 PlainLedger 🇨🇦
          </p>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Link to="/privacy" className="hover:underline">{isEn ? 'Privacy' : 'Confidentialité'}</Link>
            <Link to="/terms" className="hover:underline">{isEn ? 'Terms' : 'Conditions'}</Link>
            <Link to="/" className="hover:underline">{isEn ? 'Home' : 'Accueil'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
