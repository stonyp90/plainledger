/**
 * Privacy Policy Page
 * Privacy policy and data protection information for PlainLedger
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';

export default function PrivacyPolicy() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 group">
          <div 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
              boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
            }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
              <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
              <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M17 21 L20 24 L26 17" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-base sm:text-lg" style={{ color: 'rgb(var(--color-text))' }}>
            PlainLedger
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 sm:space-y-8"
        >
          {/* Back Link */}
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm hover:underline transition-colors"
            style={{ color: 'rgb(var(--color-primary-500))' }}
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            {isEn ? 'Back to Signup' : 'Retour à l\'inscription'}
          </Link>

          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Privacy Policy' : 'Politique de confidentialité'}
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn 
                  ? 'Last updated: January 27, 2026'
                  : 'Dernière mise à jour : 27 janvier 2026'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div 
            className="prose prose-sm sm:prose-base max-w-none"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            {isEn ? (
              <div className="space-y-6 sm:space-y-8">
                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Introduction
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our financial management and accounting software platform ("the Service"). Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    1. Information We Collect
                  </h2>
                  
                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.1 Personal Information
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We collect personal information that you provide directly to us, including:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Name, email address, and contact information</li>
                    <li>Organization name and business information</li>
                    <li>Province or territory of operation</li>
                    <li>Account credentials (passwords are encrypted and never stored in plain text)</li>
                    <li>Payment information (processed securely through third-party payment processors)</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.2 Financial Data
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    When you use the Service, we collect and store financial data that you input or import, including:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Account balances and transactions</li>
                    <li>Financial reports and statements</li>
                    <li>Chart of accounts and accounting data</li>
                    <li>Data imported from integrated third-party services (e.g., QuickBooks, accounting software)</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.3 Usage Information
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We automatically collect certain information about your use of the Service, including:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Log data (IP address, browser type, access times)</li>
                    <li>Device information</li>
                    <li>Usage patterns and feature interactions</li>
                    <li>Error logs and performance data</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    2. How We Use Your Information
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Provide, maintain, and improve the Service</li>
                    <li>Process transactions and manage your account</li>
                    <li>Generate financial reports and analytics</li>
                    <li>Send you service-related communications (account updates, security alerts)</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Detect, prevent, and address technical issues and security threats</li>
                    <li>Comply with legal obligations and enforce our Terms of Service</li>
                    <li>Send you marketing communications (with your consent, which you can opt-out of at any time)</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    3. Data Storage and Security
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We implement industry-standard security measures to protect your information:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Data encryption in transit (TLS/SSL) and at rest</li>
                    <li>Secure authentication and access controls</li>
                    <li>Regular security audits and vulnerability assessments</li>
                    <li>Role-based access controls to limit data access</li>
                    <li>Secure data centers with physical and digital safeguards</li>
                    <li>Regular backups to prevent data loss</li>
                  </ul>
                  <p className="text-sm sm:text-base leading-relaxed mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    4. Data Sharing and Disclosure
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating the Service (e.g., cloud hosting, payment processing, analytics). These providers are contractually obligated to protect your information.</li>
                    <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</li>
                    <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government regulation, or to protect our rights and the safety of our users.</li>
                    <li><strong>With Your Consent:</strong> We may share information with your explicit consent.</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    5. Third-Party Integrations
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    The Service may integrate with third-party services (e.g., QuickBooks, accounting software, payment processors). When you connect these services, they may collect and process your information according to their own privacy policies. We encourage you to review the privacy policies of any third-party services you connect to our Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    6. Your Rights and Choices
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    You have the following rights regarding your personal information:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li><strong>Access:</strong> Request access to your personal information</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal and contractual obligations)</li>
                    <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
                    <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
                    <li><strong>Account Deletion:</strong> Delete your account and associated data through your account settings</li>
                  </ul>
                  <p className="text-sm sm:text-base leading-relaxed mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    To exercise these rights, please contact us at privacy@plainledger.ca.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    7. Data Retention
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We retain your personal information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal or regulatory purposes.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    8. Children's Privacy
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    9. International Data Transfers
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Your information may be transferred to and processed in countries other than your country of residence. We ensure that appropriate safeguards are in place to protect your information in accordance with this Privacy Policy and applicable data protection laws.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    10. Cookies and Tracking Technologies
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and improve the Service. You can control cookie preferences through your browser settings. However, disabling cookies may limit certain features of the Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    11. Changes to This Privacy Policy
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    12. Contact Us
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
                  </p>
                  <p className="text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Email: privacy@plainledger.ca<br />
                    Address: PlainLedger, Canada
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Introduction
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger (« nous », « notre » ou « nos ») s'engage à protéger votre vie privée. Cette Politique de confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations lorsque vous utilisez notre plateforme logicielle de gestion financière et comptable (« le Service »). Veuillez lire attentivement cette Politique de confidentialité. Si vous n'acceptez pas les termes de cette Politique de confidentialité, veuillez ne pas accéder au Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    1. Informations que nous collectons
                  </h2>
                  
                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.1 Informations personnelles
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous collectons les informations personnelles que vous nous fournissez directement, notamment :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Nom, adresse courriel et informations de contact</li>
                    <li>Nom de l'organisation et informations commerciales</li>
                    <li>Province ou territoire d'exploitation</li>
                    <li>Identifiants de compte (les mots de passe sont chiffrés et jamais stockés en texte clair)</li>
                    <li>Informations de paiement (traitées de manière sécurisée par des processeurs de paiement tiers)</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.2 Données financières
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Lorsque vous utilisez le Service, nous collectons et stockons les données financières que vous saisissez ou importez, notamment :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Soldes de compte et transactions</li>
                    <li>Rapports et états financiers</li>
                    <li>Plan comptable et données comptables</li>
                    <li>Données importées depuis des services tiers intégrés (p. ex., QuickBooks, logiciels comptables)</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-medium mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text))' }}>
                    1.3 Informations d'utilisation
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous collectons automatiquement certaines informations sur votre utilisation du Service, notamment :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Données de journal (adresse IP, type de navigateur, heures d'accès)</li>
                    <li>Informations sur l'appareil</li>
                    <li>Modèles d'utilisation et interactions avec les fonctionnalités</li>
                    <li>Journaux d'erreurs et données de performance</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    2. Comment nous utilisons vos informations
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous utilisons les informations que nous collectons pour :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Fournir, maintenir et améliorer le Service</li>
                    <li>Traiter les transactions et gérer votre compte</li>
                    <li>Générer des rapports financiers et des analyses</li>
                    <li>Vous envoyer des communications liées au service (mises à jour de compte, alertes de sécurité)</li>
                    <li>Répondre à vos demandes et fournir un support client</li>
                    <li>Détecter, prévenir et résoudre les problèmes techniques et les menaces de sécurité</li>
                    <li>Respecter les obligations légales et faire respecter nos Conditions d'utilisation</li>
                    <li>Vous envoyer des communications marketing (avec votre consentement, que vous pouvez retirer à tout moment)</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    3. Stockage et sécurité des données
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous mettons en œuvre des mesures de sécurité standard de l'industrie pour protéger vos informations :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Chiffrement des données en transit (TLS/SSL) et au repos</li>
                    <li>Authentification sécurisée et contrôles d'accès</li>
                    <li>Audits de sécurité réguliers et évaluations des vulnérabilités</li>
                    <li>Contrôles d'accès basés sur les rôles pour limiter l'accès aux données</li>
                    <li>Centres de données sécurisés avec des protections physiques et numériques</li>
                    <li>Sauvegardes régulières pour prévenir la perte de données</li>
                  </ul>
                  <p className="text-sm sm:text-base leading-relaxed mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Cependant, aucune méthode de transmission sur Internet ou de stockage électronique n'est sécurisée à 100 %. Bien que nous nous efforcions d'utiliser des moyens commercialement acceptables pour protéger vos informations, nous ne pouvons garantir une sécurité absolue.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    4. Partage et divulgation des données
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous ne vendons, n'échangeons ni ne louons vos informations personnelles à des tiers. Nous ne pouvons partager vos informations que dans les circonstances suivantes :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li><strong>Fournisseurs de services :</strong> Nous pouvons partager des informations avec des fournisseurs de services tiers de confiance qui nous aident à exploiter le Service (p. ex., hébergement cloud, traitement des paiements, analyses). Ces fournisseurs sont contractuellement tenus de protéger vos informations.</li>
                    <li><strong>Transferts d'entreprise :</strong> En cas de fusion, d'acquisition ou de vente d'actifs, vos informations peuvent être transférées à l'entité acquéreuse.</li>
                    <li><strong>Exigences légales :</strong> Nous pouvons divulguer des informations si la loi, une ordonnance judiciaire ou une réglementation gouvernementale l'exige, ou pour protéger nos droits et la sécurité de nos utilisateurs.</li>
                    <li><strong>Avec votre consentement :</strong> Nous pouvons partager des informations avec votre consentement explicite.</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    5. Intégrations tierces
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Le Service peut s'intégrer avec des services tiers (p. ex., QuickBooks, logiciels comptables, processeurs de paiement). Lorsque vous connectez ces services, ils peuvent collecter et traiter vos informations selon leurs propres politiques de confidentialité. Nous vous encourageons à consulter les politiques de confidentialité de tout service tiers que vous connectez à notre Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    6. Vos droits et choix
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Vous avez les droits suivants concernant vos informations personnelles :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li><strong>Accès :</strong> Demander l'accès à vos informations personnelles</li>
                    <li><strong>Correction :</strong> Demander la correction d'informations inexactes ou incomplètes</li>
                    <li><strong>Suppression :</strong> Demander la suppression de vos informations personnelles (sous réserve d'obligations légales et contractuelles)</li>
                    <li><strong>Portabilité des données :</strong> Demander une copie de vos données dans un format portable</li>
                    <li><strong>Désinscription :</strong> Vous désabonner des communications marketing à tout moment</li>
                    <li><strong>Suppression de compte :</strong> Supprimer votre compte et les données associées via les paramètres de votre compte</li>
                  </ul>
                  <p className="text-sm sm:text-base leading-relaxed mt-3 sm:mt-4" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Pour exercer ces droits, veuillez nous contacter à privacy@plainledger.ca.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    7. Conservation des données
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous conservons vos informations personnelles aussi longtemps que nécessaire pour fournir le Service, respecter les obligations légales, résoudre les litiges et faire respecter nos accords. Lorsque vous supprimez votre compte, nous supprimerons ou anonymiserons vos informations personnelles, sauf lorsque nous sommes tenus de les conserver à des fins légales ou réglementaires.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    8. Confidentialité des enfants
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Le Service n'est pas destiné aux personnes de moins de 18 ans. Nous ne collectons pas sciemment d'informations personnelles auprès d'enfants. Si vous croyez que nous avons collecté des informations auprès d'un enfant, veuillez nous contacter immédiatement.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    9. Transferts internationaux de données
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Vos informations peuvent être transférées et traitées dans des pays autres que votre pays de résidence. Nous veillons à ce que des garanties appropriées soient en place pour protéger vos informations conformément à cette Politique de confidentialité et aux lois applicables sur la protection des données.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    10. Cookies et technologies de suivi
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous utilisons des cookies et des technologies de suivi similaires pour améliorer votre expérience, analyser les modèles d'utilisation et améliorer le Service. Vous pouvez contrôler les préférences de cookies via les paramètres de votre navigateur. Cependant, la désactivation des cookies peut limiter certaines fonctionnalités du Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    11. Modifications de cette Politique de confidentialité
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. Nous vous informerons de tout changement important en publiant la nouvelle Politique de confidentialité sur cette page et en mettant à jour la date de « Dernière mise à jour ». Nous vous encourageons à consulter périodiquement cette Politique de confidentialité.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    12. Nous contacter
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Si vous avez des questions ou des préoccupations concernant cette Politique de confidentialité ou nos pratiques en matière de données, veuillez nous contacter à :
                  </p>
                  <p className="text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Courriel : privacy@plainledger.ca<br />
                    Adresse : PlainLedger, Canada
                  </p>
                </section>
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="pt-6 sm:pt-8 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link 
                to="/terms" 
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              >
                {isEn ? 'Terms of Service' : 'Conditions d\'utilisation'}
              </Link>
              <Link 
                to="/signup" 
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              >
                {isEn ? 'Back to Signup' : 'Retour à l\'inscription'}
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
