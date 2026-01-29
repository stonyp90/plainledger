/**
 * Customer Journey Tracking Service
 * Tracks user progression through the GTM funnel and triggers appropriate actions
 *
 * Journey Stages:
 * 1. signup - Just registered
 * 2. onboarding - Started onboarding wizard
 * 3. activated - Connected first data source
 * 4. engaged - Generated first report
 * 5. trial - Started paid trial
 * 6. converted - Paid customer
 * 7. churned - Cancelled/inactive
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan, IsNull, Not, In } from "typeorm";
import {
  UserProfileEntity,
  JourneyStage,
} from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { NovuService } from "@infrastructure/notifications/novu.service";
import { HubSpotService } from "@infrastructure/crm/hubspot.service";

// ============================================================================
// Types
// ============================================================================

export interface JourneyData {
  signupAt: string;
  emailVerifiedAt?: string;
  onboardingStartedAt?: string;
  onboardingCompletedAt?: string;
  firstConnectionAt?: string;
  firstReportAt?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  convertedAt?: string;
  churnedAt?: string;
  lastActiveAt: string;
  daysActive: number;
  sessionsCount: number;
  featuresUsed: string[];
  lastJourneyEmailSentAt?: string;
  journeyEmailsSent: string[];
}

export interface JourneyEmailCandidate {
  userId: string;
  email: string;
  firstName: string;
  journeyStage: JourneyStage;
  journeyData: JourneyData;
  workflowId: string;
  daysSinceSignup: number;
  reason: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class JourneyTrackingService {
  private readonly logger = new Logger(JourneyTrackingService.name);

  constructor(
    @InjectRepository(UserProfileEntity)
    private userProfileRepository: Repository<UserProfileEntity>,
    private novuService: NovuService,
    private hubspotService: HubSpotService,
  ) {}

  // ---------------------------------------------------------------------------
  // Stage Transition Methods
  // ---------------------------------------------------------------------------

  /**
   * Record user signup
   */
  async recordSignup(userId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    
    const now = new Date().toISOString();
    const journeyData: JourneyData = {
      signupAt: now,
      lastActiveAt: now,
      daysActive: 0,
      sessionsCount: 1,
      featuresUsed: [],
      journeyEmailsSent: [],
    };

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "signup",
        journeyData,
      },
    );

    // Sync to HubSpot CRM
    if (user) {
      try {
        await this.hubspotService.syncSignup({
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
        });
      } catch (error) {
        this.logger.error(`Failed to sync signup to HubSpot: ${error.message}`);
      }
    }

    this.logger.log(`Journey: User ${userId} recorded signup`);
  }

  /**
   * Record email verification
   */
  async recordEmailVerified(userId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = this.updateJourneyData(user.journeyData, {
      emailVerifiedAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      { journeyData },
    );

    this.logger.log(`Journey: User ${userId} verified email`);
  }

  /**
   * Record onboarding started
   */
  async recordOnboardingStarted(userId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = this.updateJourneyData(user.journeyData, {
      onboardingStartedAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "onboarding",
        journeyData,
      },
    );

    this.logger.log(`Journey: User ${userId} started onboarding`);
  }

  /**
   * Record onboarding completed
   */
  async recordOnboardingCompleted(userId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = this.updateJourneyData(user.journeyData, {
      onboardingCompletedAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      { journeyData },
    );

    this.logger.log(`Journey: User ${userId} completed onboarding`);
  }

  /**
   * Record first connection (data source connected)
   */
  async recordFirstConnection(userId: string, providerName: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Only update if this is truly the first connection
    if (user.journeyData?.firstConnectionAt) {
      this.logger.debug(`Journey: User ${userId} already has first connection`);
      return;
    }

    const journeyData = this.updateJourneyData(user.journeyData, {
      firstConnectionAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "activated",
        journeyData,
      },
    );

    // Send first connection notification via Novu
    try {
      await this.novuService.sendFirstConnection(userId, {
        firstName: user.firstName,
        providerName,
      });
    } catch (error) {
      this.logger.error(`Failed to send first connection notification: ${error.message}`);
    }

    // Sync activation to HubSpot CRM
    try {
      await this.hubspotService.syncActivation(user.email, 1);
    } catch (error) {
      this.logger.error(`Failed to sync activation to HubSpot: ${error.message}`);
    }

    this.logger.log(`Journey: User ${userId} connected first data source (${providerName})`);
  }

  /**
   * Record first report generated
   */
  async recordFirstReport(userId: string, reportType: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // Only update if this is truly the first report
    if (user.journeyData?.firstReportAt) {
      this.logger.debug(`Journey: User ${userId} already has first report`);
      return;
    }

    const journeyData = this.updateJourneyData(user.journeyData, {
      firstReportAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "engaged",
        journeyData,
      },
    );

    this.logger.log(`Journey: User ${userId} generated first report (${reportType})`);
  }

  /**
   * Record trial started
   */
  async recordTrialStarted(userId: string, trialDays: number = 14, tier: string = 'pro'): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const now = new Date();
    const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const journeyData = this.updateJourneyData(user.journeyData, {
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnds.toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "trial",
        journeyData,
      },
    );

    // Sync trial to HubSpot CRM (creates deal)
    try {
      await this.hubspotService.syncTrialStart({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tier,
        trialEndDate: trialEnds,
      });
    } catch (error) {
      this.logger.error(`Failed to sync trial to HubSpot: ${error.message}`);
    }

    this.logger.log(`Journey: User ${userId} started trial (ends ${trialEnds.toISOString()})`);
  }

  /**
   * Record conversion (paid subscription)
   */
  async recordConversion(userId: string, subscription?: { tier: string; amount: number; billingCycle: 'monthly' | 'yearly' }): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = this.updateJourneyData(user.journeyData, {
      convertedAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "converted",
        journeyData,
      },
    );

    // Sync conversion to HubSpot CRM
    if (subscription) {
      try {
        await this.hubspotService.syncConversion({
          email: user.email,
          tier: subscription.tier,
          amount: subscription.amount,
          billingCycle: subscription.billingCycle,
        });
      } catch (error) {
        this.logger.error(`Failed to sync conversion to HubSpot: ${error.message}`);
      }
    }

    this.logger.log(`Journey: User ${userId} converted to paid`);
  }

  /**
   * Record churn (cancellation or inactivity)
   */
  async recordChurn(userId: string, reason?: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = this.updateJourneyData(user.journeyData, {
      churnedAt: new Date().toISOString(),
    });

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyStage: "churned",
        journeyData,
      },
    );

    // Sync churn to HubSpot CRM
    try {
      await this.hubspotService.syncChurn(user.email, reason);
    } catch (error) {
      this.logger.error(`Failed to sync churn to HubSpot: ${error.message}`);
    }

    this.logger.log(`Journey: User ${userId} churned`);
  }

  // ---------------------------------------------------------------------------
  // Activity Tracking
  // ---------------------------------------------------------------------------

  /**
   * Record user activity (login, page view, etc.)
   */
  async recordActivity(userId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = user.journeyData || this.getDefaultJourneyData();
    const signupDate = new Date(journeyData.signupAt);
    const now = new Date();
    const daysActive = Math.floor(
      (now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    journeyData.lastActiveAt = now.toISOString();
    journeyData.daysActive = daysActive;
    journeyData.sessionsCount = (journeyData.sessionsCount || 0) + 1;

    await this.userProfileRepository.update(
      { id: userId },
      { journeyData },
    );
  }

  /**
   * Record feature usage
   */
  async recordFeatureUsage(userId: string, feature: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = user.journeyData || this.getDefaultJourneyData();
    if (!journeyData.featuresUsed.includes(feature)) {
      journeyData.featuresUsed.push(feature);
    }

    await this.userProfileRepository.update(
      { id: userId },
      { journeyData },
    );
  }

  // ---------------------------------------------------------------------------
  // Email Candidate Selection (for daily job)
  // ---------------------------------------------------------------------------

  /**
   * Get users who should receive journey emails today
   */
  async getJourneyEmailCandidates(): Promise<JourneyEmailCandidate[]> {
    const candidates: JourneyEmailCandidate[] = [];
    const now = new Date();

    // Get all users with valid emails who haven't unsubscribed
    const users = await this.userProfileRepository.find({
      where: {
        emailValid: true,
        isActive: true,
      },
    });

    for (const user of users) {
      // Skip if unsubscribed from marketing
      if (user.emailPreferences?.marketingOptIn === false) {
        continue;
      }

      const journeyData = user.journeyData || this.getDefaultJourneyData();
      const signupDate = new Date(journeyData.signupAt);
      const daysSinceSignup = Math.floor(
        (now.getTime() - signupDate.getTime()) / (24 * 60 * 60 * 1000),
      );

      // Check last email sent (prevent over-emailing)
      if (journeyData.lastJourneyEmailSentAt) {
        const hoursSinceLastEmail =
          (now.getTime() - new Date(journeyData.lastJourneyEmailSentAt).getTime()) /
          (60 * 60 * 1000);
        if (hoursSinceLastEmail < 24) {
          continue; // Don't send more than once per day
        }
      }

      // Determine which email to send based on stage and timing
      const workflowId = this.determineJourneyEmail(
        user.journeyStage,
        journeyData,
        daysSinceSignup,
      );

      if (workflowId && !journeyData.journeyEmailsSent.includes(workflowId)) {
        candidates.push({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          journeyStage: user.journeyStage,
          journeyData,
          workflowId,
          daysSinceSignup,
          reason: `Stage: ${user.journeyStage}, Day: ${daysSinceSignup}`,
        });
      }
    }

    return candidates;
  }

  /**
   * Determine which journey email to send based on current state
   */
  private determineJourneyEmail(
    stage: JourneyStage,
    data: JourneyData,
    daysSinceSignup: number,
  ): string | null {
    // Signup stage - not yet activated
    if (stage === "signup" || stage === "onboarding") {
      if (!data.firstConnectionAt) {
        // No connection yet
        if (daysSinceSignup === 1 && !data.journeyEmailsSent.includes("journey_day_1")) {
          return "journey_day_1"; // "Connect your accounting software"
        }
        if (daysSinceSignup === 3 && !data.journeyEmailsSent.includes("journey_day_3")) {
          return "journey_day_3"; // "Schedule onboarding call"
        }
        if (daysSinceSignup === 7 && !data.journeyEmailsSent.includes("journey_day_7")) {
          return "journey_day_7"; // "Need help? Book a demo"
        }
      }
    }

    // Activated stage - connected but no report
    if (stage === "activated") {
      if (!data.firstReportAt) {
        if (daysSinceSignup >= 2 && !data.journeyEmailsSent.includes("journey_first_dashboard")) {
          return "journey_first_dashboard"; // "Your dashboard is ready"
        }
      }
    }

    // Trial stage - remind before expiration
    if (stage === "trial" && data.trialEndsAt) {
      const trialEnds = new Date(data.trialEndsAt);
      const daysUntilTrialEnds = Math.floor(
        (trialEnds.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysUntilTrialEnds === 3 && !data.journeyEmailsSent.includes("journey_trial_reminder_3")) {
        return "journey_trial_reminder_3"; // "3 days left"
      }
      if (daysUntilTrialEnds === 1 && !data.journeyEmailsSent.includes("journey_trial_reminder_1")) {
        return "journey_trial_reminder_1"; // "Last day!"
      }
    }

    // Winback for inactive users
    const lastActive = new Date(data.lastActiveAt);
    const daysSinceActive = Math.floor(
      (new Date().getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysSinceActive >= 14 && !data.journeyEmailsSent.includes("journey_winback")) {
      return "journey_winback"; // "We miss you"
    }

    return null;
  }

  /**
   * Mark journey email as sent
   */
  async markJourneyEmailSent(userId: string, workflowId: string): Promise<void> {
    const user = await this.userProfileRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const journeyData = user.journeyData || this.getDefaultJourneyData();
    journeyData.lastJourneyEmailSentAt = new Date().toISOString();
    if (!journeyData.journeyEmailsSent.includes(workflowId)) {
      journeyData.journeyEmailsSent.push(workflowId);
    }

    await this.userProfileRepository.update(
      { id: userId },
      {
        journeyData,
        lastEmailSentAt: new Date(),
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getDefaultJourneyData(): JourneyData {
    return {
      signupAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      daysActive: 0,
      sessionsCount: 0,
      featuresUsed: [],
      journeyEmailsSent: [],
    };
  }

  private updateJourneyData(
    existing: JourneyData | undefined,
    updates: Partial<JourneyData>,
  ): JourneyData {
    const data = existing || this.getDefaultJourneyData();
    return {
      ...data,
      ...updates,
      lastActiveAt: new Date().toISOString(),
    };
  }
}
