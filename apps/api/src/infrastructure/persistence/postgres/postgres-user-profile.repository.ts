import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserProfileEntity } from "./entities/user-profile.entity";

export interface CreateUserProfileInput {
  id: string; // Keycloak user ID
  email: string;
  firstName: string;
  lastName: string;
  province?: string;
  organizationName?: string;
  industry?: string;
  language?: string;
  registrationSource?: string;
  invitedBy?: string;
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  province?: string;
  phoneNumber?: string;
  jobTitle?: string;
  organizationId?: string;
  organizationName?: string;
  industry?: string;
  language?: string;
  theme?: string;
  timezone?: string;
  dateFormat?: string;
  currencyFormat?: string;
  notificationPreferences?: UserProfileEntity["notificationPreferences"];
  featureFlags?: Record<string, boolean>;
  onboardingCompleted?: boolean;
  onboardingData?: UserProfileEntity["onboardingData"];
  emailVerified?: boolean;
  lastLoginAt?: Date;
}

@Injectable()
export class PostgresUserProfileRepository {
  private readonly logger = new Logger(PostgresUserProfileRepository.name);

  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly repository: Repository<UserProfileEntity>,
  ) {}

  /**
   * Create a new user profile
   */
  async create(input: CreateUserProfileInput): Promise<UserProfileEntity> {
    this.logger.log(`Creating user profile for: ${input.email}`);

    const profile = this.repository.create({
      id: input.id,
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      province: input.province,
      organizationName: input.organizationName,
      industry: input.industry,
      language: input.language || "en",
      registrationSource: input.registrationSource || "web",
      invitedBy: input.invitedBy,
      isActive: true,
      emailVerified: false,
      onboardingCompleted: false,
      loginCount: 0,
    });

    const saved = await this.repository.save(profile);
    this.logger.log(`User profile created: ${saved.id}`);
    return saved;
  }

  /**
   * Find user profile by ID (Keycloak user ID)
   */
  async findById(id: string): Promise<UserProfileEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * Find user profile by email
   */
  async findByEmail(email: string): Promise<UserProfileEntity | null> {
    return this.repository.findOne({ 
      where: { email: email.toLowerCase() } 
    });
  }

  /**
   * Find all users in an organization
   */
  async findByOrganizationId(organizationId: string): Promise<UserProfileEntity[]> {
    return this.repository.find({ 
      where: { organizationId },
      order: { createdAt: "ASC" }
    });
  }

  /**
   * Update user profile
   */
  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfileEntity | null> {
    this.logger.log(`Updating user profile: ${id}`);

    const profile = await this.findById(id);
    if (!profile) {
      this.logger.warn(`User profile not found: ${id}`);
      return null;
    }

    // Update fields
    if (input.firstName !== undefined) profile.firstName = input.firstName;
    if (input.lastName !== undefined) profile.lastName = input.lastName;
    if (input.province !== undefined) profile.province = input.province;
    if (input.phoneNumber !== undefined) profile.phoneNumber = input.phoneNumber;
    if (input.jobTitle !== undefined) profile.jobTitle = input.jobTitle;
    if (input.organizationId !== undefined) profile.organizationId = input.organizationId;
    if (input.organizationName !== undefined) profile.organizationName = input.organizationName;
    if (input.industry !== undefined) profile.industry = input.industry;
    if (input.language !== undefined) profile.language = input.language;
    if (input.theme !== undefined) profile.theme = input.theme;
    if (input.timezone !== undefined) profile.timezone = input.timezone;
    if (input.dateFormat !== undefined) profile.dateFormat = input.dateFormat;
    if (input.currencyFormat !== undefined) profile.currencyFormat = input.currencyFormat;
    if (input.notificationPreferences !== undefined) {
      profile.notificationPreferences = input.notificationPreferences;
    }
    if (input.featureFlags !== undefined) profile.featureFlags = input.featureFlags;
    if (input.onboardingCompleted !== undefined) {
      profile.onboardingCompleted = input.onboardingCompleted;
      if (input.onboardingCompleted) {
        profile.onboardingCompletedAt = new Date();
      }
    }
    if (input.onboardingData !== undefined) profile.onboardingData = input.onboardingData;
    if (input.emailVerified !== undefined) profile.emailVerified = input.emailVerified;
    if (input.lastLoginAt !== undefined) profile.lastLoginAt = input.lastLoginAt;

    const saved = await this.repository.save(profile);
    this.logger.log(`User profile updated: ${saved.id}`);
    return saved;
  }

  /**
   * Record user login
   */
  async recordLogin(id: string): Promise<void> {
    await this.repository.update(id, {
      lastLoginAt: new Date(),
      loginCount: () => "login_count + 1",
    });
  }

  /**
   * Mark email as verified
   */
  async markEmailVerified(id: string): Promise<void> {
    await this.repository.update(id, { emailVerified: true });
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(
    id: string, 
    data: UserProfileEntity["onboardingData"],
    organizationId?: string,
  ): Promise<UserProfileEntity | null> {
    return this.update(id, {
      onboardingCompleted: true,
      onboardingData: data,
      organizationId,
    });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    id: string,
    preferences: UserProfileEntity["notificationPreferences"],
  ): Promise<void> {
    await this.repository.update(id, { notificationPreferences: preferences });
  }

  /**
   * Deactivate user
   */
  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  /**
   * Reactivate user
   */
  async activate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: true });
  }

  /**
   * Delete user profile (hard delete)
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    this.logger.log(`User profile deleted: ${id}`);
  }

  /**
   * Check if user exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Get user count by organization
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.repository.count({ where: { organizationId } });
  }

  /**
   * Get users who haven't completed onboarding
   */
  async findIncompleteOnboarding(): Promise<UserProfileEntity[]> {
    return this.repository.find({
      where: { onboardingCompleted: false },
      order: { createdAt: "DESC" },
    });
  }
}
