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

const stripeConfig: StripeConfig = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_demo',
  portalUrl: import.meta.env.VITE_STRIPE_PORTAL_URL || '/api/stripe/portal',
  checkoutSuccessUrl: `${window.location.origin}/app/settings?tab=subscription&status=success`,
  checkoutCancelUrl: `${window.location.origin}/app/settings?tab=subscription&status=cancelled`,
};

// =====================================================
// PRICING PLANS
// =====================================================

export type PlanInterval = 'month' | 'year';
export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise';

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
// USAGE-BASED PRICING MODEL (2026)
// =====================================================
// 
// Canadian Market Competitive Analysis:
// - QuickBooks Online Plus: $60 CAD/mo + $11/user
// - Xero Growing: $45 CAD/mo + $5/user
// - Sage Business Cloud: $35 CAD/mo + $15/user
// - Fathom Analytics: ~$80 CAD/mo (flat)
// 
// PlainLedger Positioning:
// - Complementary to accounting software (not replacement)
// - AI-powered anomaly detection (unique)
// - Canada-first: Bilingual UI, GST/HST/PST, local support

// Dynamic pricing plans with user-based scaling
export const pricingPlans: PricingPlan[] = [
  {
    id: 'plan_free',
    tier: 'free',
    name: 'Free',
    nameFr: 'Gratuit',
    description: 'Try PlainLedger risk-free',
    descriptionFr: 'Essayez PlainLedger sans risque',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'CAD',
    limits: {
      users: 1, // Fixed, no additional users
      connections: 1,
      reports: 5,
      storage: 100, // 100MB
      apiCalls: 0,
    },
    features: [
      { name: '1 user', nameFr: '1 utilisateur', included: true },
      { name: '1 data connection', nameFr: '1 connexion de données', included: true },
      { name: '5 reports/month', nameFr: '5 rapports/mois', included: true },
      { name: 'Basic dashboard', nameFr: 'Tableau de bord de base', included: true },
      { name: 'Community support', nameFr: 'Support communautaire', included: true },
      { name: 'Anomaly detection', nameFr: 'Détection d\'anomalies', included: false },
      { name: 'Team collaboration', nameFr: 'Collaboration d\'équipe', included: false },
      { name: 'Export (PDF/Excel)', nameFr: 'Export (PDF/Excel)', included: false },
    ],
  },
  {
    id: 'plan_starter',
    tier: 'starter',
    name: 'Starter',
    nameFr: 'Démarrage',
    description: 'For small businesses & freelancers',
    descriptionFr: 'Pour les petites entreprises et travailleurs autonomes',
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdYearly: 'price_starter_yearly',
    priceMonthly: 39, // Base price, includes 2 users
    priceYearly: 374, // 20% discount
    currency: 'CAD',
    limits: {
      users: 5, // Max 5, base includes 2, +$12/user
      connections: 2,
      reports: 25,
      storage: 1000, // 1GB
      apiCalls: 500,
    },
    features: [
      { name: '2 users included', nameFr: '2 utilisateurs inclus', included: true, limit: '+$12/user', limitFr: '+12$/util.' },
      { name: '2 data connections', nameFr: '2 connexions de données', included: true },
      { name: '25 reports/month', nameFr: '25 rapports/mois', included: true },
      { name: 'Smart dashboard', nameFr: 'Tableau de bord intelligent', included: true },
      { name: 'Basic anomaly detection', nameFr: 'Détection d\'anomalies de base', included: true },
      { name: 'Email support', nameFr: 'Support par courriel', included: true },
      { name: 'Export (PDF/Excel)', nameFr: 'Export (PDF/Excel)', included: true },
      { name: 'API access', nameFr: 'Accès API', included: false },
    ],
  },
  {
    id: 'plan_professional',
    tier: 'professional',
    name: 'Professional',
    nameFr: 'Professionnel',
    description: 'For growing teams with advanced needs',
    descriptionFr: 'Pour les équipes en croissance avec besoins avancés',
    stripePriceIdMonthly: 'price_professional_monthly',
    stripePriceIdYearly: 'price_professional_yearly',
    priceMonthly: 99, // Base price, includes 5 users
    priceYearly: 950, // 20% discount
    currency: 'CAD',
    popular: true,
    badge: 'Most Popular',
    badgeFr: 'Plus populaire',
    limits: {
      users: 25, // Max 25, base includes 5, +$15/user
      connections: 5,
      reports: 100,
      storage: 5000, // 5GB
      apiCalls: 5000,
    },
    features: [
      { name: '5 users included', nameFr: '5 utilisateurs inclus', included: true, limit: '+$15/user', limitFr: '+15$/util.' },
      { name: '5 data connections', nameFr: '5 connexions de données', included: true },
      { name: '100 reports/month', nameFr: '100 rapports/mois', included: true },
      { name: 'Advanced AI detection', nameFr: 'Détection IA avancée', included: true },
      { name: 'Budget vs Actual', nameFr: 'Budget vs Réel', included: true },
      { name: 'Priority support', nameFr: 'Support prioritaire', included: true },
      { name: 'Full API access', nameFr: 'Accès API complet', included: true },
      { name: 'Custom branding', nameFr: 'Marque personnalisée', included: true },
    ],
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameFr: 'Entreprise',
    description: 'For large organizations & accounting firms',
    descriptionFr: 'Pour les grandes organisations et cabinets comptables',
    stripePriceIdMonthly: 'price_enterprise_monthly',
    stripePriceIdYearly: 'price_enterprise_yearly',
    priceMonthly: 0, // Custom pricing, starts ~$299
    priceYearly: 0,
    currency: 'CAD',
    badge: 'Custom',
    badgeFr: 'Sur mesure',
    limits: {
      users: -1, // Unlimited, volume discount at $12/user
      connections: -1,
      reports: -1,
      storage: -1,
      apiCalls: -1,
    },
    features: [
      { name: '10+ users included', nameFr: '10+ utilisateurs inclus', included: true, limit: 'Volume discount', limitFr: 'Remise volume' },
      { name: 'Unlimited connections', nameFr: 'Connexions illimitées', included: true },
      { name: 'Unlimited reports', nameFr: 'Rapports illimités', included: true },
      { name: 'Dedicated account manager', nameFr: 'Gestionnaire de compte dédié', included: true },
      { name: 'SSO (SAML/OIDC)', nameFr: 'SSO (SAML/OIDC)', included: true },
      { name: '99.9% SLA', nameFr: 'SLA 99.9%', included: true },
      { name: 'Custom integrations', nameFr: 'Intégrations personnalisées', included: true },
      { name: 'On-premise option', nameFr: 'Option sur site', included: true },
    ],
  },
];

// Per-seat pricing rates (for usage-based billing)
export const USER_PRICING = {
  starter: { includedUsers: 2, additionalUserPrice: 12, maxUsers: 5 },
  professional: { includedUsers: 5, additionalUserPrice: 15, maxUsers: 25 },
  enterprise: { includedUsers: 10, additionalUserPrice: 12, maxUsers: -1 }, // Volume discount
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
      planId: 'plan_professional',
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
   * Contact sales for enterprise plan
   */
  openContactSales(): void {
    window.open('mailto:sales@plainledger.com?subject=Enterprise%20Plan%20Inquiry', '_blank');
  }
}

export const stripeService = new StripeService();
export default stripeService;
