import { Injectable } from "@nestjs/common";
import { AnalyticsReport } from "@domain/entities/AnalyticsReport";
import { IAnalyticsReportRepository } from "@application/ports/outbound/IAnalyticsReportRepository";

// TODO: Create AnalyticsReportEntity
@Injectable()
export class PostgresAnalyticsReportRepository implements IAnalyticsReportRepository {
  constructor() {
    // @InjectRepository(AnalyticsReportEntity)
    // private readonly repository: Repository<AnalyticsReportEntity>,
  }

  async findById(_id: string): Promise<AnalyticsReport | null> {
    // TODO: Implement database query
    // const entity = await this.repository.findOne({ where: { id } });
    // return entity ? AnalyticsReport.fromPersistence(entity) : null;
    throw new Error(
      "Not implemented - TODO: Create AnalyticsReportEntity and implement",
    );
  }

  async findByOrganizationId(
    _organizationId: string,
  ): Promise<AnalyticsReport[]> {
    // TODO: Implement database query
    // const entities = await this.repository.find({ where: { organizationId } });
    // return entities.map(e => AnalyticsReport.fromPersistence(e));
    throw new Error(
      "Not implemented - TODO: Create AnalyticsReportEntity and implement",
    );
  }

  async findByWorkspaceId(_workspaceId: string): Promise<AnalyticsReport[]> {
    // TODO: Implement database query
    throw new Error(
      "Not implemented - TODO: Create AnalyticsReportEntity and implement",
    );
  }

  async save(_report: AnalyticsReport): Promise<AnalyticsReport> {
    // TODO: Implement database save
    // const entity = this.repository.create(report.toPersistence());
    // const saved = await this.repository.save(entity);
    // return AnalyticsReport.fromPersistence(saved);
    throw new Error(
      "Not implemented - TODO: Create AnalyticsReportEntity and implement",
    );
  }

  async create(report: AnalyticsReport): Promise<AnalyticsReport> {
    return this.save(report);
  }
}
