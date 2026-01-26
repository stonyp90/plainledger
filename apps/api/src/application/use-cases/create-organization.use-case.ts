import { Injectable, Inject } from '@nestjs/common';
import { Organization, CreateOrganizationInput } from '@domain/entities/Organization';
import { IOrganizationRepository } from '@application/ports/outbound/IOrganizationRepository';
import { TenantId } from '@domain/value-objects/TenantId';
import { DuplicateEntityError } from '@domain/errors/DomainError';

export interface CreateOrganizationRequest {
  tenantId: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  fiscalYearEndMonth?: number;
  currency?: string;
  industry?: string;
}

export interface CreateOrganizationResponse {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  fiscalYearEndMonth: number;
  currency: string;
  industry?: string;
  createdAt: string;
}

/**
 * Use Case: Create a new Organization
 * 
 * This use case handles the creation of a new organization (tenant)
 * in the multi-tenant financial reporting system.
 */
@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async execute(request: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
    // Check if tenant ID already exists
    const tenantId = TenantId.create(request.tenantId);
    const exists = await this.organizationRepository.existsByTenantId(tenantId);
    
    if (exists) {
      throw new DuplicateEntityError('Organization', 'tenantId', request.tenantId);
    }

    // Create the organization entity (validates business rules)
    const organization = Organization.create({
      tenantId: request.tenantId,
      name: request.name,
      legalName: request.legalName,
      taxNumber: request.taxNumber,
      fiscalYearEndMonth: request.fiscalYearEndMonth,
      currency: request.currency,
      industry: request.industry,
    });

    // Persist the organization
    await this.organizationRepository.save(organization);

    // Return the response DTO
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
    };
  }
}
