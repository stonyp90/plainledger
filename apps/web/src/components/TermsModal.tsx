/**
 * Terms of Service Modal Component
 * Requires users to scroll to the end before accepting
 */

import { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, Shield, FileText, CheckCircle } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useTheme } from '../contexts/ThemeContext';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const { language } = useI18n();
  const { resolvedTheme } = useTheme();
  const isEn = language === 'en';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Reset scroll state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasScrolledToEnd(false);
      setScrollProgress(0);
      // Reset scroll position
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    const percentage = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    setScrollProgress(Math.min(100, Math.max(0, percentage)));

    // Check if scrolled to bottom (within 50px threshold)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setHasScrolledToEnd(isAtBottom);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        // Prevent closing by clicking backdrop - user must explicitly accept or decline
        if (e.target === e.currentTarget) {
          // Only allow closing if they've scrolled to the end
          if (hasScrolledToEnd) {
            onDecline();
          }
        }
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Terms of Service' : "Conditions d'utilisation"}
              </h2>
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Please read carefully before accepting'
                  : "Veuillez lire attentivement avant d'accepter"}
              </p>
            </div>
          </div>
          <button
            onClick={onDecline}
            className="p-2 rounded-lg hover:bg-black/5 transition-colors"
            aria-label={isEn ? 'Close' : 'Fermer'}
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-black/5 flex-shrink-0">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${scrollProgress}%`,
              backgroundColor: 'rgb(var(--color-primary-500))',
            }}
          />
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
          {/* Section 1: Acceptance */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '1. Acceptance of Terms' : '1. Acceptation des conditions'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'By accessing and using PlainLedger ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.'
                : "En accédant et en utilisant PlainLedger (« le Service »), vous acceptez et convenez d'être lié par les termes et dispositions de cet accord. Si vous n'acceptez pas de respecter ce qui précède, veuillez ne pas utiliser ce service."}
            </p>
          </section>

          {/* Section 2: Description */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '2. Description of Service' : '2. Description du service'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'PlainLedger is a financial management and accounting software platform that provides users with tools for managing financial data, generating reports, and analyzing business performance. The Service includes access to dashboards, financial reports, data integrations, and related features.'
                : "PlainLedger est une plateforme logicielle de gestion financière et comptable qui fournit aux utilisateurs des outils pour gérer les données financières, générer des rapports et analyser la performance de l'entreprise. Le Service comprend l'accès aux tableaux de bord, aux rapports financiers, aux intégrations de données et aux fonctionnalités connexes."}
            </p>
          </section>

          {/* Section 3: AI Disclaimer - CRITICAL - Highlighted */}
          <section
            className="space-y-4 p-4 rounded-xl border-2"
            style={{
              borderColor: 'rgb(var(--color-warning))',
              backgroundColor: 'rgb(var(--color-warning) / 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--color-warning))' }} />
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn
                  ? '3. AI-POWERED FEATURES AND LIMITATIONS'
                  : "3. FONCTIONNALITÉS D'INTELLIGENCE ARTIFICIELLE ET LIMITATIONS"}
              </h2>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-warning))' }}>
              {isEn
                ? 'IMPORTANT: PLEASE READ THIS SECTION CAREFULLY BEFORE USING THE SERVICE.'
                : "IMPORTANT : VEUILLEZ LIRE ATTENTIVEMENT CETTE SECTION AVANT D'UTILISER LE SERVICE."}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'PlainLedger incorporates artificial intelligence ("AI") and machine learning technologies to provide data analysis, insights, recommendations, benchmarks, and other features. BY USING THE SERVICE, YOU EXPRESSLY ACKNOWLEDGE, UNDERSTAND, AND AGREE TO THE FOLLOWING:'
                : "PlainLedger intègre des technologies d'intelligence artificielle (« IA ») et d'apprentissage automatique pour fournir des analyses de données, des perspectives, des recommandations, des références et d'autres fonctionnalités. EN UTILISANT LE SERVICE, VOUS RECONNAISSEZ EXPRESSÉMENT, COMPRENEZ ET ACCEPTEZ CE QUI SUIT :"}
            </p>

            <div className="space-y-3">
              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? '3.1 No Professional Advice.' : '3.1 Aucun conseil professionnel.'}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'The Service, including all AI-generated content, is provided for general informational and educational purposes only. NOTHING IN THE SERVICE CONSTITUTES, OR IS INTENDED TO CONSTITUTE:'
                    : "Le Service, y compris tout le contenu généré par l'IA, est fourni à des fins d'information générale et éducatives uniquement. RIEN DANS LE SERVICE NE CONSTITUE, NI N'EST DESTINÉ À CONSTITUER :"}
                </p>
                <ul
                  className="list-disc pl-6 space-y-1 text-sm"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? (
                    <>
                      <li>Professional financial advice</li>
                      <li>Accounting or bookkeeping advice</li>
                      <li>Legal advice</li>
                      <li>Tax advice or tax preparation services</li>
                      <li>Investment advice or securities recommendations</li>
                      <li>Business consulting services</li>
                      <li>Any other form of licensed professional advice</li>
                    </>
                  ) : (
                    <>
                      <li>Un conseil financier professionnel</li>
                      <li>Un conseil comptable ou de tenue de livres</li>
                      <li>Un conseil juridique</li>
                      <li>Un conseil fiscal ou un service de préparation de déclarations</li>
                      <li>
                        Un conseil en investissement ou des recommandations de valeurs mobilières
                      </li>
                      <li>Des services de consultation en affaires</li>
                      <li>Toute autre forme de conseil professionnel agréé</li>
                    </>
                  )}
                </ul>
                <p
                  className="text-sm font-semibold mt-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'PlainLedger Inc. is NOT a licensed accounting firm, law firm, financial advisory firm, tax preparation service, or investment advisor. We do not hold ourselves out as such.'
                    : "PlainLedger Inc. N'EST PAS un cabinet comptable agréé, un cabinet d'avocats, une société de conseil financier, un service de préparation de déclarations fiscales ou un conseiller en investissement. Nous ne prétendons pas l'être."}
                </p>
              </div>

              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? '3.2 Decision Support Tool Only.'
                    : "3.2 Outil d'aide à la décision uniquement."}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'PlainLedger is designed exclusively as a decision-support tool to assist you in analyzing your business data. All insights, recommendations, benchmarks, projections, forecasts, and analyses provided by the Service are SUGGESTIONS ONLY. They are NOT:'
                    : "PlainLedger est conçu exclusivement comme un outil d'aide à la décision pour vous aider à analyser vos données commerciales. Toutes les perspectives, recommandations, références, projections, prévisions et analyses fournies par le Service sont des SUGGESTIONS UNIQUEMENT. Ce ne sont PAS :"}
                </p>
                <ul
                  className="list-disc pl-6 space-y-1 text-sm"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? (
                    <>
                      <li>Directives or instructions you must follow</li>
                      <li>Guarantees of any outcome</li>
                      <li>Predictions of future performance</li>
                      <li>Statements of fact</li>
                    </>
                  ) : (
                    <>
                      <li>Des directives ou instructions que vous devez suivre</li>
                      <li>Des garanties de résultat</li>
                      <li>Des prédictions de performance future</li>
                      <li>Des déclarations de fait</li>
                    </>
                  )}
                </ul>
                <p
                  className="text-sm font-semibold mt-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'THE FINAL DECISION ON ANY BUSINESS, FINANCIAL, LEGAL, OR TAX MATTER RESTS SOLELY AND EXCLUSIVELY WITH YOU.'
                    : 'LA DÉCISION FINALE SUR TOUTE QUESTION COMMERCIALE, FINANCIÈRE, JURIDIQUE OU FISCALE VOUS APPARTIENT EXCLUSIVEMENT.'}
                </p>
              </div>

              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? '3.3 No Guarantee of Accuracy.' : "3.3 Aucune garantie d'exactitude."}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'AI technology has inherent limitations and is subject to errors. You acknowledge that AI-generated content MAY:'
                    : "La technologie d'IA a des limitations inhérentes et est sujette aux erreurs. Vous reconnaissez que le contenu généré par l'IA PEUT :"}
                </p>
                <ul
                  className="list-disc pl-6 space-y-1 text-sm"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? (
                    <>
                      <li>Contain errors, inaccuracies, or omissions</li>
                      <li>Be based on incomplete or outdated information</li>
                      <li>Produce different results for similar inputs</li>
                      <li>Fail to account for your specific circumstances</li>
                      <li>Misinterpret or misclassify your data</li>
                    </>
                  ) : (
                    <>
                      <li>Contenir des erreurs, des inexactitudes ou des omissions</li>
                      <li>Être basé sur des informations incomplètes ou obsolètes</li>
                      <li>Produire des résultats différents pour des entrées similaires</li>
                      <li>Ne pas tenir compte de vos circonstances spécifiques</li>
                      <li>Mal interpréter ou mal classer vos données</li>
                    </>
                  )}
                </ul>
                <p
                  className="text-sm font-semibold mt-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'PLAINLEDGER MAKES NO WARRANTY OR REPRESENTATION WHATSOEVER, EXPRESS OR IMPLIED, REGARDING THE ACCURACY, COMPLETENESS, RELIABILITY, CURRENTNESS, SUITABILITY, OR AVAILABILITY OF ANY AI-GENERATED CONTENT OR ANY OTHER INFORMATION PROVIDED THROUGH THE SERVICE.'
                    : "PLAINLEDGER NE DONNE AUCUNE GARANTIE OU REPRÉSENTATION, EXPRESSE OU IMPLICITE, CONCERNANT L'EXACTITUDE, L'EXHAUSTIVITÉ, LA FIABILITÉ, L'ACTUALITÉ, L'ADÉQUATION OU LA DISPONIBILITÉ DE TOUT CONTENU GÉNÉRÉ PAR L'IA OU DE TOUTE AUTRE INFORMATION FOURNIE PAR LE SERVICE."}
                </p>
              </div>

              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? '3.4 User Responsibility.' : "3.4 Responsabilité de l'utilisateur."}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn
                    ? 'You are SOLELY AND EXCLUSIVELY responsible for:'
                    : 'Vous êtes SEUL ET EXCLUSIVEMENT responsable de :'}
                </p>
                <ul
                  className="list-disc pl-6 space-y-1 text-sm"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? (
                    <>
                      <li>
                        Independently verifying ALL information, data, and recommendations before
                        making any decision
                      </li>
                      <li>
                        Consulting with qualified, licensed professionals (certified accountants,
                        lawyers, financial advisors, tax professionals) before acting on any
                        information from the Service
                      </li>
                      <li>Ensuring the accuracy of all data you input into the Service</li>
                      <li>Reviewing all outputs and reports for accuracy before use</li>
                      <li>
                        All consequences of any decisions or actions taken based on the Service
                      </li>
                      <li>
                        Compliance with all applicable laws, regulations, and professional standards
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        Vérifier indépendamment TOUTES les informations, données et recommandations
                        avant de prendre toute décision
                      </li>
                      <li>
                        Consulter des professionnels qualifiés et agréés (comptables agréés,
                        avocats, conseillers financiers, fiscalistes) avant d'agir sur toute
                        information du Service
                      </li>
                      <li>
                        Assurer l'exactitude de toutes les données que vous saisissez dans le
                        Service
                      </li>
                      <li>
                        Examiner tous les résultats et rapports pour en vérifier l'exactitude avant
                        utilisation
                      </li>
                      <li>
                        Toutes les conséquences de toute décision ou action prise sur la base du
                        Service
                      </li>
                      <li>
                        La conformité à toutes les lois, réglementations et normes professionnelles
                        applicables
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? '3.5 No Reliance.' : '3.5 Aucune dépendance.'}
                </h3>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn
                    ? 'You expressly agree NOT to rely solely on the Service for any critical business, financial, legal, or tax decisions. ANY RELIANCE YOU PLACE ON THE SERVICE IS STRICTLY AT YOUR OWN RISK.'
                    : 'Vous acceptez expressément de NE PAS vous fier uniquement au Service pour toute décision commerciale, financière, juridique ou fiscale critique. TOUTE CONFIANCE QUE VOUS ACCORDEZ AU SERVICE EST STRICTEMENT À VOS PROPRES RISQUES.'}
                </p>
              </div>

              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {isEn ? '3.6 Acknowledgment.' : '3.6 Reconnaissance.'}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                  {isEn
                    ? 'By using the Service, you acknowledge that you have read, understood, and agree to this Section 3 in its entirety, and that you will not hold PlainLedger liable for any decisions made based on AI-generated content.'
                    : "En utilisant le Service, vous reconnaissez avoir lu, compris et accepté cette Section 3 dans son intégralité, et que vous ne tiendrez pas PlainLedger responsable des décisions prises sur la base du contenu généré par l'IA."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: User Accounts */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '4. User Accounts' : '4. Comptes utilisateurs'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration, maintain and promptly update your account information, maintain the security of your password and account, accept all responsibility for activities that occur under your account, and notify us immediately of any unauthorized use of your account.'
                : "Pour accéder à certaines fonctionnalités du Service, vous devez créer un compte. Vous acceptez de fournir des informations exactes, actuelles et complètes lors de l'inscription, de maintenir et de mettre à jour rapidement vos informations de compte, de maintenir la sécurité de votre mot de passe et de votre compte, d'accepter toute responsabilité pour les activités qui se produisent sous votre compte et de nous avertir immédiatement de toute utilisation non autorisée de votre compte."}
            </p>
          </section>

          {/* Section 5: Free Plan */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '5. Free Plan' : '5. Plan gratuit'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'PlainLedger offers a free plan with access to demo data. Free users can explore the platform with sample data to understand its features. To connect your accounting software and see your real financial data, you must subscribe to a paid plan.'
                : "PlainLedger offre un plan gratuit avec accès aux données de démonstration. Les utilisateurs gratuits peuvent explorer la plateforme avec des données d'exemple pour comprendre ses fonctionnalités. Pour connecter votre logiciel comptable et voir vos vraies données financières, vous devez vous abonner à un plan payant."}
            </p>
          </section>

          {/* Section 6: Subscription and Billing */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '6. Subscription and Billing' : '6. Abonnement et facturation'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'When you subscribe to a paid plan, you agree to pay the subscription fees as specified in your selected plan. Subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time, but no refunds will be provided for the current billing period.'
                : "Lorsque vous vous abonnez à un plan payant, vous acceptez de payer les frais d'abonnement spécifiés dans votre plan sélectionné. Les abonnements sont facturés à l'avance sur une base mensuelle ou annuelle. Vous pouvez annuler votre abonnement à tout moment, mais aucun remboursement ne sera fourni pour la période de facturation en cours."}
            </p>
          </section>

          {/* Section 7: Data and Privacy */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '7. Data and Privacy' : '7. Données et confidentialité'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'Your use of the Service is also governed by our Privacy Policy. We take data security seriously and implement industry-standard measures to protect your information. However, you are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.'
                : "Votre utilisation du Service est également régie par notre Politique de confidentialité. Nous prenons la sécurité des données au sérieux et mettons en œuvre des mesures standard de l'industrie pour protéger vos informations. Cependant, vous êtes responsable de maintenir la confidentialité de vos identifiants de compte et de toutes les activités qui se produisent sous votre compte."}
            </p>
          </section>

          {/* Section 8: Intellectual Property */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '8. Intellectual Property' : '8. Propriété intellectuelle'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'The Service and its original content, features, and functionality are owned by PlainLedger and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not modify, reproduce, distribute, or create derivative works based on the Service without our express written permission.'
                : "Le Service et son contenu original, ses fonctionnalités et sa fonctionnalité sont la propriété de PlainLedger et sont protégés par les lois internationales sur le droit d'auteur, les marques de commerce, les brevets, les secrets commerciaux et autres lois sur la propriété intellectuelle. Vous ne pouvez pas modifier, reproduire, distribuer ou créer des œuvres dérivées basées sur le Service sans notre permission écrite expresse."}
            </p>
          </section>

          {/* Section 9: Prohibited Uses */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '9. Prohibited Uses' : '9. Utilisations interdites'}
            </h2>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'You agree not to use the Service for any unlawful purpose, to violate any regulations or laws, to infringe upon intellectual property rights, to harass or harm others, to submit false information, or to upload malicious code.'
                : 'Vous acceptez de ne pas utiliser le Service à des fins illégales, pour violer toute réglementation ou loi, pour porter atteinte aux droits de propriété intellectuelle, pour harceler ou nuire à autrui, pour soumettre de fausses informations ou pour télécharger du code malveillant.'}
            </p>
          </section>

          {/* Section 10: Termination */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '10. Termination' : '10. Résiliation'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach the Terms. Upon termination, your right to use the Service will immediately cease.'
                : "Nous pouvons résilier ou suspendre votre compte et l'accès au Service immédiatement, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris si vous violez les Conditions. Lors de la résiliation, votre droit d'utiliser le Service cessera immédiatement."}
            </p>
          </section>

          {/* Section 11: Disclaimer of Warranties - Highlighted */}
          <section
            className="space-y-3 p-4 rounded-xl border-2"
            style={{
              borderColor: 'rgb(var(--color-error))',
              backgroundColor: 'rgb(var(--color-error) / 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '10. DISCLAIMER OF WARRANTIES' : '10. EXCLUSION DE GARANTIES'}
              </h2>
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:'
                : 'DANS TOUTE LA MESURE PERMISE PAR LA LOI APPLICABLE :'}
            </p>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. PLAINLEDGER EXPRESSLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:'
                : "LE SERVICE EST FOURNI « TEL QUEL » ET « TEL QUE DISPONIBLE » SANS AUCUNE GARANTIE D'AUCUNE SORTE, EXPRESSE OU IMPLICITE. PLAINLEDGER DÉCLINE EXPRESSÉMENT TOUTES LES GARANTIES, EXPRESSES OU IMPLICITES, Y COMPRIS, MAIS SANS S'Y LIMITER :"}
            </p>
            <ul
              className="list-disc pl-6 space-y-1 text-sm"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>
                  <li>IMPLIED WARRANTIES OF MERCHANTABILITY</li>
                  <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                  <li>NON-INFRINGEMENT</li>
                  <li>ACCURACY OR COMPLETENESS OF CONTENT</li>
                  <li>RELIABILITY OR AVAILABILITY</li>
                  <li>SECURITY OR ERROR-FREE OPERATION</li>
                </>
              ) : (
                <>
                  <li>LES GARANTIES IMPLICITES DE QUALITÉ MARCHANDE</li>
                  <li>L'ADÉQUATION À UN USAGE PARTICULIER</li>
                  <li>LA NON-CONTREFAÇON</li>
                  <li>L'EXACTITUDE OU L'EXHAUSTIVITÉ DU CONTENU</li>
                  <li>LA FIABILITÉ OU LA DISPONIBILITÉ</li>
                  <li>LA SÉCURITÉ OU LE FONCTIONNEMENT SANS ERREUR</li>
                </>
              )}
            </ul>
            <p className="text-sm font-semibold mt-3" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'ANY RELIANCE ON THE SERVICE, INCLUDING BUT NOT LIMITED TO AI-GENERATED CONTENT, INSIGHTS, RECOMMENDATIONS, BENCHMARKS, OR ANALYSES, IS AT YOUR OWN RISK. PLAINLEDGER IS A DECISION-SUPPORT TOOL AND DOES NOT REPLACE THE ADVICE OF QUALIFIED PROFESSIONALS.'
                : "TOUTE CONFIANCE ACCORDÉE AU SERVICE, Y COMPRIS, MAIS SANS S'Y LIMITER, AU CONTENU GÉNÉRÉ PAR L'IA, AUX PERSPECTIVES, RECOMMANDATIONS, RÉFÉRENCES OU ANALYSES, EST À VOS PROPRES RISQUES. PLAINLEDGER EST UN OUTIL D'AIDE À LA DÉCISION ET NE REMPLACE PAS LES CONSEILS DE PROFESSIONNELS QUALIFIÉS."}
            </p>
          </section>

          {/* Section 12: Limitation of Liability - Highlighted */}
          <section
            className="space-y-3 p-4 rounded-xl border-2"
            style={{
              borderColor: 'rgb(var(--color-error))',
              backgroundColor: 'rgb(var(--color-error) / 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '12. LIMITATION OF LIABILITY' : '12. LIMITATION DE RESPONSABILITÉ'}
              </h2>
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:'
                : 'DANS TOUTE LA MESURE PERMISE PAR LA LOI APPLICABLE :'}
            </p>
            <div className="space-y-2">
              <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn
                  ? 'IN NO EVENT SHALL PLAINLEDGER INC., ITS PARENT COMPANIES, SUBSIDIARIES, AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, PARTNERS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE OR EXEMPLARY DAMAGES, LOSS OF PROFITS, REVENUE, OR BUSINESS, LOSS OF DATA OR DATA BREACH, LOSS OF GOODWILL OR REPUTATION, COST OF SUBSTITUTE SERVICES, OR ANY OTHER INTANGIBLE LOSSES, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF PLAINLEDGER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.'
                  : "EN AUCUN CAS PLAINLEDGER INC., SES SOCIÉTÉS MÈRES, FILIALES, SOCIÉTÉS AFFILIÉES, ADMINISTRATEURS, DIRIGEANTS, EMPLOYÉS, AGENTS, PARTENAIRES, FOURNISSEURS OU CONCÉDANTS NE SERONT RESPONSABLES DE DOMMAGES INDIRECTS, ACCESSOIRES, SPÉCIAUX, CONSÉCUTIFS, PUNITIFS OU EXEMPLAIRES, PERTE DE PROFITS, DE REVENUS OU D'AFFAIRES, PERTE DE DONNÉES OU VIOLATION DE DONNÉES, PERTE DE GOODWILL OU DE RÉPUTATION, COÛT DES SERVICES DE REMPLACEMENT, OU TOUTE AUTRE PERTE INTANGIBLE, QUE CE SOIT SUR LA BASE D'UNE GARANTIE, D'UN CONTRAT, D'UN DÉLIT (Y COMPRIS LA NÉGLIGENCE), DE LA RESPONSABILITÉ STRICTE OU DE TOUTE AUTRE THÉORIE JURIDIQUE, MÊME SI PLAINLEDGER A ÉTÉ INFORMÉ DE LA POSSIBILITÉ DE TELS DOMMAGES."}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn
                  ? 'WITHOUT LIMITING THE FOREGOING, PLAINLEDGER SHALL NOT BE LIABLE FOR ANY DAMAGES ARISING FROM OR RELATED TO: your access to, use of, or inability to use the Service; any conduct or content of any third party on the Service; any content obtained from the Service, including but not limited to AI-generated recommendations, analyses, insights, benchmarks, or projections; unauthorized access, use, or alteration of your data; any decisions you make based on information provided by the Service; any errors, inaccuracies, or omissions in AI-generated content; any reliance on the Service for business, financial, legal, or tax matters.'
                  : "SANS LIMITER CE QUI PRÉCÈDE, PLAINLEDGER NE SERA PAS RESPONSABLE DES DOMMAGES DÉCOULANT OU LIÉS À : votre accès, utilisation ou incapacité d'utiliser le Service; toute conduite ou contenu de tiers sur le Service; tout contenu obtenu du Service, y compris, mais sans s'y limiter, les recommandations, analyses, perspectives, références ou projections générées par l'IA; l'accès non autorisé, l'utilisation ou la modification de vos données; toute décision que vous prenez sur la base des informations fournies par le Service; toute erreur, inexactitude ou omission dans le contenu généré par l'IA; toute confiance accordée au Service pour des questions commerciales, financières, juridiques ou fiscales."}
              </p>
              <p className="text-sm font-semibold mt-2" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn
                  ? "IN NO EVENT SHALL PLAINLEDGER'S TOTAL AGGREGATE LIABILITY EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID TO PLAINLEDGER IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED CANADIAN DOLLARS (CAD $100.00)."
                  : 'EN AUCUN CAS LA RESPONSABILITÉ TOTALE AGRÉGÉE DE PLAINLEDGER NE DÉPASSERA LE PLUS ÉLEVÉ DE : (A) LE MONTANT QUE VOUS AVEZ PAYÉ À PLAINLEDGER AU COURS DES DOUZE (12) MOIS PRÉCÉDANT LA RÉCLAMATION, OU (B) CENT DOLLARS CANADIENS (100,00 $ CAD).'}
              </p>
            </div>
          </section>

          {/* Section 13: Indemnification - Highlighted */}
          <section
            className="space-y-3 p-4 rounded-xl border-2"
            style={{
              borderColor: 'rgb(var(--color-error))',
              backgroundColor: 'rgb(var(--color-error) / 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'rgb(var(--color-error))' }} />
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '13. INDEMNIFICATION' : '13. INDEMNISATION'}
              </h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? "You agree to indemnify, defend, and hold harmless PlainLedger Inc., its parent companies, subsidiaries, affiliates, directors, officers, employees, agents, partners, suppliers, and licensors from and against any and all claims, demands, losses, damages, costs, liabilities, and expenses (including reasonable attorneys' fees) arising out of or related to: your use of the Service; your violation of these Terms; your violation of any rights of a third party; any decisions you make based on information provided by the Service; any data you submit to the Service; your negligence or willful misconduct."
                : "Vous acceptez d'indemniser, de défendre et de dégager de toute responsabilité PlainLedger Inc., ses sociétés mères, filiales, sociétés affiliées, administrateurs, dirigeants, employés, agents, partenaires, fournisseurs et concédants contre toutes réclamations, demandes, pertes, dommages, coûts, responsabilités et dépenses (y compris les honoraires d'avocat raisonnables) découlant de ou liés à : votre utilisation du Service; votre violation de ces Conditions; votre violation des droits d'un tiers; toute décision que vous prenez sur la base des informations fournies par le Service; toute donnée que vous soumettez au Service; votre négligence ou mauvaise conduite intentionnelle."}
            </p>
          </section>

          {/* Section 14-15: Governing Law and Changes */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '14. Governing Law' : '14. Loi applicable'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'These Terms shall be governed by and construed in accordance with the laws of Canada, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Canada.'
                : 'Ces Conditions seront régies et interprétées conformément aux lois du Canada, sans égard à ses dispositions de conflit de lois. Tout litige découlant de ces Conditions sera soumis à la juridiction exclusive des tribunaux du Canada.'}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn ? '15. Changes to Terms' : '15. Modifications des conditions'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.'
                : "Nous nous réservons le droit de modifier ou de remplacer ces Conditions à tout moment. Si une révision est importante, nous fournirons un préavis d'au moins 30 jours avant que les nouvelles conditions ne prennent effet. Ce qui constitue un changement important sera déterminé à notre seule discrétion."}
            </p>
          </section>

          {/* Section 16: Acknowledgment - Highlighted */}
          <section
            className="space-y-3 p-4 rounded-xl border-2"
            style={{
              borderColor: 'rgb(var(--color-primary-500))',
              backgroundColor: 'rgb(var(--color-primary-500) / 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? '16. ACKNOWLEDGMENT AND ACCEPTANCE' : '16. RECONNAISSANCE ET ACCEPTATION'}
              </h2>
            </div>
            <p className="text-sm font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
              {isEn
                ? 'BY CLICKING "I ACCEPT," CREATING AN ACCOUNT, OR USING THE SERVICE, YOU ACKNOWLEDGE THAT:'
                : "EN CLIQUANT SUR « J'ACCEPTE », EN CRÉANT UN COMPTE OU EN UTILISANT LE SERVICE, VOUS RECONNAISSEZ QUE :"}
            </p>
            <ol
              className="list-decimal pl-6 space-y-2 text-sm"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? (
                <>
                  <li>You have read these Terms of Service in their entirety</li>
                  <li>You understand all provisions contained herein</li>
                  <li>You agree to be bound by all terms and conditions</li>
                  <li>
                    You understand that PlainLedger is a decision-support tool only and does not
                    provide professional advice
                  </li>
                  <li>
                    You accept full responsibility for any decisions made based on the Service
                  </li>
                  <li>
                    You will consult qualified professionals before making important business,
                    financial, legal, or tax decisions
                  </li>
                  <li>
                    You waive any claims against PlainLedger arising from your reliance on
                    AI-generated content
                  </li>
                </>
              ) : (
                <>
                  <li>Vous avez lu ces Conditions d'utilisation dans leur intégralité</li>
                  <li>Vous comprenez toutes les dispositions contenues dans les présentes</li>
                  <li>Vous acceptez d'être lié par toutes les conditions</li>
                  <li>
                    Vous comprenez que PlainLedger est un outil d'aide à la décision uniquement et
                    ne fournit pas de conseils professionnels
                  </li>
                  <li>
                    Vous acceptez l'entière responsabilité de toute décision prise sur la base du
                    Service
                  </li>
                  <li>
                    Vous consulterez des professionnels qualifiés avant de prendre des décisions
                    commerciales, financières, juridiques ou fiscales importantes
                  </li>
                  <li>
                    Vous renoncez à toute réclamation contre PlainLedger découlant de votre
                    confiance dans le contenu généré par l'IA
                  </li>
                </>
              )}
            </ol>
            <p className="text-sm font-bold mt-3" style={{ color: 'rgb(var(--color-error))' }}>
              {isEn
                ? 'IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE THE SERVICE.'
                : "SI VOUS N'ACCEPTEZ PAS CES CONDITIONS, N'UTILISEZ PAS LE SERVICE."}
            </p>
          </section>
        </div>

        {/* Footer with Actions */}
        <div
          className="p-6 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}
        >
          <div className="flex-1">
            {!hasScrolledToEnd && (
              <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                {isEn
                  ? 'Please scroll to read the entire agreement'
                  : "Veuillez faire défiler pour lire l'accord complet"}
              </p>
            )}
            {hasScrolledToEnd && (
              <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-success))' }}>
                {isEn ? '✓ You have read the entire agreement' : "✓ Vous avez lu l'accord complet"}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))',
              }}
            >
              {isEn ? 'Decline' : 'Refuser'}
            </button>
            <button
              onClick={onAccept}
              disabled={!hasScrolledToEnd}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                backgroundColor: hasScrolledToEnd
                  ? 'rgb(var(--color-primary-500))'
                  : 'rgb(var(--color-bg-muted))',
                color: hasScrolledToEnd ? 'white' : 'rgb(var(--color-text-muted))',
              }}
            >
              {isEn ? 'I Accept' : "J'accepte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
