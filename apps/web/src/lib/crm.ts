/**
 * CRM Integration Service
 * Manages customer data sync with HubSpot/Salesforce
 * Tracks customer lifecycle, deals, and interactions
 */

// CRM configuration
const CRM_CONFIG = {
  provider: (import.meta.env.VITE_CRM_PROVIDER as 'hubspot' | 'salesforce' | 'none') || 'none',
  hubspot: {
    portalId: import.meta.env.VITE_HUBSPOT_PORTAL_ID || '',
    apiKey: import.meta.env.VITE_HUBSPOT_API_KEY || '',
    enabled: !!import.meta.env.VITE_HUBSPOT_PORTAL_ID,
  },
  salesforce: {
    instanceUrl: import.meta.env.VITE_SALESFORCE_INSTANCE_URL || '',
    clientId: import.meta.env.VITE_SALESFORCE_CLIENT_ID || '',
    enabled: !!import.meta.env.VITE_SALESFORCE_INSTANCE_URL,
  },
  debug: import.meta.env.DEV,
};

// =====================================================
// TYPES
// =====================================================

export interface CRMContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  // Lifecycle
  lifecycleStage?: LifecycleStage;
  leadSource?: LeadSource;
  leadStatus?: LeadStatus;
  // Custom properties
  properties?: Record<string, string | number | boolean | null>;
}

export interface CRMCompany {
  id?: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  annualRevenue?: number;
  country?: string;
  city?: string;
  // Custom properties
  properties?: Record<string, string | number | boolean | null>;
}

export interface CRMDeal {
  id?: string;
  name: string;
  stage: DealStage;
  amount?: number;
  currency?: string;
  closeDate?: string;
  probability?: number;
  // Associations
  contactId?: string;
  companyId?: string;
  // Custom properties
  properties?: Record<string, string | number | boolean | null>;
}

export interface CRMActivity {
  type: ActivityType;
  subject: string;
  body?: string;
  timestamp?: string;
  // Associations
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

// Enums
export type LifecycleStage = 
  | 'subscriber'
  | 'lead'
  | 'marketing_qualified_lead'
  | 'sales_qualified_lead'
  | 'opportunity'
  | 'customer'
  | 'evangelist'
  | 'other';

export type LeadSource =
  | 'organic_search'
  | 'paid_search'
  | 'social_media'
  | 'referral'
  | 'direct'
  | 'email_marketing'
  | 'partner'
  | 'other';

export type LeadStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'open_deal'
  | 'unqualified'
  | 'attempted_to_contact'
  | 'connected'
  | 'bad_timing';

export type DealStage =
  | 'appointment_scheduled'
  | 'qualified_to_buy'
  | 'presentation_scheduled'
  | 'decision_maker_bought_in'
  | 'contract_sent'
  | 'closed_won'
  | 'closed_lost';

export type CompanySize =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1001-5000'
  | '5001+';

export type ActivityType =
  | 'note'
  | 'email'
  | 'call'
  | 'meeting'
  | 'task'
  | 'signup'
  | 'trial_started'
  | 'subscription_started'
  | 'feature_used';

// =====================================================
// CRM SERVICE CLASS
// =====================================================

class CRMService {
  private apiEndpoint: string;
  
  constructor() {
    // In production, this would point to your backend API that handles CRM sync
    this.apiEndpoint = import.meta.env.VITE_API_URL || '/api';
  }

  // =====================================================
  // CONTACT MANAGEMENT
  // =====================================================

