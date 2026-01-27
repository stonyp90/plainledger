/**
 * PlainLedger Stripe Integration
 * 
 * This module provides Stripe integration for subscription management.
 * It supports:
 * - Dynamic pricing plans
 * - Checkout sessions for new subscriptions
 * - Customer portal for managing existing subscriptions
 * - Webhook handling for subscription events
 */

// =====================================================
// CONFIGURATION
// =====================================================

export interface StripeConfig {
  publishableKey: string;
  // These would come from environment variables in production
  portalUrl: string;
  checkoutSuccessUrl: string;
  checkoutCancelUrl: string;
}

/**
 * SECURITY: Stripe configuration with environment validation
 * In production, VITE_STRIPE_PUBLISHABLE_KEY must be set
 */
const getStripeConfig = (): StripeConfig => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const isProduction = import.meta.env.PROD;

  // Validate in production
  if (isProduction && (!publishableKey || publishableKey === 'pk_test_demo')) {
    console.error('[Security] Stripe publishable key not configured for production');
  }

  return {
    publishableKey: publishableKey || (isProduction ? '' : 'pk_test_demo_disabled'),
    portalUrl: import.meta.env.VITE_STRIPE_PORTAL_URL || '/api/stripe/portal',
    checkoutSuccessUrl: `${window.location.origin}/app/settings?tab=subscription&status=success`,
    checkoutCancelUrl: `${window.location.origin}/app/settings?tab=subscription&status=cancelled`,
  };
};

const stripeConfig = getStripeConfig();

// =====================================================
// PRICING PLANS
// =====================================================

export type PlanInterval = 'month' | 'year';
export type PlanTier = 'starter' | 'professional' | 'business' | 'enterprise';

export interface PricingFeature {
  name: string;
  nameFr: string;
  included: boolean;
  limit?: string;
  limitFr?: string;
}

export interface PricingPlan {
  id: string;
  tier: PlanTier;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  
  // Stripe Price IDs (would be real Stripe IDs in production)
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  
  // Pricing
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  
  // Display
  popular?: boolean;
  badge?: string;
  badgeFr?: string;
  
  // Limits
  limits: {
    users: number; // -1 for unlimited
    connections: number;
    reports: number;
    storage: number; // in MB
    apiCalls: number;
  };
  
  // Features
  features: PricingFeature[];
}

// =====================================================
// ENTERPRISE-FOCUSED PRICING (2026)
// =====================================================
// 
// Target Market: Canadian enterprises with $2M-$20M+ annual revenue
// 
// Competitive Positioning:
// - Jirav: $500-2000/mo - We offer dedicated CPA support
// - Vena: $1000+/mo - We're simpler, faster time-to-value
// - Planful: $2000+/mo - We're better priced for mid-market
// 
// PlainLedger Value Proposition:
// - Dedicated CPA support included in all plans
// - AI-powered anomaly detection (unique differentiator)
// - Canada-first: Bilingual UI, data residency, GST/HST/PST

