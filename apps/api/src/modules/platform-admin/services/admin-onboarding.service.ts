import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { OnboardingProgressEntity } from '../entities/onboarding-progress.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';

export interface OnboardingFunnelMetrics {
  signups: number;
  connectedDatasource: number;
  firstSync: number;
  viewedReport: number;
  converted: number;
  conversionRate: number;
}

export interface TrialOrg {
  id: string;
  name: string;
  tenantId: string;
  trialStartDate: Date;
  trialEndDate: Date;
  daysRemaining: number;
  onboardingStatus: string;
  lastActivity?: Date;
  progressSteps: number;
  totalSteps: number;
}

@Injectable()
export class AdminOnboardingService {
  private readonly logger = new Logger(AdminOnboardingService.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
    @InjectRepository(OnboardingProgressEntity)
    private readonly progressRepository: Repository<OnboardingProgressEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userRepository: Repository<UserProfileEntity>,
  ) {}

  /**
   * Get conversion funnel metrics
   */
  async getFunnelMetrics(): Promise<OnboardingFunnelMetrics> {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total signups (organizations created)
    const signups = await this.orgRepository.count({
      where: {
        createdAt: MoreThan(last30Days),
      },
    });

    // Connected datasource (has onboarding progress for connect_datasource)
    const connectedDatasource = await this.progressRepository.count({
      where: {
        stepKey: 'connect_datasource',
        completedAt: MoreThan(last30Days),
      },
    });

    // First sync (has onboarding progress for first_sync)
    const firstSync = await this.progressRepository.count({
      where: {
        stepKey: 'first_sync',
        completedAt: MoreThan(last30Days),
      },
    });

    // Viewed report (has onboarding progress for view_report)
    const viewedReport = await this.progressRepository.count({
      where: {
        stepKey: 'view_report',
        completedAt: MoreThan(last30Days),
      },
    });

    // Converted (has convertedAt date)
    const converted = await this.orgRepository.count({
      where: {
        convertedAt: MoreThan(last30Days),
      },
    });

    const conversionRate = signups > 0 ? (converted / signups) * 100 : 0;

    return {
      signups,
      connectedDatasource,
      firstSync,
      viewedReport,
      converted,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Get active trials
   */
  async getActiveTrials(): Promise<TrialOrg[]> {
    const now = new Date();
    const trials = await this.orgRepository.find({
      where: {
        onboardingStatus: 'trial',
        trialEndDate: MoreThan(now),
      },
      order: {
        trialEndDate: 'ASC',
      },
    });

    // Get progress for each trial org
    const trialOrgs = await Promise.all(
      trials.map(async (org) => {
        const progress = await this.progressRepository.find({
          where: { organizationId: org.id },
        });

        // Get last activity (most recent progress or org update)
        const lastProgress = progress.length > 0
          ? progress.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0].completedAt
          : undefined;
        const lastActivity = lastProgress || org.updatedAt;

        const daysRemaining = Math.ceil(
          (org.trialEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          id: org.id,
          name: org.name,
          tenantId: org.tenantId,
          trialStartDate: org.trialStartDate!,
          trialEndDate: org.trialEndDate!,
          daysRemaining,
          onboardingStatus: org.onboardingStatus,
          lastActivity,
          progressSteps: progress.length,
          totalSteps: 5, // connect_datasource, first_sync, view_report, invite_team, convert
        };
      }),
    );

    return trialOrgs;
  }

  /**
   * Get organization onboarding progress
   */
  async getOrgProgress(orgId: string) {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    const progress = await this.progressRepository.find({
      where: { organizationId: orgId },
      order: { completedAt: 'ASC' },
    });

    return {
      organization: {
        id: org.id,
        name: org.name,
        tenantId: org.tenantId,
        onboardingStatus: org.onboardingStatus,
        trialStartDate: org.trialStartDate,
        trialEndDate: org.trialEndDate,
        convertedAt: org.convertedAt,
      },
      progress: progress.map((p) => ({
        stepKey: p.stepKey,
        completedAt: p.completedAt,
        metadata: p.metadata,
      })),
    };
  }

  /**
   * Extend trial for an organization
   */
  async extendTrial(orgId: string, days: number) {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    if (!org.trialEndDate) {
      throw new Error('Organization is not on a trial');
    }

    const newEndDate = new Date(org.trialEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    org.trialEndDate = newEndDate;
    await this.orgRepository.save(org);

    return {
      id: org.id,
      trialEndDate: org.trialEndDate,
      daysExtended: days,
    };
  }

  /**
   * Mark organization as converted
   */
  async convertOrg(orgId: string) {
    const org = await this.orgRepository.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    org.onboardingStatus = 'active';
    org.convertedAt = new Date();
    await this.orgRepository.save(org);

    return {
      id: org.id,
      onboardingStatus: org.onboardingStatus,
      convertedAt: org.convertedAt,
    };
  }

  /**
   * Get at-risk trials (expiring soon or inactive)
   */
  async getAtRiskTrials(): Promise<TrialOrg[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get trials expiring in next 7 days
    const expiringSoon = await this.orgRepository.find({
      where: {
        onboardingStatus: 'trial',
        trialEndDate: Between(now, sevenDaysFromNow),
      },
    });

    // Get inactive trials (no progress in last 30 days)
    const allTrials = await this.orgRepository.find({
      where: {
        onboardingStatus: 'trial',
        trialEndDate: MoreThan(now),
      },
    });

    const inactiveTrials = await Promise.all(
      allTrials.map(async (org) => {
        const recentProgress = await this.progressRepository.findOne({
          where: {
            organizationId: org.id,
            completedAt: MoreThan(thirtyDaysAgo),
          },
        });

        const lastUserActivity = await this.userRepository.findOne({
          where: { organizationId: org.id },
          order: { updatedAt: 'DESC' },
        });

        const lastActivity = lastUserActivity?.updatedAt || org.updatedAt;
        const isInactive = lastActivity < thirtyDaysAgo;

        return { org, isInactive, lastActivity };
      }),
    );

    const inactive = inactiveTrials
      .filter((item) => item.isInactive)
      .map((item) => item.org);

    // Combine and deduplicate
    const allAtRisk = [...expiringSoon, ...inactive];
    const uniqueAtRisk = Array.from(
      new Map(allAtRisk.map((org) => [org.id, org])).values(),
    );

    // Convert to TrialOrg format
    const atRiskOrgs = await Promise.all(
      uniqueAtRisk.map(async (org) => {
        const progress = await this.progressRepository.find({
          where: { organizationId: org.id },
        });

        const daysRemaining = Math.ceil(
          (org.trialEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          id: org.id,
          name: org.name,
          tenantId: org.tenantId,
          trialStartDate: org.trialStartDate!,
          trialEndDate: org.trialEndDate!,
          daysRemaining,
          onboardingStatus: org.onboardingStatus,
          lastActivity: org.updatedAt,
          progressSteps: progress.length,
          totalSteps: 5,
        };
      }),
    );

    return atRiskOrgs.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}
