import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationFeatures } from '@domain/entities/OrganizationFeatures';
import { IOrganizationFeaturesRepository } from '@application/ports/outbound/IOrganizationFeaturesRepository';
import { OrganizationFeaturesEntity } from './entities/organization-features.entity';

@Injectable()
export class PostgresOrganizationFeaturesRepository implements IOrganizationFeaturesRepository {
  constructor(@InjectRepository(OrganizationFeaturesEntity) private readonly repository: Repository<OrganizationFeaturesEntity>) {}

  async findByOrganizationId(organizationId: string): Promise<OrganizationFeatures | null> {
    const entity = await this.repository.findOne({ where: { organizationId } });
    return entity ? OrganizationFeatures.fromPersistence(entity) : null;
  }

  async save(features: OrganizationFeatures): Promise<OrganizationFeatures> {
    const entity = this.repository.create({
      id: features.id, organizationId: features.organizationId, analytics: features.analytics,
      overrides: features.overrides, updatedBy: features.updatedBy,
      createdAt: features.createdAt, updatedAt: features.updatedAt,
    });
    const saved = await this.repository.save(entity);
    return OrganizationFeatures.fromPersistence(saved);
  }

  create(features: OrganizationFeatures): Promise<OrganizationFeatures> { return this.save(features); }
}