// Enterprise pricing plans
export const pricingPlans: PricingPlan[] = [
  {
    id: 'plan_essentiel',
    tier: 'starter',
    name: 'Essentiel',
    nameFr: 'Essentiel',
    description: 'For businesses $2M-$5M revenue',
    descriptionFr: 'Pour entreprises 2M$-5M$ de revenus',
    stripePriceIdMonthly: 'price_essentiel_monthly',
    stripePriceIdYearly: 'price_essentiel_yearly',
    priceMonthly: 500, // Base price, includes 3 users
    priceYearly: 4800, // 20% discount
    currency: 'CAD',
    limits: {
      users: 10, // Max 10, base includes 3, +$50/user
      connections: 3,
      reports: -1, // Unlimited
      storage: 25000, // 25GB
      apiCalls: 500,
    },
    features: [
      { name: '3 users included', nameFr: '3 utilisateurs inclus', included: true, limit: '+$50/user', limitFr: '+50$/util.' },
      { name: '3 data connections', nameFr: '3 connexions de données', included: true },
      { name: 'Unlimited reports', nameFr: 'Rapports illimités', included: true },
      { name: 'Anomaly detection', nameFr: 'Détection d\'anomalies', included: true },
      { name: 'Monthly reports', nameFr: 'Rapports mensuels', included: true },
      { name: 'CPA email support', nameFr: 'Support CPA par courriel', included: true },
      { name: 'Export (PDF/Excel)', nameFr: 'Export (PDF/Excel)', included: true },
      { name: 'API access', nameFr: 'Accès API', included: false },
    ],
  },
  {
    id: 'plan_professionnel',
    tier: 'professional',
    name: 'Professionnel',
    nameFr: 'Professionnel',
    description: 'For businesses $5M-$10M revenue',
    descriptionFr: 'Pour entreprises 5M$-10M$ de revenus',
    stripePriceIdMonthly: 'price_professionnel_monthly',
    stripePriceIdYearly: 'price_professionnel_yearly',
    priceMonthly: 1200, // Base price, includes 5 users
    priceYearly: 11520, // 20% discount
    currency: 'CAD',
    popular: true,
    badge: 'Most Popular',
    badgeFr: 'Plus populaire',
    limits: {
      users: 25, // Max 25, base includes 5, +$75/user
      connections: 10,
      reports: -1,
      storage: 100000, // 100GB
      apiCalls: 5000,
    },
    features: [
      { name: '5 users included', nameFr: '5 utilisateurs inclus', included: true, limit: '+$75/user', limitFr: '+75$/util.' },
      { name: '10 data connections', nameFr: '10 connexions de données', included: true },
      { name: 'Weekly reviews', nameFr: 'Revues hebdomadaires', included: true },
      { name: 'Priority CPA (48h)', nameFr: 'CPA prioritaire (48h)', included: true },
      { name: 'Cash flow forecasting', nameFr: 'Prévisions de trésorerie', included: true },
      { name: 'Budget vs Actual', nameFr: 'Budget vs Réel', included: true },
      { name: 'Slack & Teams alerts', nameFr: 'Alertes Slack & Teams', included: true },
      { name: 'Full API access', nameFr: 'Accès API complet', included: true },
    ],
  },
  {
    id: 'plan_premium',
    tier: 'business',
    name: 'Premium',
    nameFr: 'Premium',
    description: 'For businesses $10M-$20M revenue',
    descriptionFr: 'Pour entreprises 10M$-20M$ de revenus',
    stripePriceIdMonthly: 'price_premium_monthly',
    stripePriceIdYearly: 'price_premium_yearly',
    priceMonthly: 2500, // Base price, includes 10 users
    priceYearly: 24000, // 20% discount
    currency: 'CAD',
    limits: {
      users: 50, // Max 50, base includes 10, +$100/user
      connections: -1, // Unlimited
      reports: -1,
      storage: 500000, // 500GB
      apiCalls: -1, // Unlimited
    },
    features: [
      { name: '10 users included', nameFr: '10 utilisateurs inclus', included: true, limit: '+$100/user', limitFr: '+100$/util.' },
      { name: 'Unlimited connections', nameFr: 'Connexions illimitées', included: true },
      { name: 'Dedicated CPA', nameFr: 'CPA dédié', included: true },
      { name: 'Same-day response', nameFr: 'Réponse le jour même', included: true },
      { name: 'Multi-entity consolidation', nameFr: 'Consolidation multi-entités', included: true },
      { name: 'Board-ready reports', nameFr: 'Rapports pour CA', included: true },
      { name: 'Quarterly business review', nameFr: 'Revue trimestrielle', included: true },
      { name: 'Custom branding', nameFr: 'Marque personnalisée', included: true },
    ],
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Entreprise',
    description: 'For large organizations $20M+',
    descriptionFr: 'Pour grandes organisations 20M$+',
    stripePriceIdMonthly: 'price_enterprise_monthly',
    stripePriceIdYearly: 'price_enterprise_yearly',
    priceMonthly: 5000, // Starting price
    priceYearly: 45000, // 25% discount
    currency: 'CAD',
    limits: {
      users: -1, // Unlimited
      connections: -1,
      reports: -1,
      storage: -1,
      apiCalls: -1,
    },
    features: [
      { name: 'Unlimited users', nameFr: 'Utilisateurs illimités', included: true },
      { name: 'Unlimited connections', nameFr: 'Connexions illimitées', included: true },
      { name: 'Dedicated account manager', nameFr: 'Gestionnaire de compte dédié', included: true },
      { name: 'SSO (SAML/OIDC)', nameFr: 'SSO (SAML/OIDC)', included: true },
      { name: '99.9% SLA', nameFr: 'SLA 99.9%', included: true },
      { name: 'Custom onboarding', nameFr: 'Intégration personnalisée', included: true },
      { name: 'On-site training', nameFr: 'Formation sur site', included: true },
      { name: 'Custom integrations', nameFr: 'Intégrations personnalisées', included: true },
    ],
  },
];

