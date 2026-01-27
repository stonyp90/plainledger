import { OrganizationFeatures } from "@domain/entities/OrganizationFeatures";

export interface IOrganizationFeaturesRepository {
  findByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationFeatures | null>;
  save(features: OrganizationFeatures): Promise<OrganizationFeatures>;
  create(features: OrganizationFeatures): Promise<OrganizationFeatures>;
}
