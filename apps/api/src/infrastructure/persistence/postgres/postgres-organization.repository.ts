import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOrganizationRepository } from '@application/ports/outbound/IOrganizationRepository';
import { Organization } from '@domain/entities/Organization';
import { TenantId } from '@domain/value-objects/TenantId';
import { OrganizationEntity } from './entities/organization.entity';

/**
 * PostgreSQL implementation of IOrganizationRepository
 * This is an Adapter in the Hexagonal Architecture
 */
@Injectable()
export class PostgresOrganizationRepository implements IOrganizationRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repository: Repository<OrganizationEntity>,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByTenantId(tenantId: TenantId): Promise<Organization | null> {
    const entity = await this.repository.findOne({
      where: { tenantId: tenantId.value },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Organization[]> {
    const entities = await this.repository.find({
      take: options?.limit || 100,
      skip: options?.offset || 0,
      order: { name: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(organization: Organization): Promise<void> {
    const entity = this.toEntity(organization);
    await this.repository.save(entity);
  }

  async update(organization: Organization): Promise<void> {
    const entity = this.toEntity(organization);
    await this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async existsByTenantId(tenantId: TenantId): Promise<boolean> {
    const count = await this.repository.count({
      where: { tenantId: tenantId.value },
    });
    return count > 0;
  }

  /**
   * Map database entity to domain entity
   */
  private toDomain(entity: OrganizationEntity): Organization {
    return Organization.fromPersistence({
      id: entity.id,
      tenantId: TenantId.fromPersistence(entity.tenantId),
      name: entity.name,
      legalName: entity.legalName,
      taxNumber: entity.taxNumber,
      fiscalYearEndMonth: entity.fiscalYearEndMonth,
      currency: entity.currency,
      industry: entity.industry,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * Map domain entity to database entity
   */
  private toEntity(organization: Organization): OrganizationEntity {
    const entity = new OrganizationEntity();
    entity.id = organization.id;
    entity.tenantId = organization.tenantId.value;
    entity.name = organization.name;
    entity.legalName = organization.legalName;
    entity.taxNumber = organization.taxNumber;
    entity.fiscalYearEndMonth = organization.fiscalYearEndMonth;
    entity.currency = organization.currency;
    entity.industry = organization.industry;
    entity.createdAt = organization.createdAt;
    entity.updatedAt = organization.updatedAt;
    return entity;
  }
}