// Per-seat pricing rates (for usage-based billing)
export const USER_PRICING = {
  starter: { includedUsers: 3, additionalUserPrice: 50, maxUsers: 10 },     // Essentiel
  professional: { includedUsers: 5, additionalUserPrice: 75, maxUsers: 25 }, // Professionnel
  business: { includedUsers: 10, additionalUserPrice: 100, maxUsers: 50 },   // Premium
  enterprise: { includedUsers: -1, additionalUserPrice: 0, maxUsers: -1 },   // Unlimited
} as const;

// =====================================================
// SUBSCRIPTION TYPES
// =====================================================

export type SubscriptionStatus = 
  | 'active' 
  | 'trialing' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid' 
  | 'incomplete' 
  | 'incomplete_expired';

export interface Subscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  planId: string;
  planTier: PlanTier;
  interval: PlanInterval;
  
  // Dates
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  trialStart?: string;
  trialEnd?: string;
  
  // Payment
  latestInvoiceId?: string;
  defaultPaymentMethodId?: string;
  
  // Usage (for metered billing)
  usage?: {
    reports: number;
    apiCalls: number;
    storage: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa_debit' | 'us_bank_account';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  dueDate?: string;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
}

// =====================================================
// STRIPE SERVICE
// =====================================================

class StripeService {
  private config: StripeConfig;

  constructor() {
    this.config = stripeConfig;
  }

  /**
   * Get all available pricing plans
   */
  getPlans(): PricingPlan[] {
    return pricingPlans;
  }