  /**
   * Create or update a contact in the CRM
   */
  async upsertContact(contact: CRMContact): Promise<CRMContact | null> {
    try {
      this.log('upsertContact', contact);
      
      // In production, call backend API
      const response = await this.apiCall('/crm/contacts', 'POST', contact);
      return response;
    } catch (error) {
      console.error('CRM: Failed to upsert contact', error);
      return null;
    }
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<CRMContact | null> {
    try {
      const response = await this.apiCall(`/crm/contacts/email/${encodeURIComponent(email)}`, 'GET');
      return response;
    } catch (error) {
      this.log('Contact not found', email);
      return null;
    }
  }

  /**
   * Update contact lifecycle stage
   */
  async updateLifecycleStage(email: string, stage: LifecycleStage): Promise<void> {
    await this.upsertContact({
      email,
      lifecycleStage: stage,
    });
  }

  // =====================================================
  // COMPANY MANAGEMENT
  // =====================================================

  /**
   * Create or update a company
   */
  async upsertCompany(company: CRMCompany): Promise<CRMCompany | null> {
    try {
      this.log('upsertCompany', company);
      const response = await this.apiCall('/crm/companies', 'POST', company);
      return response;
    } catch (error) {
      console.error('CRM: Failed to upsert company', error);
      return null;
    }
  }

  /**
   * Associate contact with company
   */
  async associateContactWithCompany(contactId: string, companyId: string): Promise<void> {
    try {
      await this.apiCall('/crm/associations', 'POST', {
        type: 'contact_to_company',
        fromId: contactId,
        toId: companyId,
      });
    } catch (error) {
      console.error('CRM: Failed to associate contact with company', error);
    }
  }

  // =====================================================
  // DEAL MANAGEMENT
  // =====================================================

  /**
   * Create a deal (opportunity)
   */
  async createDeal(deal: CRMDeal): Promise<CRMDeal | null> {
    try {
      this.log('createDeal', deal);
      const response = await this.apiCall('/crm/deals', 'POST', deal);
      return response;
    } catch (error) {
      console.error('CRM: Failed to create deal', error);
      return null;
    }
  }

  /**
   * Update deal stage
   */
  async updateDealStage(dealId: string, stage: DealStage): Promise<void> {
    try {
      await this.apiCall(`/crm/deals/${dealId}`, 'PATCH', { stage });
    } catch (error) {
      console.error('CRM: Failed to update deal stage', error);
    }
  }

  /**
   * Close deal as won
   */
  async closeDealWon(dealId: string, amount?: number): Promise<void> {
    await this.updateDealStage(dealId, 'closed_won');
    if (amount !== undefined) {
      await this.apiCall(`/crm/deals/${dealId}`, 'PATCH', { 
        amount,
        closeDate: new Date().toISOString(),
      });
    }
  }

  /**
   * Close deal as lost
   */
  async closeDealLost(dealId: string, reason?: string): Promise<void> {
    await this.updateDealStage(dealId, 'closed_lost');
    if (reason) {
      await this.apiCall(`/crm/deals/${dealId}`, 'PATCH', { 
        properties: { lost_reason: reason },
        closeDate: new Date().toISOString(),
      });
    }
  }

  // =====================================================
  // ACTIVITY TRACKING
  // =====================================================

  /**
   * Log an activity/interaction
   */
  async logActivity(activity: CRMActivity): Promise<void> {
    try {
      this.log('logActivity', activity);
      await this.apiCall('/crm/activities', 'POST', {
        ...activity,
        timestamp: activity.timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('CRM: Failed to log activity', error);
    }
  }

  // =====================================================
  // ONBOARDING SPECIFIC METHODS
  // =====================================================

  /**
   * Track new signup
   */
  async trackSignup(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source?: LeadSource;
    plan?: string;
  }): Promise<CRMContact | null> {
    // Create/update contact
    const contact = await this.upsertContact({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      lifecycleStage: 'lead',
      leadSource: data.source || 'direct',
      leadStatus: 'new',
      properties: {
        signup_date: new Date().toISOString(),
        initial_plan: data.plan || 'free',
      },
    });

    // Log signup activity
    if (contact?.id) {
      await this.logActivity({
        type: 'signup',
        subject: 'New signup',
        body: `User signed up for ${data.plan || 'free'} plan`,
        contactId: contact.id,
      });
    }

    return contact;
  }

  /**
   * Track trial start
   */
  async trackTrialStart(email: string, trialDays: number, plan: string): Promise<void> {
    await this.upsertContact({
      email,
      lifecycleStage: 'marketing_qualified_lead',
      properties: {
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
        trial_plan: plan,
      },
    });

    const contact = await this.getContactByEmail(email);
    if (contact?.id) {
      await this.logActivity({
        type: 'trial_started',
        subject: 'Trial started',
        body: `Started ${trialDays}-day trial for ${plan} plan`,
        contactId: contact.id,
      });
    }
  }

  /**
   * Track subscription conversion
   */
  async trackSubscriptionStarted(data: {
    email: string;
    plan: string;
    amount: number;
    billingCycle: 'monthly' | 'yearly';
  }): Promise<void> {
    // Update contact to customer
    await this.upsertContact({
      email: data.email,
      lifecycleStage: 'customer',
      properties: {
        subscription_start_date: new Date().toISOString(),
        subscription_plan: data.plan,
        subscription_mrr: data.billingCycle === 'monthly' ? data.amount : data.amount / 12,
        subscription_billing_cycle: data.billingCycle,
      },
    });

    const contact = await this.getContactByEmail(data.email);
    if (contact?.id) {
      // Create closed-won deal
      await this.createDeal({
        name: `${data.email} - ${data.plan} Subscription`,
        stage: 'closed_won',
        amount: data.billingCycle === 'yearly' ? data.amount : data.amount * 12,
        currency: 'CAD',
        contactId: contact.id,
        properties: {
          plan: data.plan,
          billing_cycle: data.billingCycle,
        },
      });

      await this.logActivity({
        type: 'subscription_started',
        subject: 'Subscription started',
        body: `Subscribed to ${data.plan} plan (${data.billingCycle})`,
        contactId: contact.id,
      });
    }
  }

  /**
   * Track onboarding progress
   */
  async trackOnboardingProgress(email: string, step: string, completed: boolean): Promise<void> {
    await this.upsertContact({
      email,
      properties: {
        onboarding_current_step: step,
        onboarding_step_completed: completed,
        onboarding_last_activity: new Date().toISOString(),
      },
    });
  }

  /**
   * Track onboarding completion
   */
  async trackOnboardingCompleted(email: string, data: {
    totalTime?: number;
    sourceConnected?: boolean;
    teamInvited?: boolean;
  }): Promise<void> {
    await this.upsertContact({
      email,
      properties: {
        onboarding_completed: true,
        onboarding_completed_date: new Date().toISOString(),
        onboarding_total_time_seconds: data.totalTime || 0,
        onboarding_source_connected: data.sourceConnected || false,
        onboarding_team_invited: data.teamInvited || false,
      },
    });
  }

  /**
   * Track feature usage for customer success
   */
  async trackFeatureUsage(email: string, feature: string): Promise<void> {
    const contact = await this.getContactByEmail(email);
    if (contact?.id) {
      await this.logActivity({
        type: 'feature_used',
        subject: `Used ${feature}`,
        body: `User used the ${feature} feature`,
        contactId: contact.id,
      });
    }
  }

  // =====================================================
  // HUBSPOT FORMS (Client-side tracking)
  // =====================================================

  /**
   * Submit to HubSpot form (for landing page conversions)
   */
  async submitHubSpotForm(formId: string, fields: Record<string, string>): Promise<boolean> {
    if (!CRM_CONFIG.hubspot.enabled) {
      this.log('HubSpot not configured, skipping form submission');
      return false;
    }

    try {
      const portalId = CRM_CONFIG.hubspot.portalId;
      const response = await fetch(
        `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: Object.entries(fields).map(([name, value]) => ({
              name,
              value,
            })),
            context: {
              pageUri: window.location.href,
              pageName: document.title,
            },
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to submit HubSpot form:', error);
      return false;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private async apiCall(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    data?: any
  ): Promise<any> {
    // In dev mode, just log the call
    if (CRM_CONFIG.debug && CRM_CONFIG.provider === 'none') {
      this.log(`API ${method} ${endpoint}`, data);
      return data; // Return mock data
    }

    const response = await fetch(`${this.apiEndpoint}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`CRM API error: ${response.status}`);
    }

    return response.json();
  }

  private log(message: string, data?: any): void {
    if (CRM_CONFIG.debug) {
      console.log(`[CRM] ${message}`, data || '');
    }
  }

  /**
   * Check if CRM is configured
   */
  isConfigured(): boolean {
    return CRM_CONFIG.hubspot.enabled || CRM_CONFIG.salesforce.enabled;
  }

  /**
   * Get active CRM provider
   */
  getProvider(): 'hubspot' | 'salesforce' | 'none' {
    return CRM_CONFIG.provider;
  }
}

// Export singleton instance
export const crmService = new CRMService();
export default crmService;
