import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';

export interface OrgListFilter {
  search?: string;
  industry?: string;
  plan?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OrgStats {
  totalOrganizations: number;
  activeOrganizations: number;
  byPlan: Record<string, number>;
  byIndustry: Record<string, number>;
}

export interface CreateOrgDto {
  tenantId: string;
  name: string;
  legalName?: string;
  industry?: string;
  currency?: string;
  fiscalYearEndMonth?: number;
}

@Injectable()
export class AdminOrgService {
  private readonly logger = new Logger(AdminOrgService.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
    @InjectRepository(UserProfileEntity)
    private readonly userRepository: Repository<UserProfileEntity>,
    @InjectRepository(DataSourceConnectionEntity)
    private readonly connectionRepository: Repository<DataSourceConnectionEntity>,
  ) {}

  /**
   * List organizations with filters
   */
  async listOrganizations(filter: OrgListFilter): Promise<{ organizations: OrganizationEntity[]; total: number }> {
    const queryBuilder = this.orgRepository
      .createQueryBuilder('org')
      .where('org.deletedAt IS NULL');

    if (filter.search) {
      queryBuilder.andWhere(
        '(org.name ILIKE :search OR org.tenantId ILIKE :search OR org.legalName ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter.industry) {
      queryBuilder.andWhere('org.industry = :industry', { industry: filter.industry });
    }

    // Note: plan might be stored elsewhere (e.g., billing system)
    // This is a placeholder for when plan is in the org entity

    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    queryBuilder.orderBy(`org.${sortBy}`, sortOrder);

    const total = await queryBuilder.getCount();

    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    const organizations = await queryBuilder.getMany();

    return { organizations, total };
  }

  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({
      where: { id, deletedAt: null as any },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  /**
   * Get organization by tenant ID
   */
  async getOrganizationByTenantId(tenantId: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({
      where: { tenantId, deletedAt: null as any },
    });

    if (!org) {
      throw new NotFoundException(`Organization with tenant ID ${tenantId} not found`);
    }

    return org;
  }

  /**
   * Create organization on behalf of customer
   */
  async createOrganization(dto: CreateOrgDto): Promise<OrganizationEntity> {
    const org = this.orgRepository.create({
      tenantId: dto.tenantId,
      name: dto.name,
      legalName: dto.legalName,
      industry: dto.industry,
      currency: dto.currency || 'CAD',
      fiscalYearEndMonth: dto.fiscalYearEndMonth || 12,
    });

    return this.orgRepository.save(org);
  }

  /**
   * Update organization
   */
  async updateOrganization(id: string, updates: Partial<OrganizationEntity>): Promise<OrganizationEntity> {
    const org = await this.getOrganization(id);

    // Don't allow updating certain fields
    delete updates.id;
    delete updates.createdAt;
    delete updates.deletedAt;

    Object.assign(org, updates);
    return this.orgRepository.save(org);
  }

  /**
   * Soft delete organization
   */
  async deleteOrganization(id: string): Promise<void> {
    const org = await this.getOrganization(id);
    org.deletedAt = new Date();
    await this.orgRepository.save(org);
  }

  /**
   * Hard delete organization (GDPR)
   */
  async hardDeleteOrganization(id: string): Promise<void> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    // Delete all users first
    await this.userRepository.delete({ organizationId: id });

    // Then delete the org
    await this.orgRepository.remove(org);
  }

  /**
   * Restore deleted organization
   */
  async restoreOrganization(id: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    org.deletedAt = undefined;
    return this.orgRepository.save(org);
  }

  /**
   * Get users in organization
   */
  async getOrganizationUsers(orgId: string): Promise<UserProfileEntity[]> {
    return this.userRepository.find({
      where: { organizationId: orgId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get organization statistics
   */
  async getOrgStats(): Promise<OrgStats> {
    const totalOrganizations = await this.orgRepository.count({
      where: { deletedAt: null as any },
    });

    const activeOrganizations = await this.orgRepository.count({
      where: { deletedAt: null as any },
      // Could add more criteria for "active" (e.g., recent login)
    });

    // Group by industry
    const byIndustryRaw = await this.orgRepository
      .createQueryBuilder('org')
      .select('org.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .where('org.deletedAt IS NULL')
      .groupBy('org.industry')
      .getRawMany();

    const byIndustry: Record<string, number> = {};
    for (const row of byIndustryRaw) {
      byIndustry[row.industry || 'Unknown'] = parseInt(row.count, 10);
    }

    return {
      totalOrganizations,
      activeOrganizations,
      byPlan: {}, // Placeholder - would come from billing system
      byIndustry,
    };
  }

  /**
   * Get distinct industries for filtering
   */
  async getDistinctIndustries(): Promise<string[]> {
    const result = await this.orgRepository
      .createQueryBuilder('org')
      .select('DISTINCT org.industry', 'industry')
      .where('org.industry IS NOT NULL')
      .orderBy('org.industry', 'ASC')
      .getRawMany();

    return result.map(r => r.industry);
  }

  /**
   * Get integrations for organization
   */
  async getOrganizationIntegrations(orgId: string): Promise<{ integrations: Array<{
    id: string;
    provider: string;
    status: string;
    connectedAt?: Date;
    lastSyncAt?: Date;
    lastSyncStatus?: string;
    providerAccountName?: string;
  }> }> {
    // First verify organization exists
    await this.getOrganization(orgId);

    const connections = await this.connectionRepository.find({
      where: { organizationId: orgId },
      order: { provider: 'ASC' },
    });

    return {
      integrations: connections.map(conn => ({
        id: conn.id,
        provider: conn.provider,
        status: conn.status === 'active' ? 'connected' : conn.status,
        connectedAt: conn.createdAt,
        lastSyncAt: conn.lastSyncAt,
        lastSyncStatus: conn.lastSyncStatus,
        providerAccountName: conn.providerAccountName,
      })),
    };
  }
}
