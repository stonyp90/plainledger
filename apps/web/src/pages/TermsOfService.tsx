/**
 * Terms of Service Page
 * Legal terms and conditions for using PlainLedger
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Shield, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n, LanguageToggle } from '../lib/i18n';
import ThemeToggle from '../components/ThemeToggle';

export default function TermsOfService() {
  const { language } = useI18n();
  const isEn = language === 'en';

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'rgb(var(--color-bg))' }}
    >
      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--color-primary-500))' }}
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Terms of Service' : 'Conditions d\'utilisation'}
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
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    By accessing and using PlainLedger ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    2. Description of Service
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger is a financial management and accounting software platform that provides users with tools for managing financial data, generating reports, and analyzing business performance. The Service includes access to dashboards, financial reports, data integrations, and related features.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    3. User Accounts
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    To access certain features of the Service, you must register for an account. You agree to:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain and promptly update your account information</li>
                    <li>Maintain the security of your password and account</li>
                    <li>Accept all responsibility for activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized use of your account</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    4. Free Trial
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger offers a 21-day free trial period. During this trial, you have full access to the Service's features. No credit card is required to start your trial. At the end of the trial period, you may choose to subscribe to a paid plan or your access will be limited.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    5. Subscription and Billing
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    If you choose to subscribe after your free trial, you agree to pay the subscription fees as specified in your selected plan. Subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time, but no refunds will be provided for the current billing period.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    6. Data and Privacy
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Your use of the Service is also governed by our Privacy Policy. We take data security seriously and implement industry-standard measures to protect your information. However, you are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    7. Intellectual Property
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    The Service and its original content, features, and functionality are owned by PlainLedger and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not modify, reproduce, distribute, or create derivative works based on the Service without our express written permission.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    8. Prohibited Uses
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    You agree not to use the Service:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                    <li>To violate any international, federal, provincial, or local regulations, rules, laws, or ordinances</li>
                    <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                    <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                    <li>To submit false or misleading information</li>
                    <li>To upload or transmit viruses or any other type of malicious code</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    9. Termination
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    10. Disclaimer of Warranties
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    11. Limitation of Liability
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    In no event shall PlainLedger, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    12. Governing Law
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    These Terms shall be governed by and construed in accordance with the laws of Canada, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Canada.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    13. Changes to Terms
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    14. Contact Information
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    If you have any questions about these Terms of Service, please contact us at:
                  </p>
                  <p className="text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Email: legal@plainledger.ca
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    1. Acceptation des conditions
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    En accédant et en utilisant PlainLedger (« le Service »), vous acceptez et convenez d'être lié par les termes et dispositions de cet accord. Si vous n'acceptez pas de respecter ce qui précède, veuillez ne pas utiliser ce service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    2. Description du service
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger est une plateforme logicielle de gestion financière et comptable qui fournit aux utilisateurs des outils pour gérer les données financières, générer des rapports et analyser la performance de l'entreprise. Le Service comprend l'accès aux tableaux de bord, aux rapports financiers, aux intégrations de données et aux fonctionnalités connexes.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    3. Comptes utilisateurs
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Pour accéder à certaines fonctionnalités du Service, vous devez créer un compte. Vous acceptez de :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>Fournir des informations exactes, actuelles et complètes lors de l'inscription</li>
                    <li>Maintenir et mettre à jour rapidement vos informations de compte</li>
                    <li>Maintenir la sécurité de votre mot de passe et de votre compte</li>
                    <li>Accepter toute responsabilité pour les activités qui se produisent sous votre compte</li>
                    <li>Nous avertir immédiatement de toute utilisation non autorisée de votre compte</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    4. Essai gratuit
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    PlainLedger offre une période d'essai gratuit de 21 jours. Pendant cet essai, vous avez un accès complet aux fonctionnalités du Service. Aucune carte de crédit n'est requise pour commencer votre essai. À la fin de la période d'essai, vous pouvez choisir de vous abonner à un plan payant ou votre accès sera limité.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    5. Abonnement et facturation
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Si vous choisissez de vous abonner après votre essai gratuit, vous acceptez de payer les frais d'abonnement spécifiés dans votre plan sélectionné. Les abonnements sont facturés à l'avance sur une base mensuelle ou annuelle. Vous pouvez annuler votre abonnement à tout moment, mais aucun remboursement ne sera fourni pour la période de facturation en cours.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    6. Données et confidentialité
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Votre utilisation du Service est également régie par notre Politique de confidentialité. Nous prenons la sécurité des données au sérieux et mettons en œuvre des mesures standard de l'industrie pour protéger vos informations. Cependant, vous êtes responsable de maintenir la confidentialité de vos identifiants de compte et de toutes les activités qui se produisent sous votre compte.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    7. Propriété intellectuelle
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Le Service et son contenu original, ses fonctionnalités et sa fonctionnalité sont la propriété de PlainLedger et sont protégés par les lois internationales sur le droit d'auteur, les marques de commerce, les brevets, les secrets commerciaux et autres lois sur la propriété intellectuelle. Vous ne pouvez pas modifier, reproduire, distribuer ou créer des œuvres dérivées basées sur le Service sans notre permission écrite expresse.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    8. Utilisations interdites
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Vous acceptez de ne pas utiliser le Service :
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 space-y-1.5 sm:space-y-2 text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    <li>À des fins illégales ou pour inciter d'autres à accomplir des actes illégaux</li>
                    <li>Pour violer toute réglementation, règle, loi ou ordonnance internationale, fédérale, provinciale ou locale</li>
                    <li>Pour porter atteinte ou violer nos droits de propriété intellectuelle ou les droits de propriété intellectuelle d'autrui</li>
                    <li>Pour harceler, abuser, insulter, nuire, diffamer, calomnier, dénigrer, intimider ou discriminer</li>
                    <li>Pour soumettre des informations fausses ou trompeuses</li>
                    <li>Pour télécharger ou transmettre des virus ou tout autre type de code malveillant</li>
                  </ul>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    9. Résiliation
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous pouvons résilier ou suspendre votre compte et l'accès au Service immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris si vous violez les Conditions. Lors de la résiliation, votre droit d'utiliser le Service cessera immédiatement.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    10. Avertissement concernant les garanties
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Le Service est fourni « tel quel » et « tel que disponible » sans aucune garantie d'aucune sorte, expresse ou implicite. Nous ne garantissons pas que le Service sera ininterrompu, sécurisé ou sans erreur.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    11. Limitation de responsabilité
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    En aucun cas PlainLedger, ses directeurs, employés ou agents ne seront responsables de tout dommage indirect, accessoire, spécial, consécutif ou punitif, y compris sans limitation, la perte de profits, de données, d'utilisation, de goodwill ou d'autres pertes intangibles, résultant de votre utilisation du Service.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    12. Loi applicable
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Ces Conditions seront régies et interprétées conformément aux lois du Canada, sans égard à ses dispositions de conflit de lois. Tout litige découlant de ces Conditions sera soumis à la juridiction exclusive des tribunaux du Canada.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    13. Modifications des conditions
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Nous nous réservons le droit de modifier ou de remplacer ces Conditions à tout moment. Si une révision est importante, nous fournirons un préavis d'au moins 30 jours avant que les nouvelles conditions ne prennent effet. Ce qui constitue un changement important sera déterminé à notre seule discrétion.
                  </p>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    14. Informations de contact
                  </h2>
                  <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Si vous avez des questions concernant ces Conditions d'utilisation, veuillez nous contacter à :
                  </p>
                  <p className="text-sm sm:text-base" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Courriel : legal@plainledger.ca
                  </p>
                </section>
              </div>
            )}
          </div>

          {/* Footer Links */}
          <div className="pt-6 sm:pt-8 border-t" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link 
                to="/privacy" 
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: 'rgb(var(--color-primary-500))' }}
              >
                {isEn ? 'Privacy Policy' : 'Politique de confidentialité'}
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
