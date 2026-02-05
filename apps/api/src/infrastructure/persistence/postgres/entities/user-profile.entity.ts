import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { OrganizationEntity } from "./organization.entity";
import { RoleEntity } from "./role.entity";

/**
 * Customer Journey Stages for GTM tracking
 */
export type JourneyStage =
  | "signup" // Just registered
  | "onboarding" // Started onboarding wizard
  | "activated" // Connected first data source
  | "engaged" // Generated first report
  | "trial" // Started paid trial
  | "converted" // Paid customer
  | "churned"; // Cancelled/inactive

/**
 * UserProfile Entity
 * Stores user profile data and preferences in PlainLedger database
 * Primary key is the Keycloak user ID (sub) for easy linking
 */
@Entity({ name: "user_profiles", schema: "accounting" })
export class UserProfileEntity {
  @PrimaryColumn({ name: "id", type: "varchar", length: 100 })
  id: string; // Keycloak user ID (sub)

  @Column({ length: 255 })
  @Index()
  email: string;

  @Column({ name: "first_name", length: 100 })
  firstName: string;

  @Column({ name: "last_name", length: 100 })
  lastName: string;

  @Column({ length: 2, nullable: true })
  province?: string; // Canadian province/territory code (AB, BC, ON, QC, etc.)

  @Column({ name: "phone_number", length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ name: "job_title", length: 100, nullable: true })
  jobTitle?: string;

  @Column({ name: "organization_id", type: "uuid", nullable: true })
  @Index()
  organizationId?: string;

  @Column({ name: "organization_name", length: 255, nullable: true })
  organizationName?: string;

  @Column({ length: 100, nullable: true })
  industry?: string;

  @Column({ length: 3, default: "en" })
  language: string; // Preferred language (en, fr)

  @Column({ length: 50, default: "system" })
  theme: string; // UI theme preference (light, dark, system)

  @Column({ length: 50, default: "America/Toronto" })
  timezone: string;

  @Column({ name: "date_format", length: 20, default: "YYYY-MM-DD" })
  dateFormat: string;

  @Column({ name: "currency_format", length: 20, default: "symbol" })
  currencyFormat: string; // symbol ($), code (CAD), both ($CAD)

  // Notification Preferences (JSON)
  @Column({ name: "notification_preferences", type: "jsonb", nullable: true })
  notificationPreferences?: {
    email: {
      reports: boolean;
      anomalies: boolean;
      teamUpdates: boolean;
      productNews: boolean;
    };
    inApp: {
      reports: boolean;
      anomalies: boolean;
      teamUpdates: boolean;
    };
  };

  // Feature flags and settings
  @Column({ name: "feature_flags", type: "jsonb", nullable: true })
  featureFlags?: Record<string, boolean>;

  // Onboarding status
  @Column({ name: "onboarding_completed", type: "boolean", default: false })
  onboardingCompleted: boolean;

  @Column({
    name: "onboarding_completed_at",
    type: "timestamptz",
    nullable: true,
  })
  onboardingCompletedAt?: Date;

  @Column({ name: "onboarding_data", type: "jsonb", nullable: true })
  onboardingData?: {
    companySize?: string;
    primarySource?: string;
    teamEmails?: string[];
    referralSource?: string;
  };

  // ============================================================================
  // Customer Journey Tracking (GTM)
  // ============================================================================

  @Column({ name: "journey_stage", length: 50, default: "signup" })
  @Index()
  journeyStage: JourneyStage;

  @Column({ name: "journey_data", type: "jsonb", nullable: true })
  journeyData?: {
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
    // Email sequence tracking
    lastJourneyEmailSentAt?: string;
    journeyEmailsSent: string[]; // workflow IDs sent
  };

  // ============================================================================
  // Email Preferences & Deliverability
  // ============================================================================

  @Column({ name: "email_preferences", type: "jsonb", nullable: true })
  emailPreferences?: {
    marketingOptIn: boolean; // Can send promotional emails
    productUpdates: boolean; // Feature announcements
    weeklyDigest: boolean; // Weekly summary email
    securityAlerts: boolean; // Always true, cannot opt out
    unsubscribedAt?: string; // When they clicked unsubscribe
    unsubscribeReason?: string;
  };

  @Column({ name: "email_valid", type: "boolean", default: true })
  emailValid: boolean; // False after hard bounce

  @Column({ name: "email_bounce_count", type: "int", default: 0 })
  emailBounceCount: number; // Track soft bounces

  @Column({ name: "last_email_sent_at", type: "timestamptz", nullable: true })
  lastEmailSentAt?: Date; // Prevent over-emailing

  @Column({ name: "last_email_opened_at", type: "timestamptz", nullable: true })
  lastEmailOpenedAt?: Date; // Engagement tracking

  // Registration source tracking
  @Column({ name: "registration_source", length: 50, default: "web" })
  registrationSource: string; // web, invite, google, microsoft

  @Column({ name: "invited_by", type: "varchar", length: 100, nullable: true })
  invitedBy?: string; // User ID who invited this user

  // Account status
  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "email_verified", type: "boolean", default: false })
  emailVerified: boolean;

  @Column({ type: "varchar", length: 50, default: "viewer", nullable: true })
  role?: string;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt?: Date;

  @Column({ name: "login_count", type: "int", default: 0 })
  loginCount: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => OrganizationEntity, { nullable: true })
  @JoinColumn({ name: "organization_id" })
  organization?: OrganizationEntity;

  // TODO: Re-enable FK after seeding tenant.roles table on production
  // The FK was disabled because the roles table was empty when the migration ran
  @ManyToOne(() => RoleEntity, { nullable: true, createForeignKeyConstraints: false })
  @JoinColumn({ name: "role" })
  roleEntity?: RoleEntity;
}
