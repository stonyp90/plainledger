import { useState, useEffect } from 'react';
import {
  Check,
  X,
  CreditCard,
  Calendar,
  Download,
  ExternalLink,
  AlertTriangle,
  Zap,
  Crown,
  ArrowRight,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import appConfig from '../lib/config';
import { useTenant } from '../contexts/TenantContext';
import stripeService, {
  type PricingPlan,
  type PlanInterval,
  type Subscription,
  type PaymentMethod,
  type Invoice,
} from '../lib/stripe';

// =====================================================
// PRICING CARD COMPONENT
// =====================================================

function PricingCard({
  plan,
  interval,
  isCurrentPlan,
  onSelect,
  isEn,
}: {
  plan: PricingPlan;
  interval: PlanInterval;
  isCurrentPlan: boolean;
  onSelect: (plan: PricingPlan) => void;
  isEn: boolean;
}) {
  const price = interval === 'year' ? plan.priceYearly / 12 : plan.priceMonthly;
  const isEnterprise = plan.tier === 'enterprise';
  const discount = stripeService.calculateYearlyDiscount(plan);
  
  return (
    <div
      className={`relative rounded-2xl p-6 transition-all ${
        plan.popular 
          ? 'ring-2 shadow-lg' 
          : 'border'
      } ${isCurrentPlan ? 'opacity-75' : ''}`}
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: plan.popular ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-border))',
        boxShadow: `0 0 0 2px ${plan.popular ? 'rgb(var(--color-primary-500))' : undefined}`,
      }}
    >
      {/* Badge */}
      {plan.badge && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ 
            backgroundColor: plan.popular ? 'rgb(var(--color-primary-500))' : 'rgb(var(--color-bg-muted))',
            color: plan.popular ? 'white' : 'rgb(var(--color-text-secondary))'
          }}
        >
          {isEn ? plan.badge : plan.badgeFr}
        </div>
      )}
      
      {/* Plan Header */}
      <div className="text-center mb-6">
        <h3 
          className="text-lg font-semibold mb-1"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          {isEn ? plan.name : plan.nameFr}
        </h3>
        <p 
          className="text-sm"
          style={{ color: 'rgb(var(--color-text-muted))' }}
        >
          {isEn ? plan.description : plan.descriptionFr}
        </p>
      </div>
      
      {/* Price */}
      <div className="text-center mb-6">
        {isEnterprise ? (
          <div>
            <p 
              className="text-3xl font-bold"
              style={{ color: 'rgb(var(--color-text))' }}
            >
              {isEn ? 'Custom' : 'Sur mesure'}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--color-text-muted))' }}
            >
              {isEn ? 'Contact sales' : 'Contactez-nous'}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-center gap-1">
              <span 
                className="text-4xl font-bold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {stripeService.formatPrice(price, plan.currency, isEn)}
              </span>
              {price > 0 && (
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                  /{isEn ? 'mo' : 'mois'}
                </span>
              )}
            </div>
            {interval === 'year' && discount > 0 && (
              <p 
                className="text-sm mt-1"
                style={{ color: 'rgb(var(--color-success))' }}
              >
                {isEn ? `Save ${discount}% yearly` : `Économisez ${discount}% annuellement`}
              </p>
            )}
            {interval === 'year' && plan.priceYearly > 0 && (
              <p 
                className="text-xs mt-1"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {stripeService.formatPrice(plan.priceYearly, plan.currency, isEn)}/{isEn ? 'year' : 'an'}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Features */}
      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            {feature.included ? (
              <Check 
                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                style={{ color: 'rgb(var(--color-success))' }} 
              />
            ) : (
              <X 
                className="w-5 h-5 flex-shrink-0 mt-0.5" 
                style={{ color: 'rgb(var(--color-text-muted))' }} 
              />
            )}
            <span 
              className="text-sm"
              style={{ 
                color: feature.included 
                  ? 'rgb(var(--color-text))' 
                  : 'rgb(var(--color-text-muted))'
              }}
            >
              {isEn ? feature.name : feature.nameFr}
            </span>
          </li>
        ))}
      </ul>
      
      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          isCurrentPlan ? 'cursor-not-allowed' : ''
        }`}
        style={{
          backgroundColor: isCurrentPlan 
            ? 'rgb(var(--color-bg-muted))' 
            : plan.popular 
              ? 'rgb(var(--color-primary-500))' 
              : 'rgb(var(--color-text))',
          color: isCurrentPlan 
            ? 'rgb(var(--color-text-muted))' 
            : plan.popular 
              ? 'white' 
              : 'rgb(var(--color-bg))',
        }}
      >
        {isCurrentPlan ? (
          isEn ? 'Current Plan' : 'Plan actuel'
        ) : isEnterprise ? (
          <>
            {isEn ? 'Contact Sales' : 'Contacter les ventes'}
            <ArrowRight className="w-4 h-4" />
          </>
        ) : plan.priceMonthly === 0 ? (
          isEn ? 'Get Started Free' : 'Commencer gratuitement'
        ) : (
          <>
            {isEn ? 'Upgrade Now' : 'Passer au niveau supérieur'}
            <Zap className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function SubscriptionManagement() {
  const { language } = useI18n();
  const { currentTenant } = useTenant();
  const isEn = language === 'en';
  
  const [interval, setInterval] = useState<PlanInterval>('month');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  
  const plans = stripeService.getPlans();
  const currentPlan = subscription 
    ? plans.find(p => p.id === subscription.planId) 
    : plans.find(p => p.tier === (currentTenant?.plan || 'free'));
  
  // Load subscription data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sub, methods, invs] = await Promise.all([
          stripeService.getSubscription(currentTenant?.id || ''),
          stripeService.getPaymentMethods(currentTenant?.id || ''),
          stripeService.getInvoices(currentTenant?.id || ''),
        ]);
        setSubscription(sub);
        setPaymentMethods(methods);
        setInvoices(invs);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentTenant?.id]);

  // Handle plan selection
  const handleSelectPlan = async (plan: PricingPlan) => {
    if (plan.tier === 'enterprise') {
      window.location.assign(`mailto:${appConfig.support.email}?subject=${encodeURIComponent('Enterprise plan inquiry')}`);
      return;
    }
    
    if (plan.priceMonthly === 0) {
      // Downgrade to free - would need confirmation
      if (confirm(isEn 
        ? 'Are you sure you want to downgrade to the Free plan? You will lose access to premium features.'
        : 'Êtes-vous sûr de vouloir passer au plan Gratuit? Vous perdrez l\'accès aux fonctionnalités premium.'
      )) {
        alert(isEn 
          ? 'Your subscription will be downgraded at the end of the current billing period.'
          : 'Votre abonnement sera rétrogradé à la fin de la période de facturation en cours.'
        );
      }
      return;
    }
    
    setProcessingPlan(plan.id);
    try {
      const { url } = await stripeService.createCheckoutSession({
        planId: plan.id,
        interval,
        organizationId: currentTenant?.id || '',
        userEmail: currentTenant?.name || 'user@example.com',
      });
      
      // In production, redirect to Stripe Checkout
      // window.location.href = url;
      
      // For demo, show alert
      alert(isEn 
        ? `You would be redirected to Stripe Checkout to subscribe to ${plan.name} (${interval === 'year' ? 'yearly' : 'monthly'}).\n\nCheckout URL: ${url}`
        : `Vous seriez redirigé vers Stripe Checkout pour vous abonner à ${plan.nameFr} (${interval === 'year' ? 'annuel' : 'mensuel'}).\n\nURL: ${url}`
      );
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(isEn ? 'Error creating checkout session' : 'Erreur lors de la création de la session');
    } finally {
      setProcessingPlan(null);
    }
  };

  // Handle manage subscription (Stripe Portal)
  const handleManageSubscription = async () => {
    try {
      const portalUrl = await stripeService.getCustomerPortalUrl({
        organizationId: currentTenant?.id || '',
      });
      
      // In production, redirect to Stripe Portal
      // window.location.href = portalUrl;
      
      // For demo, show alert
      alert(isEn 
        ? `You would be redirected to Stripe Customer Portal to manage your subscription.\n\nPortal URL: ${portalUrl}`
        : `Vous seriez redirigé vers le portail client Stripe pour gérer votre abonnement.\n\nURL: ${portalUrl}`
      );
    } catch (error) {
      console.error('Error getting portal URL:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--color-text-muted))' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Summary */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--color-primary-500) / 0.1)' }}
            >
              <Crown className="w-6 h-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                {isEn ? 'Current Plan' : 'Plan actuel'}
              </h3>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-primary-500))' }}>
                {isEn ? currentPlan?.name : currentPlan?.nameFr}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span 
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription?.status === 'active' ? 'badge-success' : 'badge-warning'
              }`}
            >
              {subscription?.status === 'active' ? (isEn ? 'Active' : 'Actif') :
               (isEn ? 'Attention needed' : 'Attention requise')}
            </span>
            {subscription?.cancelAtPeriodEnd && (
              <span className="badge-warning">
                {isEn ? 'Cancels at period end' : 'Annule en fin de période'}
              </span>
            )}
          </div>
        </div>
        
        {/* Subscription Details */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl mb-6"
          style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
        >
          <div>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Billing Period' : 'Période de facturation'}
            </p>
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {subscription?.interval === 'year' ? (isEn ? 'Yearly' : 'Annuel') : (isEn ? 'Monthly' : 'Mensuel')}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Next Billing Date' : 'Prochaine facturation'}
            </p>
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {subscription?.currentPeriodEnd 
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              {isEn ? 'Amount' : 'Montant'}
            </p>
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {currentPlan ? stripeService.formatPrice(
                subscription?.interval === 'year' ? currentPlan.priceYearly : currentPlan.priceMonthly,
                currentPlan.currency,
                isEn
              ) : '-'}
              {currentPlan && currentPlan.priceMonthly > 0 && (
                <span style={{ color: 'rgb(var(--color-text-muted))' }}>
                  /{subscription?.interval === 'year' ? (isEn ? 'year' : 'an') : (isEn ? 'month' : 'mois')}
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleManageSubscription}
            className="btn-primary flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {isEn ? 'Manage Subscription' : 'Gérer l\'abonnement'}
          </button>
          <button
            onClick={() => setShowAllPlans(!showAllPlans)}
            className="btn-secondary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {showAllPlans 
              ? (isEn ? 'Hide Plans' : 'Masquer les plans')
              : (isEn ? 'Change Plan' : 'Changer de plan')}
            {showAllPlans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Calendly CTA */}
      {showAllPlans && (
        <div 
          className="card relative overflow-hidden"
          style={{
            border: '1px solid rgb(var(--color-primary-500) / 0.2)',
            background: 'linear-gradient(135deg, rgb(var(--color-primary-500) / 0.05) 0%, rgb(var(--color-bg-subtle)) 50%, rgb(var(--color-primary-500) / 0.03) 100%)',
          }}
        >
          {/* Decorative gradient overlay */}
          <div 
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, rgb(var(--color-primary-500)) 0%, transparent 70%)',
            }}
          />
          
          <div className="relative text-center space-y-6 py-10 px-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                  boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.35)',
                }}
              >
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              <h3 
                className="text-2xl font-bold"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {isEn ? 'Schedule a Consultation' : 'Planifier une consultation'}
              </h3>
              <p 
                className="text-sm max-w-md mx-auto leading-relaxed"
                style={{ color: 'rgb(var(--color-text-muted))' }}
              >
                {isEn 
                  ? 'Book a call with our team to discuss the best plan for your business needs.'
                  : 'Réservez un appel avec notre équipe pour discuter du meilleur plan pour les besoins de votre entreprise.'}
              </p>
            </div>
            
            {/* CTA Button */}
            <button
              onClick={() => window.open('https://calendly.com/anthonypaquet1508', '_blank')}
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-600)) 100%)',
                boxShadow: '0 4px 14px rgb(var(--color-primary-500) / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgb(var(--color-primary-500) / 0.5), inset 0 1px 0 rgb(255 255 255 / 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 14px rgb(var(--color-primary-500) / 0.4), inset 0 1px 0 rgb(255 255 255 / 0.1)';
              }}
            >
              <Calendar className="w-5 h-5" />
              {isEn ? 'Book a Call' : 'Réserver un appel'}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Payment Method */}
      {paymentMethods.length > 0 && (
        <div className="card">
          <h3 className="section-title">
            {isEn ? 'Payment Method' : 'Méthode de paiement'}
          </h3>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-8 rounded flex items-center justify-center"
                    style={{ backgroundColor: 'rgb(var(--color-surface))' }}
                  >
                    {method.card?.brand === 'visa' && (
                      <span className="text-blue-600 font-bold text-sm">VISA</span>
                    )}
                    {method.card?.brand === 'mastercard' && (
                      <span className="text-red-500 font-bold text-sm">MC</span>
                    )}
                    {method.card?.brand === 'amex' && (
                      <span className="text-blue-500 font-bold text-sm">AMEX</span>
                    )}
                    {!['visa', 'mastercard', 'amex'].includes(method.card?.brand || '') && (
                      <CreditCard className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                      •••• •••• •••• {method.card?.last4}
                    </p>
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {isEn ? 'Expires' : 'Expire'} {method.card?.expMonth}/{method.card?.expYear}
                    </p>
                  </div>
                </div>
                {method.isDefault && (
                  <span className="badge-default">
                    {isEn ? 'Default' : 'Par défaut'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleManageSubscription}
            className="mt-4 text-sm font-medium flex items-center gap-1"
            style={{ color: 'rgb(var(--color-primary-600))' }}
          >
            {isEn ? 'Update payment method' : 'Modifier la méthode de paiement'}
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Invoices */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">
            {isEn ? 'Billing History' : 'Historique de facturation'}
          </h3>
          <button
            onClick={() => setShowInvoices(!showInvoices)}
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: 'rgb(var(--color-primary-600))' }}
          >
            {showInvoices ? (isEn ? 'Hide' : 'Masquer') : (isEn ? 'Show all' : 'Voir tout')}
            {showInvoices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        {showInvoices && invoices.length > 0 && (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-50 transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-bg-muted))' }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {invoice.number}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {new Date(invoice.created).toLocaleDateString(isEn ? 'en-CA' : 'fr-CA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {stripeService.formatPrice(invoice.amountPaid / 100, invoice.currency.toUpperCase(), isEn)}
                    </p>
                    <span 
                      className={`text-xs ${
                        invoice.status === 'paid' ? 'text-green-600 dark:text-green-400' : 
                        invoice.status === 'open' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {invoice.status === 'paid' ? (isEn ? 'Paid' : 'Payé') :
                       invoice.status === 'open' ? (isEn ? 'Due' : 'Dû') :
                       (isEn ? 'Unpaid' : 'Impayé')}
                    </span>
                  </div>
                  <a
                    href={invoice.pdfUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                    title={isEn ? 'Download PDF' : 'Télécharger PDF'}
                    onClick={(e) => {
                      e.preventDefault();
                      alert(isEn 
                        ? 'Invoice PDF would download here in production'
                        : 'Le PDF de la facture serait téléchargé ici en production'
                      );
                    }}
                  >
                    <Download className="w-4 h-4" style={{ color: 'rgb(var(--color-text-muted))' }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!showInvoices && (
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {invoices.length} {isEn ? 'invoices available' : 'factures disponibles'}
          </p>
        )}
      </div>
      
      {/* Usage Stats */}
      {subscription?.usage && (
        <div className="card">
          <h3 className="section-title">
            {isEn ? 'Current Usage' : 'Utilisation actuelle'}
          </h3>
          <div className="space-y-4">
            <UsageBar
              label={isEn ? 'Reports Generated' : 'Rapports générés'}
              current={subscription.usage.reports}
              max={currentPlan?.limits.reports || 100}
              isEn={isEn}
            />
            <UsageBar
              label={isEn ? 'API Calls' : 'Appels API'}
              current={subscription.usage.apiCalls}
              max={currentPlan?.limits.apiCalls || 1000}
              isEn={isEn}
            />
            <UsageBar
              label={isEn ? 'Storage (MB)' : 'Stockage (Mo)'}
              current={subscription.usage.storage}
              max={currentPlan?.limits.storage || 1000}
              isEn={isEn}
            />
          </div>
        </div>
      )}
      
    </div>
  );
}

// Usage Bar Component
function UsageBar({ label, current, max, isEn }: { label: string; current: number; max: number; isEn: boolean }) {
  const percentage = max === -1 ? 10 : Math.min((current / max) * 100, 100);
  const isUnlimited = max === -1;
  const isNearLimit = percentage >= 80;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</span>
        <span 
          className="font-medium" 
          style={{ color: isNearLimit && !isUnlimited ? 'rgb(var(--color-warning))' : 'rgb(var(--color-text))' }}
        >
          {current.toLocaleString()} / {isUnlimited ? (isEn ? 'Unlimited' : 'Illimité') : max.toLocaleString()}
        </span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-bar-fill"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: isNearLimit && !isUnlimited ? 'rgb(var(--color-warning))' : undefined
          }} 
        />
      </div>
    </div>
  );
}
