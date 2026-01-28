import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";

/**
 * Database Initializer Service
 * Creates required database schemas on application startup if they don't exist.
 * This runs before TypeORM synchronize to ensure schemas are available.
 */
@Injectable()
export class DatabaseInitializerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.createSchemas();
  }

  private async createSchemas() {
    const schemas = ["accounting", "reporting", "integration"];

    try {
      for (const schema of schemas) {
        await this.dataSource.query(
          `CREATE SCHEMA IF NOT EXISTS ${schema}`,
        );
        this.logger.log(`Schema '${schema}' ensured`);
      }

      // Create uuid extension if not exists
      await this.dataSource.query(
        `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      );
      this.logger.log("UUID extension ensured");
    } catch (error) {
      this.logger.error(`Failed to create schemas: ${error.message}`);
      // Don't throw - allow app to start even if schemas exist
    }
  }
}
