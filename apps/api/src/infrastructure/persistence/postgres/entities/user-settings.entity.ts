import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserProfileEntity } from "./user-profile.entity";

/**
 * UserSettings Entity
 * Stores user-specific settings and preferences
 * Extends UserProfileEntity with additional settings
 */
@Entity({ name: "user_settings", schema: "accounting" })
export class UserSettingsEntity {
  @PrimaryColumn({ type: "varchar", length: 100 })
  userId: string; // Keycloak user ID

  @ManyToOne(() => UserProfileEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserProfileEntity;

  // Notification Preferences (JSONB) - Detailed preferences
  @Column({ name: "notification_preferences", type: "jsonb", nullable: true })
  notificationPreferences?: {
    enabled: boolean;
    channels: {
      [category: string]: {
        in_app: boolean;
        email: boolean;
        push: boolean;
        sms: boolean;
        slack: boolean;
        teams: boolean;
      };
    };
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    emailDigest: "none" | "daily" | "weekly";
    integrations?: {
      slack?: any;
      teams?: any;
    };
  };

  // UI Preferences (JSONB)
  @Column({ name: "ui_preferences", type: "jsonb", nullable: true })
  uiPreferences?: {
    theme?: string;
    language?: string;
    timezone?: string;
    dateFormat?: string;
    currencyFormat?: string;
    sidebarCollapsed?: boolean;
    dashboardLayout?: string;
  };

  // Feature Preferences (JSONB)
  @Column({ name: "feature_preferences", type: "jsonb", nullable: true })
  featurePreferences?: {
    [feature: string]: boolean | any;
  };

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