  /**
   * Get a specific plan by tier
   */
  getPlanByTier(tier: PlanTier): PricingPlan | undefined {
    return pricingPlans.find(p => p.tier === tier);
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = 'CAD', isEn: boolean = true): string {
    if (amount === 0) {
      return isEn ? 'Free' : 'Gratuit';
    }
    
    return new Intl.NumberFormat(isEn ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calculate yearly savings
   */
  calculateYearlySavings(plan: PricingPlan): number {
    const monthlyTotal = plan.priceMonthly * 12;
    return monthlyTotal - plan.priceYearly;
  }

  /**
   * Calculate yearly discount percentage
   */
  calculateYearlyDiscount(plan: PricingPlan): number {
    if (plan.priceMonthly === 0) return 0;
    const monthlyTotal = plan.priceMonthly * 12;
    return Math.round(((monthlyTotal - plan.priceYearly) / monthlyTotal) * 100);
  }

  /**
   * Create a Stripe Checkout session for upgrading/changing plan
   * In production, this would call your backend API
   */
  async createCheckoutSession(params: {
    planId: string;
    interval: PlanInterval;
    organizationId: string;
    userEmail: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ sessionId: string; url: string }> {
    const plan = pricingPlans.find(p => p.id === params.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const priceId = params.interval === 'year' 
      ? plan.stripePriceIdYearly 
      : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new Error('Price ID not configured for this plan');
    }

    // In production, this would be an API call to your backend
    // which creates the Stripe Checkout session
    console.log('Creating checkout session:', {
      priceId,
      customerEmail: params.userEmail,
      metadata: {
        organizationId: params.organizationId,
        planId: params.planId,
        interval: params.interval,
      },
      successUrl: params.successUrl || this.config.checkoutSuccessUrl,
      cancelUrl: params.cancelUrl || this.config.checkoutCancelUrl,
    });

    // Simulate API response - in production, return actual Stripe session
    return {
      sessionId: `cs_demo_${Date.now()}`,
      url: `https://checkout.stripe.com/demo?plan=${params.planId}&interval=${params.interval}`,
    };
  }

  /**
   * Get Stripe Customer Portal URL for managing subscription
   * In production, this would call your backend API
   */
  async getCustomerPortalUrl(params: {
    organizationId: string;
    returnUrl?: string;
  }): Promise<string> {
    // In production, this would be an API call to your backend
    // which creates a Stripe Customer Portal session
    console.log('Creating customer portal session:', {
      organizationId: params.organizationId,
      returnUrl: params.returnUrl || `${window.location.origin}/app/settings?tab=subscription`,
    });

    // Simulate API response - in production, return actual portal URL
    return `https://billing.stripe.com/demo/portal?org=${params.organizationId}`;
  }

  /**
   * Get current subscription for an organization
   * In production, this would call your backend API
   */
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return mock subscription - in production, fetch from your API
    return {
      id: 'sub_demo_123',
      customerId: 'cus_demo_123',
      status: 'active',
      planId: 'plan_professionnel',
      planTier: 'professional',
      interval: 'month',
      currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      usage: {
        reports: 45,
        apiCalls: 2340,
        storage: 1250,
      },
    };
  }

  /**
   * Get payment methods for an organization
   * In production, this would call your backend API
   */
  async getPaymentMethods(organizationId: string): Promise<PaymentMethod[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return mock payment methods
    return [
      {
        id: 'pm_demo_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2027,
        },
        isDefault: true,
      },
    ];
  }

  /**
   * Get invoices for an organization
   * In production, this would call your backend API
   */
  async getInvoices(organizationId: string, limit: number = 10): Promise<Invoice[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return mock invoices
    const now = Date.now();
    return [
      {
        id: 'inv_demo_001',
        number: 'INV-2026-001',
        status: 'paid',
        amountDue: 14900,
        amountPaid: 14900,
        currency: 'cad',
        created: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
        pdfUrl: '#',
        hostedInvoiceUrl: '#',
      },
      {
        id: 'inv_demo_002',
        number: 'INV-2025-012',
        status: 'paid',
        amountDue: 14900,
        amountPaid: 14900,
        currency: 'cad',
        created: new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString(),
        pdfUrl: '#',
        hostedInvoiceUrl: '#',
      },
      {
        id: 'inv_demo_003',
        number: 'INV-2025-011',
        status: 'paid',
        amountDue: 14900,
        amountPaid: 14900,
        currency: 'cad',
        created: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
        pdfUrl: '#',
        hostedInvoiceUrl: '#',
      },
    ];
  }

  /**
   * Cancel subscription at period end
   * In production, this would call your backend API
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log('Canceling subscription:', subscriptionId);
    // In production, call API to cancel via Stripe
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Resume a canceled subscription
   * In production, this would call your backend API
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    console.log('Resuming subscription:', subscriptionId);
    // In production, call API to resume via Stripe
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Schedule a meeting for enterprise plan
   */
  openScheduleMeeting(): void {
    window.open('https://calendly.com/anthonypaquet1508/15min', '_blank');
  }
}

export const stripeService = new StripeService();
export default stripeService;
