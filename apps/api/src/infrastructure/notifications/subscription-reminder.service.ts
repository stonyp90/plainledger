/**
 * PlainLedger Subscription Reminder Service
 * Handles conversion emails and feature unlock notifications for free users
 *
 * Free users have demo-only access until they subscribe.
 * This service handles:
 *
 * Usage-based triggers:
 * - After 5 reports generated: Feature unlock email
 * - After 10 anomalies detected: AI features highlight
 * - Usage milestone celebrations
 * - Win-back offers for inactive users
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { sendNotification } from "./notification.service";

// ============================================================================
// Types
// ============================================================================

export interface FreeUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  organizationName: string;
  registeredAt: Date;
  locale: "en" | "fr";
  currentPlan: string;
  usage: UserUsageStats;
}

export interface UserUsageStats {
  reportsGenerated: number;
  anomaliesDetected: number;
  connectionsCount: number;
  lastActiveAt: Date;
  totalLoginCount: number;
  featuresUsed: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameFr: string;
  price: number;
  features: PlanFeature[];
}

export interface PlanFeature {
  id: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  icon: string;
  locked: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const USAGE_MILESTONES = {
  REPORTS_THRESHOLD: 5,
  ANOMALIES_THRESHOLD: 10,
  ACTIVE_DAYS_THRESHOLD: 7,
};

const PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    nameFr: "Démarrage",
    price: 29,
    features: [
      {
        id: "reports",
        name: "Unlimited Reports",
        nameFr: "Rapports illimités",
        description: "Generate unlimited financial reports",
        descriptionFr: "Générez des rapports financiers illimités",
        icon: "file-text",
        locked: false,
      },
      {
        id: "anomalies",
        name: "Basic Anomaly Detection",
        nameFr: "Détection d'anomalies de base",
        description: "Automatic variance detection",
        descriptionFr: "Détection automatique des écarts",
        icon: "alert-triangle",
        locked: false,
      },
      {
        id: "connections",
        name: "2 Connections",
        nameFr: "2 connexions",
        description: "Connect up to 2 accounting systems",
        descriptionFr: "Connectez jusqu'à 2 systèmes comptables",
        icon: "link",
        locked: false,
      },
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    nameFr: "Professionnel",
    price: 79,
    features: [
      {
        id: "ai",
        name: "James Insights",
        nameFr: "Analyses James",
        description: "Advanced analysis and recommendations powered by our AI",
        descriptionFr:
          "Analyses et recommandations avancées propulsées par notre IA",
        icon: "sparkles",
        locked: true,
      },
      {
        id: "multi-company",
        name: "Multi-Company",
        nameFr: "Multi-entreprises",
        description: "Manage multiple companies",
        descriptionFr: "Gérez plusieurs entreprises",
        icon: "building",
        locked: true,
      },
      {
        id: "team",
        name: "Team Access",
        nameFr: "Accès équipe",
        description: "Invite team members",
        descriptionFr: "Invitez des membres d'équipe",
        icon: "users",
        locked: true,
      },
      {
        id: "custom-reports",
        name: "Custom Reports",
        nameFr: "Rapports personnalisés",
        description: "Build custom report templates",
        descriptionFr: "Créez des modèles de rapports personnalisés",
        icon: "layout",
        locked: true,
      },
      {
        id: "api",
        name: "API Access",
        nameFr: "Accès API",
        description: "Integrate with your systems",
        descriptionFr: "Intégrez à vos systèmes",
        icon: "code",
        locked: true,
      },
    ],
  },
};

const TESTIMONIALS = [
  {
    author: "Marie Tremblay",
    company: "Tremblay CPA",
    quote: "PlainLedger saved us 15 hours per month on financial reporting.",
    quoteFr:
      "PlainLedger nous a fait économiser 15 heures par mois sur les rapports financiers.",
  },
  {
    author: "Jean-François Côté",
    company: "Solutions Comptables JFC",
    quote: "The anomaly detection caught $50,000 in billing errors.",
    quoteFr:
      "La détection d'anomalies a repéré 50 000 $ en erreurs de facturation.",
  },
  {
    author: "Sophie Martin",
    company: "Martin & Associés",
    quote: "My clients love the clear, professional reports.",
    quoteFr: "Mes clients adorent les rapports clairs et professionnels.",
  },
];

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SubscriptionReminderService {
  private readonly logger = new Logger(SubscriptionReminderService.name);

  /**
   * Run hourly to check for usage milestones
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUsageMilestones(): Promise<void> {
    try {
      const users = await this.getUsersWithRecentActivity();

      for (const user of users) {
        await this.checkAndSendMilestoneEmail(user);
      }
    } catch (error) {
      this.logger.error(`Failed to check usage milestones: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Email Sending Methods
  // ---------------------------------------------------------------------------

  /**
   * Send feature highlight based on usage patterns
   */
  async sendFeatureHighlight(user: FreeUser): Promise<void> {
    const isEn = user.locale === "en";
    const feature = this.getRecommendedFeature(user);
    const plan = PLANS.professional;

    const payload = {
      isEn,
      firstName: user.firstName,
      featureName: feature.name,
      featureNameFr: feature.nameFr,
      featureDescription: feature.description,
      featureDescriptionFr: feature.descriptionFr,
      featureIcon: feature.icon,
      currentFeature: "basic reports",
      currentFeatureFr: "les rapports de base",
      planName: isEn ? plan.name : plan.nameFr,
      price: plan.price,
      benefits: this.getFeatureBenefits(feature.id, isEn),
      useCase: this.getFeatureUseCase(feature.id, isEn),
      upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription`,
      featuresUrl: `${this.getBaseUrl()}/pricing`,
      baseUrl: this.getBaseUrl(),
    };

    await this.sendEmailNotification(user, "feature_unlock", payload, {
      subject: isEn
        ? `Unlock ${feature.name} for your financial reporting`
        : `Débloquez ${feature.nameFr} pour vos rapports financiers`,
    });

    this.logger.log(`Sent feature highlight to ${user.email}`);
  }

  /**
   * Send usage milestone celebration
   */
  async sendUsageMilestone(
    user: FreeUser,
    milestone: { value: number; label: string; labelFr: string },
  ): Promise<void> {
    const isEn = user.locale === "en";
    const plan = PLANS.professional;

    const payload = {
      isEn,
      firstName: user.firstName,
      milestoneValue: milestone.value,
      milestoneLabel: milestone.label,
      milestoneLabelFr: milestone.labelFr,
      showUpgrade: user.currentPlan === "free",
      impact: {
        timeSaved: Math.round(milestone.value * 0.5),
        issuesFound: user.usage.anomaliesDetected,
        moneySaved: Math.round(user.usage.anomaliesDetected * 500),
      },
      planName: isEn ? plan.name : plan.nameFr,
      nextLevelFeatures: [
        {
          text: "Rapports illimités avec modèles personnalisés",
          textEn: "Unlimited reports with custom templates",
        },
        {
          text: "Détection d'anomalies avancée propulsée par notre IA",
          textEn: "Advanced anomaly detection powered by our AI",
        },
        {
          text: "Accès multi-utilisateurs pour votre équipe",
          textEn: "Multi-user access for your team",
        },
      ],
      upgradeUrl: `${this.getBaseUrl()}/app/settings?tab=subscription`,
      shareUrl: {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.getBaseUrl())}`,
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(isEn ? `I just generated ${milestone.value} reports with @PlainLedger!` : `Je viens de générer ${milestone.value} rapports avec @PlainLedger!`)}`,
      },
      baseUrl: this.getBaseUrl(),
    };

    await this.sendEmailNotification(user, "usage_milestone", payload, {
      subject: isEn
        ? `🎉 You've reached ${milestone.value} ${milestone.label}!`
        : `🎉 Vous avez atteint ${milestone.value} ${milestone.labelFr}!`,
    });

    this.logger.log(`Sent usage milestone to ${user.email}`);
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private async sendEmailNotification(
    user: FreeUser,
    template: string,
    payload: Record<string, unknown>,
    options: { subject: string },
  ): Promise<void> {
    await sendNotification({
      userId: user.id,
      type: template,
      category: "billing",
      priority: "medium",
      title: options.subject,
      message: options.subject,
      channels: ["email"],
      data: payload,
    });
  }

  private getRecommendedFeature(user: FreeUser): PlanFeature {
    // Recommend features based on usage patterns
    if (user.usage.reportsGenerated >= 5) {
      return PLANS.professional.features.find(
        (f) => f.id === "custom-reports",
      )!;
    }
    if (user.usage.anomaliesDetected >= 3) {
      return PLANS.professional.features.find((f) => f.id === "ai")!;
    }
    if (user.usage.connectionsCount >= 2) {
      return PLANS.professional.features.find((f) => f.id === "multi-company")!;
    }
    return PLANS.professional.features.find((f) => f.id === "ai")!;
  }

  private getFeatureBenefits(
    featureId: string,
    _isEn: boolean,
  ): Array<{
    icon: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
  }> {
    const benefits: Record<
      string,
      Array<{
        icon: string;
        title: string;
        titleEn: string;
        description: string;
        descriptionEn: string;
      }>
    > = {
      ai: [
        {
          icon: "🤖",
          title: "Analyse automatique",
          titleEn: "Automatic Analysis",
          description: "L'IA analyse vos données 24/7",
          descriptionEn: "AI analyzes your data 24/7",
        },
        {
          icon: "📊",
          title: "Prédictions",
          titleEn: "Predictions",
          description: "Anticipez les tendances financières",
          descriptionEn: "Anticipate financial trends",
        },
        {
          icon: "💡",
          title: "Recommandations",
          titleEn: "Recommendations",
          description: "Recevez des conseils personnalisés",
          descriptionEn: "Get personalized advice",
        },
      ],
      "custom-reports": [
        {
          icon: "📝",
          title: "Modèles personnalisés",
          titleEn: "Custom Templates",
          description: "Créez vos propres modèles",
          descriptionEn: "Create your own templates",
        },
        {
          icon: "🎨",
          title: "Branding",
          titleEn: "Branding",
          description: "Ajoutez votre logo et couleurs",
          descriptionEn: "Add your logo and colors",
        },
        {
          icon: "📅",
          title: "Automatisation",
          titleEn: "Automation",
          description: "Planifiez des rapports récurrents",
          descriptionEn: "Schedule recurring reports",
        },
      ],
      "multi-company": [
        {
          icon: "🏢",
          title: "Vue consolidée",
          titleEn: "Consolidated View",
          description: "Toutes vos entreprises en un coup d'œil",
          descriptionEn: "All your companies at a glance",
        },
        {
          icon: "🔄",
          title: "Comparaisons",
          titleEn: "Comparisons",
          description: "Comparez les performances",
          descriptionEn: "Compare performance",
        },
        {
          icon: "⚡",
          title: "Rapidité",
          titleEn: "Speed",
          description: "Changez d'entreprise en un clic",
          descriptionEn: "Switch companies in one click",
        },
      ],
    };
    return benefits[featureId] || benefits.ai;
  }

  private getFeatureUseCase(
    featureId: string,
    _isEn: boolean,
  ): { text: string; textEn: string; author: string; role: string } {
    const useCases: Record<
      string,
      { text: string; textEn: string; author: string; role: string }
    > = {
      ai: {
        text: "L'IA a détecté une erreur de 25 000$ que j'aurais manquée manuellement.",
        textEn: "The AI detected a $25,000 error I would have missed manually.",
        author: "Marc Dubois",
        role: "CPA",
      },
      "custom-reports": {
        text: "Mes clients adorent les rapports avec notre branding. Très professionnel!",
        textEn: "My clients love the branded reports. Very professional!",
        author: "Julie Lavoie",
        role: "Comptable",
      },
      "multi-company": {
        text: "Je gère 12 entreprises depuis un seul tableau de bord. Un gain de temps énorme!",
        textEn: "I manage 12 companies from one dashboard. Huge time saver!",
        author: "Pierre Gagnon",
        role: "CFO",
      },
    };
    return useCases[featureId] || useCases.ai;
  }

  private getRandomTestimonial() {
    return TESTIMONIALS[Math.floor(Math.random() * TESTIMONIALS.length)];
  }

  private async checkAndSendMilestoneEmail(user: FreeUser): Promise<void> {
    // Check for report milestone
    if (user.usage.reportsGenerated === USAGE_MILESTONES.REPORTS_THRESHOLD) {
      const alreadySent = await this.hasMilestoneBeenSent(user.id, "reports_5");
      if (!alreadySent) {
        await this.sendUsageMilestone(user, {
          value: USAGE_MILESTONES.REPORTS_THRESHOLD,
          label: "Reports Generated",
          labelFr: "rapports générés",
        });
        await this.markMilestoneSent(user.id, "reports_5");
      }
    }

    // Check for anomaly detection milestone
    if (user.usage.anomaliesDetected === USAGE_MILESTONES.ANOMALIES_THRESHOLD) {
      const alreadySent = await this.hasMilestoneBeenSent(
        user.id,
        "anomalies_10",
      );
      if (!alreadySent) {
        await this.sendUsageMilestone(user, {
          value: USAGE_MILESTONES.ANOMALIES_THRESHOLD,
          label: "Anomalies Detected",
          labelFr: "anomalies détectées",
        });
        await this.markMilestoneSent(user.id, "anomalies_10");
      }
    }
  }

  private getBaseUrl(): string {
    return process.env.APP_URL || "https://app.plainledger.ca";
  }

  // ---------------------------------------------------------------------------
  // Database Methods (Stubs - implement with actual database)
  // ---------------------------------------------------------------------------

  private async getUsersWithRecentActivity(): Promise<FreeUser[]> {
    // In real implementation, fetch users with recent activity
    // SELECT * FROM users WHERE last_active_at > NOW() - INTERVAL 1 hour
    return [];
  }

  private async markMilestoneSent(
    _userId: string,
    _milestone: string,
  ): Promise<void> {
    // In real implementation, mark milestone as sent to avoid duplicates
    // INSERT INTO user_milestones (user_id, milestone, sent_at) VALUES (...)
  }

  private async hasMilestoneBeenSent(
    _userId: string,
    _milestone: string,
  ): Promise<boolean> {
    // In real implementation, check if milestone email was already sent
    // SELECT COUNT(*) FROM user_milestones WHERE user_id = ? AND milestone = ?
    return false;
  }
}
