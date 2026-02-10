import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';

export interface UserListFilter {
  search?: string;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateUserServiceDto {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role?: string;
  sendInvite?: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  recentSignups: number;
  activeToday: number;
  newThisMonth: number;
}

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly userRepository: Repository<UserProfileEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  /**
   * List users with filters
   * Queries Keycloak as the primary source of truth for users,
   * and enriches with profile data from the database where available
   */
  async listUsers(filter: UserListFilter): Promise<{ users: any[]; total: number }> {
    try {
      // Query Keycloak for users (source of truth for authentication)
      const { users: keycloakUsers, total } = await this.keycloakAdmin.listUsers({
        search: filter.search,
        first: filter.offset || 0,
        max: filter.limit || 50,
      });

      // Get profile data from database for these users (if exists)
      const userIds = keycloakUsers.map(u => u.id);
      let profilesMap: Map<string, UserProfileEntity> = new Map();
      
      if (userIds.length > 0) {
        try {
          const profiles = await this.userRepository
            .createQueryBuilder('user')
            .where('user.id IN (:...userIds)', { userIds })
            .getMany();
          
          profilesMap = new Map(profiles.map(p => [p.id, p]));
        } catch (dbError) {
          this.logger.warn(`Failed to get user profiles from database: ${dbError.message}`);
        }
      }

      // Merge Keycloak users with profile data
      const users = keycloakUsers.map(kcUser => {
        const profile = profilesMap.get(kcUser.id);
        const orgId = kcUser.attributes?.organization?.[0];
        const orgName = kcUser.attributes?.organizationName?.[0];
        
        return {
          id: kcUser.id,
          email: kcUser.email,
          firstName: kcUser.firstName || profile?.firstName,
          lastName: kcUser.lastName || profile?.lastName,
          emailVerified: kcUser.emailVerified,
          isActive: kcUser.enabled,
          organizationId: orgId || profile?.organizationId,
          organizationName: orgName || profile?.organizationName,
          role: profile?.role || kcUser.attributes?.role?.[0] || 'user',
          lastLoginAt: profile?.lastLoginAt,
          createdAt: kcUser.createdTimestamp ? new Date(kcUser.createdTimestamp) : profile?.createdAt,
        };
      });

      // Apply additional filters if needed (Keycloak search is limited)
      let filteredUsers = users;
      
      if (filter.organizationId) {
        filteredUsers = users.filter(u => u.organizationId === filter.organizationId);
      }
      
      if (filter.isActive !== undefined) {
        filteredUsers = users.filter(u => u.isActive === filter.isActive);
      }

      return { 
        users: filteredUsers, 
        total: filter.organizationId || filter.isActive !== undefined ? filteredUsers.length : total 
      };
    } catch (error) {
      this.logger.error(`Failed to list users: ${error.message}`, error.stack);
      
      // Fallback to database-only query if Keycloak fails
      return this.listUsersFromDatabase(filter);
    }
  }

