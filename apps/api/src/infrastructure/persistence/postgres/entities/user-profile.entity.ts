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
}
