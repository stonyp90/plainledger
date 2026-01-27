import { AnalyticsReport } from "@domain/entities/AnalyticsReport";

export interface IAnalyticsReportRepository {
  findById(id: string): Promise<AnalyticsReport | null>;
  findByOrganizationId(organizationId: string): Promise<AnalyticsReport[]>;
  findByWorkspaceId(workspaceId: string): Promise<AnalyticsReport[]>;
  save(report: AnalyticsReport): Promise<AnalyticsReport>;
  create(report: AnalyticsReport): Promise<AnalyticsReport>;
}