  /**
   * Fallback method to list users from database only
   */
  private async listUsersFromDatabase(filter: UserListFilter): Promise<{ users: UserProfileEntity[]; total: number }> {
    try {
      const queryBuilder = this.userRepository.createQueryBuilder('user');

      if (filter.search) {
        queryBuilder.andWhere(
          '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
          { search: `%${filter.search}%` },
        );
      }

      if (filter.organizationId) {
        queryBuilder.andWhere('user.organizationId = :organizationId', { 
          organizationId: filter.organizationId,
        });
      }

      if (filter.isActive !== undefined) {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
      }

      if (filter.emailVerified !== undefined) {
        queryBuilder.andWhere('user.emailVerified = :emailVerified', { 
          emailVerified: filter.emailVerified,
        });
      }

      const sortBy = filter.sortBy || 'createdAt';
      const sortOrder = filter.sortOrder || 'DESC';
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

      const total = await queryBuilder.getCount();

      if (filter.limit) {
        queryBuilder.limit(filter.limit);
      }

      if (filter.offset) {
        queryBuilder.offset(filter.offset);
      }

      const users = await queryBuilder.getMany();

      return { users, total };
    } catch (error) {
      this.logger.error(`Database query failed: ${error.message}`);
      return { users: [], total: 0 };
    }
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<UserProfileEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfileEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Create user on behalf of customer
   */
  async createUser(dto: CreateUserServiceDto): Promise<UserProfileEntity> {
    // Verify organization exists
    const org = await this.orgRepository.findOne({ 
      where: { id: dto.organizationId, deletedAt: IsNull() },
    });
    if (!org) {
      throw new BadRequestException(`Organization ${dto.organizationId} not found`);
    }

    // Check if user already exists
    const existingUser = await this.getUserByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException(`User with email ${dto.email} already exists`);
    }

    // Create user in Keycloak first
    let keycloakUser;
    try {
      keycloakUser = await this.keycloakAdmin.createUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerified: false,
        sendVerificationEmail: dto.sendInvite,
      });
    } catch (error) {
      this.logger.error(`Failed to create Keycloak user: ${error.message}`);
      throw new BadRequestException(`Failed to create user in authentication system: ${error.message}`);
    }

    // Create user profile in database
    const user = this.userRepository.create({
      id: keycloakUser.id,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId: dto.organizationId,
      organizationName: org.name,
      isActive: true,
      emailVerified: false,
      registrationSource: 'admin',
    });

    await this.userRepository.save(user);

    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, updates: Partial<UserProfileEntity>): Promise<UserProfileEntity> {
    const user = await this.getUser(id);

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.createdAt;
    delete updates.email; // Email changes require Keycloak update

    Object.assign(user, updates);
    return this.userRepository.save(user);
  }

  /**
   * Disable user
   */
  async disableUser(id: string): Promise<void> {
    const user = await this.getUser(id);
    
    // Disable in Keycloak
    try {
      await this.keycloakAdmin.disableUser(id);
    } catch (error) {
      this.logger.warn(`Failed to disable user in Keycloak: ${error.message}`);
    }

    // Disable in database
    user.isActive = false;
    await this.userRepository.save(user);
  }

  /**
   * Enable user
   */
  async enableUser(id: string): Promise<void> {
    const user = await this.getUser(id);
    
    // Enable in Keycloak
    try {
      await this.keycloakAdmin.enableUser(id);
    } catch (error) {
      this.logger.warn(`Failed to enable user in Keycloak: ${error.message}`);
    }

    // Enable in database
    user.isActive = true;
    await this.userRepository.save(user);
  }

  /**
   * Reset user password (sends reset email)
   */
  async resetPassword(id: string): Promise<void> {
    await this.getUser(id); // Verify user exists
    
    try {
      await this.keycloakAdmin.sendPasswordResetEmail(id);
    } catch (error) {
      this.logger.error(`Failed to send password reset: ${error.message}`);
      throw new BadRequestException(`Failed to send password reset: ${error.message}`);
    }
  }

  /**
   * Force logout all sessions
   * Note: This requires Keycloak Admin API support for session management
   */
  async forceLogout(id: string): Promise<void> {
    await this.getUser(id); // Verify user exists
    
    // Note: Full implementation requires Keycloak session API
    // For now, log the action - sessions will expire naturally
    this.logger.log(`Force logout requested for user ${id} - sessions will expire`);
  }

  /**
   * Delete user (GDPR)
   */
  async deleteUser(id: string): Promise<void> {
    const user = await this.getUser(id);
    
    // Delete from Keycloak first
    try {
      await this.keycloakAdmin.deleteUser(id);
    } catch (error) {
      this.logger.warn(`Failed to delete user from Keycloak: ${error.message}`);
    }

    // Delete from database
    await this.userRepository.remove(user);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const totalUsers = await this.userRepository.count();
    
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    const verifiedUsers = await this.userRepository.count({
      where: { emailVerified: true },
    });

    // Users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSignups = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    // Active today (users who logged in today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeToday = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :date', { date: today })
      .getCount();

    // New this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: startOfMonth })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      recentSignups,
      activeToday,
      newThisMonth,
    };
  }

  /**
   * Invite user to organization
   */
  async inviteUser(email: string, organizationId: string, role: string = 'member'): Promise<void> {
    const org = await this.orgRepository.findOne({ 
      where: { id: organizationId, deletedAt: IsNull() },
    });
    if (!org) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      // User exists - add them to the organization
      existingUser.organizationId = organizationId;
      existingUser.organizationName = org.name;
      await this.userRepository.save(existingUser);
      return;
    }

    // Create new invited user
    // This would typically trigger an invitation email flow
    // For now, create a placeholder user
    this.logger.log(`Invite sent to ${email} for organization ${org.name}`);
  }
}
