/**
 * Visualization Query Service
 * 
 * Translates VisualizationQuery domain objects to SQL queries against the Gold layer.
 * Handles joins, aggregations, calculated fields, filters, and sorting.
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  VisualizationQuery,
  FieldSelection,
  JoinCondition,
  FilterCondition,
  CalculatedField,
  SortSpecification,
  FilterOperator,
  AggregationType,
} from "@domain/entities/visualization/VisualizationQuery";
import { DataSource } from "@domain/entities/visualization/DataSource";
import { IQueryExecutor, QueryMetadata, QueryExecutionOptions } from "@application/ports/outbound/IQueryExecutor";
import { IDataSourceMetadataService } from "@application/ports/outbound/IDataSourceMetadataService";

/**
 * SQL generation context
 */
interface SqlGenerationContext {
  organizationId: string;
  sources: Map<string, DataSource>;
  sourceAliases: Map<string, string>;
  fieldAliases: Map<string, string>;
  calculatedFieldFormulas: Map<string, string>;
}

@Injectable()
export class VisualizationQueryService {
  private readonly logger = new Logger(VisualizationQueryService.name);

  constructor(
    private readonly queryExecutor: IQueryExecutor,
    private readonly metadataService: IDataSourceMetadataService,
  ) {}

  /**
   * Generate SQL from a VisualizationQuery
   */
  async generateSql(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<QueryMetadata> {
    const context = await this.buildContext(query, organizationId);
    const sql = this.buildSql(query, context);
    
    return {
      sql,
      estimatedCost: this.estimateCost(query, context),
    };
  }

  /**
   * Generate SQL (delegates to internal method)
   * This method signature matches IQueryExecutor interface
   */
  async generateSqlForExecutor(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<QueryMetadata> {
    return this.generateSql(query, organizationId);
  }

  /**
   * Execute a VisualizationQuery
   */
  async execute(
    query: VisualizationQuery,
    organizationId: string,
    options?: QueryExecutionOptions,
  ) {
    // Merge additional filters from options
    const mergedQuery = options?.additionalFilters
      ? this.mergeFilters(query, options.additionalFilters)
      : query;

    return this.queryExecutor.execute(mergedQuery, organizationId, options);
  }

  /**
   * Build SQL generation context
   */
  private async buildContext(
    query: VisualizationQuery,
    organizationId: string,
  ): Promise<SqlGenerationContext> {
    const sources = new Map<string, DataSource>();
    const sourceAliases = new Map<string, string>();
    const fieldAliases = new Map<string, string>();
    const calculatedFieldFormulas = new Map<string, string>();

    // Load source metadata
    for (const sourceId of query.sources) {
      const metadata = await this.metadataService.getSourceMetadata(
        sourceId,
        organizationId,
      );
      if (metadata) {
        sources.set(sourceId, metadata);
        // Generate alias (e.g., "fact_transaction" -> "t0")
        sourceAliases.set(sourceId, `t${sourceAliases.size}`);
      }
    }

    // Build field aliases
    for (const field of query.fields) {
      const key = `${field.sourceId}.${field.fieldId}`;
      const alias = field.alias || field.aliasEn || field.fieldId;
      fieldAliases.set(key, alias);
    }

    // Build calculated field formulas
    for (const calcField of query.calculatedFields) {
      calculatedFieldFormulas.set(calcField.id, calcField.formula);
    }

    return {
      organizationId,
      sources,
      sourceAliases,
      fieldAliases,
      calculatedFieldFormulas,
    };
  }

  /**
   * Build SQL query from VisualizationQuery
   */
  private buildSql(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string {
    const parts: string[] = [];

    // SELECT clause
    parts.push(this.buildSelectClause(query, context));

    // FROM clause
    parts.push(this.buildFromClause(query, context));

    // WHERE clause
    const whereClause = this.buildWhereClause(query, context);
    if (whereClause) {
      parts.push(whereClause);
    }

    // GROUP BY clause
    const groupByClause = this.buildGroupByClause(query, context);
    if (groupByClause) {
      parts.push(groupByClause);
    }

    // ORDER BY clause
    const orderByClause = this.buildOrderByClause(query, context);
    if (orderByClause) {
      parts.push(orderByClause);
    }

    // LIMIT/OFFSET
    if (query.limit) {
      parts.push(`LIMIT ${query.limit}`);
    }
    if (query.offset) {
      parts.push(`OFFSET ${query.offset}`);
    }

    return parts.join("\n");
  }

  /**
   * Build SELECT clause
   */
  private buildSelectClause(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string {
    const selectItems: string[] = [];

    // Regular fields
    for (const field of query.getEnabledFields()) {
      const source = context.sources.get(field.sourceId);
      if (!source) continue;

      const sourceAlias = context.sourceAliases.get(field.sourceId) || field.sourceId;
      const fieldName = this.getFieldColumnName(source, field.fieldId);
      const aggregation = this.getAggregationSql(field.aggregation, fieldName);
      const alias = field.alias || field.aliasEn || field.fieldId;

      selectItems.push(`${aggregation} AS "${alias}"`);
    }

    // Calculated fields
    for (const calcField of query.calculatedFields) {
      const formula = this.resolveCalculatedFieldFormula(
        calcField.formula,
        context,
      );
      const alias = calcField.nameEn || calcField.name;
      selectItems.push(`(${formula}) AS "${alias}"`);
    }

    if (selectItems.length === 0) {
      throw new Error("Query must have at least one field");
    }

    return `SELECT ${selectItems.join(", ")}`;
  }

  /**
   * Build FROM clause with joins
   */
  private buildFromClause(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string {
    if (query.sources.length === 0) {
      throw new Error("Query must have at least one source");
    }

    const primarySource = query.sources[0];
    const primaryAlias = context.sourceAliases.get(primarySource) || primarySource;
    const primaryTable = this.getTableName(primarySource, context.organizationId);

    let fromClause = `FROM ${primaryTable} AS ${primaryAlias}`;

    // Add joins
    for (const join of query.joins) {
      const leftAlias = context.sourceAliases.get(join.leftSource) || join.leftSource;
      const rightAlias = context.sourceAliases.get(join.rightSource) || join.rightSource;
      const rightTable = this.getTableName(join.rightSource, context.organizationId);

      const leftField = this.getFieldColumnName(
        context.sources.get(join.leftSource)!,
        join.leftField,
      );
      const rightField = this.getFieldColumnName(
        context.sources.get(join.rightSource)!,
        join.rightField,
      );

      const joinType = join.type.toUpperCase();
      fromClause += `\n${joinType} JOIN ${rightTable} AS ${rightAlias} ON ${leftAlias}.${leftField} = ${rightAlias}.${rightField}`;
    }

    return fromClause;
  }

  /**
   * Build WHERE clause
   */
  private buildWhereClause(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string | null {
    const enabledFilters = query.getEnabledFilters();
    if (enabledFilters.length === 0) {
      return null;
    }

    const conditions: string[] = [];

    // Organization filter (always applied)
    conditions.push(`organization_key = '${context.organizationId}'`);

    // User-defined filters
    for (const filter of enabledFilters) {
      const source = context.sources.get(filter.sourceId);
      if (!source) continue;

      const sourceAlias = context.sourceAliases.get(filter.sourceId) || filter.sourceId;
      const fieldName = this.getFieldColumnName(source, filter.fieldId);
      const condition = this.buildFilterCondition(
        filter.operator,
        `${sourceAlias}.${fieldName}`,
        filter.value,
      );
      if (condition) {
        conditions.push(condition);
      }
    }

    return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : null;
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string | null {
    if (!query.hasAggregations()) {
      return null;
    }

    const groupByFields: string[] = [];

    for (const field of query.getEnabledFields()) {
      if (field.aggregation === "NONE") {
        const source = context.sources.get(field.sourceId);
        if (!source) continue;

        const sourceAlias = context.sourceAliases.get(field.sourceId) || field.sourceId;
        const fieldName = this.getFieldColumnName(source, field.fieldId);
        groupByFields.push(`${sourceAlias}.${fieldName}`);
      }
    }

    return groupByFields.length > 0
      ? `GROUP BY ${groupByFields.join(", ")}`
      : null;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): string | null {
    if (!query.sort || query.sort.length === 0) {
      return null;
    }

    const orderItems: string[] = [];

    for (const sort of query.sort) {
      // Parse field key (sourceId.fieldId or calculatedFieldId)
      const [sourceId, fieldId] = sort.fieldKey.includes(".")
        ? sort.fieldKey.split(".")
        : [null, sort.fieldKey];

      let fieldRef: string;

      if (sourceId && fieldId) {
        // Regular field
        const source = context.sources.get(sourceId);
        if (!source) continue;

        const sourceAlias = context.sourceAliases.get(sourceId) || sourceId;
        const fieldName = this.getFieldColumnName(source, fieldId);
        fieldRef = `${sourceAlias}.${fieldName}`;
      } else {
        // Calculated field - use alias
        fieldRef = `"${fieldId}"`;
      }

      orderItems.push(`${fieldRef} ${sort.direction.toUpperCase()}`);
    }

    return orderItems.length > 0 ? `ORDER BY ${orderItems.join(", ")}` : null;
  }

  /**
   * Build filter condition SQL
   */
  private buildFilterCondition(
    operator: FilterOperator,
    fieldRef: string,
    value: unknown,
  ): string | null {
    switch (operator) {
      case "equals":
        return `${fieldRef} = ${this.formatValue(value)}`;
      case "not_equals":
        return `${fieldRef} != ${this.formatValue(value)}`;
      case "greater_than":
        return `${fieldRef} > ${this.formatValue(value)}`;
      case "less_than":
        return `${fieldRef} < ${this.formatValue(value)}`;
      case "greater_or_equal":
        return `${fieldRef} >= ${this.formatValue(value)}`;
      case "less_or_equal":
        return `${fieldRef} <= ${this.formatValue(value)}`;
      case "contains":
        return `${fieldRef} LIKE '%${this.escapeString(String(value))}%'`;
      case "not_contains":
        return `${fieldRef} NOT LIKE '%${this.escapeString(String(value))}%'`;
      case "starts_with":
        return `${fieldRef} LIKE '${this.escapeString(String(value))}%'`;
      case "ends_with":
        return `${fieldRef} LIKE '%${this.escapeString(String(value))}'`;
      case "in":
        if (Array.isArray(value)) {
          const values = value.map((v) => this.formatValue(v)).join(", ");
          return `${fieldRef} IN (${values})`;
        }
        return null;
      case "not_in":
        if (Array.isArray(value)) {
          const values = value.map((v) => this.formatValue(v)).join(", ");
          return `${fieldRef} NOT IN (${values})`;
        }
        return null;
      case "between":
        if (Array.isArray(value) && value.length === 2) {
          return `${fieldRef} BETWEEN ${this.formatValue(value[0])} AND ${this.formatValue(value[1])}`;
        }
        return null;
      case "is_null":
        return `${fieldRef} IS NULL`;
      case "is_not_null":
        return `${fieldRef} IS NOT NULL`;
      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
        return null;
    }
  }

  /**
   * Get aggregation SQL
   */
  private getAggregationSql(
    aggregation: AggregationType,
    fieldRef: string,
  ): string {
    switch (aggregation) {
      case "SUM":
        return `SUM(${fieldRef})`;
      case "AVG":
        return `AVG(${fieldRef})`;
      case "COUNT":
        return `COUNT(${fieldRef})`;
      case "COUNT_DISTINCT":
        return `COUNT(DISTINCT ${fieldRef})`;
      case "MIN":
        return `MIN(${fieldRef})`;
      case "MAX":
        return `MAX(${fieldRef})`;
      case "NONE":
      default:
        return fieldRef;
    }
  }

  /**
   * Resolve calculated field formula
   * Replaces ${source.field} references with actual column references
   */
  private resolveCalculatedFieldFormula(
    formula: string,
    context: SqlGenerationContext,
  ): string {
    // Replace ${source.field} with actual column references
    const pattern = /\$\{([^.}]+)\.([^}]+)\}/g;
    return formula.replace(pattern, (match, sourceId, fieldId) => {
      const source = context.sources.get(sourceId);
      if (!source) {
        this.logger.warn(`Unknown source in formula: ${sourceId}`);
        return match;
      }

      const sourceAlias = context.sourceAliases.get(sourceId) || sourceId;
      const fieldName = this.getFieldColumnName(source, fieldId);
      return `${sourceAlias}.${fieldName}`;
    });
  }

  /**
   * Get table name for a data source
   */
  private getTableName(sourceId: string, organizationId: string): string {
    // Gold layer tables are in S3, accessed via Athena
    // Format: s3://bucket/gold/organization_id/table_name/
    // For Athena, we use: gold_table_name
    return `gold_${sourceId}`;
  }

  /**
   * Get column name for a field
   */
  private getFieldColumnName(source: DataSource, fieldId: string): string {
    const field = source.getField(fieldId);
    if (!field) {
      throw new Error(`Field ${fieldId} not found in source ${source.id}`);
    }
    // Use technical name if available, otherwise use field ID
    return (field as any).technicalName || fieldId;
  }

  /**
   * Format value for SQL
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `'${this.escapeString(value)}'`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return `'${String(value)}'`;
  }

  /**
   * Escape string for SQL
   */
  private escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /**
   * Estimate query cost (rough estimate)
   */
  private estimateCost(
    query: VisualizationQuery,
    context: SqlGenerationContext,
  ): number {
    // Very rough estimate based on:
    // - Number of sources (joins increase cost)
    // - Aggregations (more expensive)
    // - Filters (can reduce cost)
    let cost = 0.01; // Base cost

    cost += query.sources.length * 0.001; // Per source
    cost += query.joins.length * 0.002; // Per join
    cost += query.fields.filter((f) => f.aggregation !== "NONE").length * 0.0005; // Per aggregation

    return cost;
  }

  /**
   * Merge additional filters into query
   */
  private mergeFilters(
    query: VisualizationQuery,
    additionalFilters: Array<{
      sourceId: string;
      fieldId: string;
      operator: string;
      value: unknown;
    }>,
  ): VisualizationQuery {
    const mergedFilters = [
      ...query.filters,
      ...additionalFilters.map((f) =>
        FilterCondition.create({
          id: `cross-filter-${Date.now()}-${Math.random()}`,
          sourceId: f.sourceId,
          fieldId: f.fieldId,
          operator: f.operator as FilterOperator,
          value: f.value,
          enabled: true,
        }),
      ),
    ];

    return VisualizationQuery.create({
      ...query.toJSON(),
      filters: mergedFilters.map((f) => f.toJSON()),
    });
  }
}
