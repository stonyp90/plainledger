import { Injectable, Inject } from '@nestjs/common';
import { IOrganizationRepository } from '@application/ports/outbound/IOrganizationRepository';
import { TenantId } from '@domain/value-objects/TenantId';
import { EntityNotFoundError } from '@domain/errors/DomainError';

export interface GetOrganizationRequest {
  tenantId: string;
}

export interface GetOrganizationResponse {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  fiscalYearEndMonth: number;
  currency: string;
  industry?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Use Case: Get Organization by Tenant ID
 */
@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(request: GetOrganizationRequest): Promise<GetOrganizationResponse> {
    const tenantId = TenantId.create(request.tenantId);
    const organization = await this.organizationRepository.findByTenantId(tenantId);

    if (!organization) {
      throw new EntityNotFoundError('Organization', request.tenantId);
    }

    return {
      id: organization.id,
      tenantId: organization.tenantId.value,
      name: organization.name,
      legalName: organization.legalName,
      taxNumber: organization.taxNumber,
      fiscalYearEndMonth: organization.fiscalYearEndMonth,
      currency: organization.currency,
      industry: organization.industry,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}
