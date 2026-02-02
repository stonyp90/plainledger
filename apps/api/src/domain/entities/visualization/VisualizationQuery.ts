/**
 * VisualizationQuery Domain Entity
 *
 * Represents a complete query configuration for visualization.
 * Encapsulates all the query parameters including:
 * - Selected data sources
 * - Field selections with aggregations
 * - Join conditions
 * - Filters
 * - Calculated fields
 * - Sorting and pagination
 *
 * Domain Rules:
 * - Query must have at least one source
 * - Query must have at least one field
 * - Joins must reference valid sources
 * - Filters must reference valid fields
 */

import { DomainError } from "../../errors/DomainError";
import {
  DataSource,
  DataField,
  FieldType,
  AggregationType,
  JoinType,
} from "./DataSource";

// =====================================================
// VALUE OBJECTS
// =====================================================

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "between"
  | "in"
  | "not_in"
  | "is_null"
  | "is_not_null";

export type SortDirection = "asc" | "desc";

/**
 * QueryId Value Object
 */
export class QueryId {
  private constructor(private readonly value: string) {}

  static create(value?: string): QueryId {
    const id =
      value || `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new QueryId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: QueryId): boolean {
    return this.value === other.value;
  }
}

/**
 * OrganizationId Value Object - Tenant isolation
 */
export class OrganizationId {
  private constructor(private readonly value: string) {}

  static create(value: string): OrganizationId {
    if (!value || value.trim().length === 0) {
      throw new DomainError("OrganizationId cannot be empty");
    }
    return new OrganizationId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OrganizationId): boolean {
    return this.value === other.value;
  }
}

// =====================================================
// FIELD SELECTION
// =====================================================

export interface FieldSelectionProps {
  sourceId: string;
  fieldId: string;
  alias?: string;
  aliasEn?: string;
  aggregation?: AggregationType;
  enabled?: boolean;
}

export class FieldSelection {
  private readonly _sourceId: string;
  private readonly _fieldId: string;
  private readonly _alias?: string;
  private readonly _aliasEn?: string;
  private readonly _aggregation: AggregationType;
  private readonly _enabled: boolean;

  private constructor(props: FieldSelectionProps) {
    this._sourceId = props.sourceId;
    this._fieldId = props.fieldId;
    this._alias = props.alias;
    this._aliasEn = props.aliasEn;
    this._aggregation = props.aggregation || "NONE";
    this._enabled = props.enabled !== false;
  }

  static create(props: FieldSelectionProps): FieldSelection {
    if (!props.sourceId || !props.fieldId) {
      throw new DomainError("FieldSelection requires sourceId and fieldId");
    }
    return new FieldSelection(props);
  }

  get sourceId(): string {
    return this._sourceId;
  }
  get fieldId(): string {
    return this._fieldId;
  }
  get alias(): string | undefined {
    return this._alias;
  }
  get aliasEn(): string | undefined {
    return this._aliasEn;
  }
  get aggregation(): AggregationType {
    return this._aggregation;
  }
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Get unique identifier for this selection
   */
  getKey(): string {
    return `${this._sourceId}.${this._fieldId}`;
  }

  /**
   * Get display name (alias or field ID)
   */
  getDisplayName(isEnglish: boolean): string {
    if (isEnglish && this._aliasEn) return this._aliasEn;
    if (!isEnglish && this._alias) return this._alias;
    return this._fieldId;
  }

  toJSON(): FieldSelectionProps {
    return {
      sourceId: this.sourceId,
      fieldId: this.fieldId,
      alias: this.alias,
      aliasEn: this.aliasEn,
      aggregation: this.aggregation,
      enabled: this.enabled,
    };
  }
}

// =====================================================
// JOIN CONDITION
// =====================================================

export interface JoinConditionProps {
  leftSource: string;
  rightSource: string;
  leftField: string;
  rightField: string;
  type: JoinType;
}

export class JoinCondition {
  private readonly _leftSource: string;
  private readonly _rightSource: string;
  private readonly _leftField: string;
  private readonly _rightField: string;
  private readonly _type: JoinType;

  private constructor(props: JoinConditionProps) {
    this._leftSource = props.leftSource;
    this._rightSource = props.rightSource;
    this._leftField = props.leftField;
    this._rightField = props.rightField;
    this._type = props.type;
  }

  static create(props: JoinConditionProps): JoinCondition {
    if (!props.leftSource || !props.rightSource) {
      throw new DomainError(
        "JoinCondition requires both left and right sources",
      );
    }
    if (!props.leftField || !props.rightField) {
      throw new DomainError(
        "JoinCondition requires both left and right fields",
      );
    }
    if (props.leftSource === props.rightSource) {
      throw new DomainError("Cannot join a source to itself");
    }
    return new JoinCondition(props);
  }

  get leftSource(): string {
    return this._leftSource;
  }
  get rightSource(): string {
    return this._rightSource;
  }
  get leftField(): string {
    return this._leftField;
  }
  get rightField(): string {
    return this._rightField;
  }
  get type(): JoinType {
    return this._type;
  }

  /**
   * Check if this join involves a specific source
   */
  involvesSource(sourceId: string): boolean {
    return this._leftSource === sourceId || this._rightSource === sourceId;
  }

  toJSON(): JoinConditionProps {
    return {
      leftSource: this.leftSource,
      rightSource: this.rightSource,
      leftField: this.leftField,
      rightField: this.rightField,
      type: this.type,
    };
  }
}

// =====================================================
// FILTER CONDITION
// =====================================================

export interface FilterConditionProps {
  id: string;
  sourceId: string;
  fieldId: string;
  operator: FilterOperator;
  value: unknown;
  enabled?: boolean;
}

export class FilterCondition {
  private readonly _id: string;
  private readonly _sourceId: string;
  private readonly _fieldId: string;
  private readonly _operator: FilterOperator;
  private readonly _value: unknown;
  private readonly _enabled: boolean;

  private constructor(props: FilterConditionProps) {
    this._id = props.id;
    this._sourceId = props.sourceId;
    this._fieldId = props.fieldId;
    this._operator = props.operator;
    this._value = props.value;
    this._enabled = props.enabled !== false;
  }

  static create(props: FilterConditionProps): FilterCondition {
    if (!props.sourceId || !props.fieldId) {
      throw new DomainError("FilterCondition requires sourceId and fieldId");
    }
    return new FilterCondition(props);
  }

  get id(): string {
    return this._id;
  }
  get sourceId(): string {
    return this._sourceId;
  }
  get fieldId(): string {
    return this._fieldId;
  }
  get operator(): FilterOperator {
    return this._operator;
  }
  get value(): unknown {
    return this._value;
  }
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Check if filter requires a value
   */
  requiresValue(): boolean {
    return this._operator !== "is_null" && this._operator !== "is_not_null";
  }

  /**
   * Validate the filter value against a field type
   */
  validateValue(fieldType: FieldType): { valid: boolean; error?: string } {
    if (!this.requiresValue()) {
      return { valid: true };
    }

    if (this._value === null || this._value === undefined) {
      return { valid: false, error: "Filter value is required" };
    }

    // Type-specific validation
    switch (fieldType) {
      case "NUMBER":
      case "CURRENCY":
      case "PERCENT":
        if (this._operator === "between") {
          if (!Array.isArray(this._value) || this._value.length !== 2) {
            return {
              valid: false,
              error: "Between operator requires two values",
            };
          }
        }
        break;
      case "DATE":
      case "DATETIME":
        // Date validation would go here
        break;
    }

    return { valid: true };
  }

  toJSON(): FilterConditionProps {
    return {
      id: this.id,
      sourceId: this.sourceId,
      fieldId: this.fieldId,
      operator: this.operator,
      value: this.value,
      enabled: this.enabled,
    };
  }
}

// =====================================================
// CALCULATED FIELD
// =====================================================

export interface CalculatedFieldProps {
  id: string;
  name: string;
  nameEn: string;
  formula: string;
  returnType: FieldType;
  description?: string;
}

export class CalculatedField {
  private readonly _id: string;
  private readonly _name: string;
  private readonly _nameEn: string;
  private readonly _formula: string;
  private readonly _returnType: FieldType;
  private readonly _description?: string;

  private constructor(props: CalculatedFieldProps) {
    this._id = props.id;
    this._name = props.name;
    this._nameEn = props.nameEn;
    this._formula = props.formula;
    this._returnType = props.returnType;
    this._description = props.description;
  }

  static create(props: CalculatedFieldProps): CalculatedField {
    if (!props.formula || props.formula.trim().length === 0) {
      throw new DomainError("CalculatedField requires a formula");
    }
    if (!props.name || !props.nameEn) {
      throw new DomainError(
        "CalculatedField requires both French and English names",
      );
    }
    return new CalculatedField(props);
  }

  get id(): string {
    return this._id;
  }
  get name(): string {
    return this._name;
  }
  get nameEn(): string {
    return this._nameEn;
  }
  get formula(): string {
    return this._formula;
  }
  get returnType(): FieldType {
    return this._returnType;
  }
  get description(): string | undefined {
    return this._description;
  }

  /**
   * Extract field references from formula
   * Format: ${source.field}
   */
  getFieldReferences(): { sourceId: string; fieldId: string }[] {
    const pattern = /\$\{([^.}]+)\.([^}]+)\}/g;
    const references: { sourceId: string; fieldId: string }[] = [];
    let match;

    while ((match = pattern.exec(this._formula)) !== null) {
      references.push({
        sourceId: match[1],
        fieldId: match[2],
      });
    }

    return references;
  }

  toJSON(): CalculatedFieldProps {
    return {
      id: this.id,
      name: this.name,
      nameEn: this.nameEn,
      formula: this.formula,
      returnType: this.returnType,
      description: this.description,
    };
  }
}

// =====================================================
// SORT SPECIFICATION
// =====================================================

export interface SortSpecificationProps {
  fieldKey: string; // sourceId.fieldId or calculatedField id
  direction: SortDirection;
}

export class SortSpecification {
  private readonly _fieldKey: string;
  private readonly _direction: SortDirection;

  private constructor(props: SortSpecificationProps) {
    this._fieldKey = props.fieldKey;
    this._direction = props.direction;
  }

  static create(props: SortSpecificationProps): SortSpecification {
    return new SortSpecification(props);
  }

  get fieldKey(): string {
    return this._fieldKey;
  }
  get direction(): SortDirection {
    return this._direction;
  }

  toJSON(): SortSpecificationProps {
    return {
      fieldKey: this.fieldKey,
      direction: this.direction,
    };
  }
}

// =====================================================
// VISUALIZATION QUERY AGGREGATE ROOT
// =====================================================

export interface VisualizationQueryProps {
  id?: string;
  organizationId: string;
  name?: string;
  nameEn?: string;
  sources: string[];
  fields: FieldSelectionProps[];
  joins?: JoinConditionProps[];
  filters?: FilterConditionProps[];
  calculatedFields?: CalculatedFieldProps[];
  sort?: SortSpecificationProps[];
  limit?: number;
  offset?: number;
}

export class VisualizationQuery {
  private readonly _id: QueryId;
  private readonly _organizationId: OrganizationId;
  private readonly _name?: string;
  private readonly _nameEn?: string;
  private readonly _sources: Set<string>;
  private readonly _fields: FieldSelection[];
  private readonly _joins: JoinCondition[];
  private readonly _filters: FilterCondition[];
  private readonly _calculatedFields: CalculatedField[];
  private readonly _sort: SortSpecification[];
  private readonly _limit?: number;
  private readonly _offset?: number;

  private constructor(
    props: VisualizationQueryProps,
    fields: FieldSelection[],
    joins: JoinCondition[],
    filters: FilterCondition[],
    calculatedFields: CalculatedField[],
    sort: SortSpecification[],
  ) {
    this._id = QueryId.create(props.id);
    this._organizationId = OrganizationId.create(props.organizationId);
    this._name = props.name;
    this._nameEn = props.nameEn;
    this._sources = new Set(props.sources);
    this._fields = fields;
    this._joins = joins;
    this._filters = filters;
    this._calculatedFields = calculatedFields;
    this._sort = sort;
    this._limit = props.limit;
    this._offset = props.offset;
  }

  static create(props: VisualizationQueryProps): VisualizationQuery {
    // Validate sources
    if (!props.sources || props.sources.length === 0) {
      throw new DomainError("Query must have at least one data source");
    }

    // Validate fields
    if (!props.fields || props.fields.length === 0) {
      throw new DomainError("Query must have at least one field selection");
    }

    // Create value objects
    const fields = props.fields.map((f) => FieldSelection.create(f));
    const joins = (props.joins || []).map((j) => JoinCondition.create(j));
    const filters = (props.filters || []).map((f) => FilterCondition.create(f));
    const calculatedFields = (props.calculatedFields || []).map((c) =>
      CalculatedField.create(c),
    );
    const sort = (props.sort || []).map((s) => SortSpecification.create(s));

    // Validate field sources are in the source list
    const sourceSet = new Set(props.sources);
    for (const field of fields) {
      if (!sourceSet.has(field.sourceId)) {
        throw new DomainError(
          `Field '${field.fieldId}' references unknown source '${field.sourceId}'`,
        );
      }
    }

    // Validate join sources are in the source list
    for (const join of joins) {
      if (!sourceSet.has(join.leftSource) || !sourceSet.has(join.rightSource)) {
        throw new DomainError("Join references unknown source");
      }
    }

    // Validate filter sources are in the source list
    for (const filter of filters) {
      if (!sourceSet.has(filter.sourceId)) {
        throw new DomainError(
          `Filter references unknown source '${filter.sourceId}'`,
        );
      }
    }

    return new VisualizationQuery(
      props,
      fields,
      joins,
      filters,
      calculatedFields,
      sort,
    );
  }

  // Getters
  get id(): string {
    return this._id.getValue();
  }
  get organizationId(): string {
    return this._organizationId.getValue();
  }
  get name(): string | undefined {
    return this._name;
  }
  get nameEn(): string | undefined {
    return this._nameEn;
  }
  get sources(): string[] {
    return Array.from(this._sources);
  }
  get fields(): FieldSelection[] {
    return [...this._fields];
  }
  get joins(): JoinCondition[] {
    return [...this._joins];
  }
  get filters(): FilterCondition[] {
    return [...this._filters];
  }
  get calculatedFields(): CalculatedField[] {
    return [...this._calculatedFields];
  }
  get sort(): SortSpecification[] {
    return [...this._sort];
  }
  get limit(): number | undefined {
    return this._limit;
  }
  get offset(): number | undefined {
    return this._offset;
  }

  /**
   * Get enabled fields only
   */
  getEnabledFields(): FieldSelection[] {
    return this._fields.filter((f) => f.enabled);
  }

  /**
   * Get enabled filters only
   */
  getEnabledFilters(): FilterCondition[] {
    return this._filters.filter((f) => f.enabled);
  }

  /**
   * Check if query has aggregations
   */
  hasAggregations(): boolean {
    return this._fields.some((f) => f.aggregation !== "NONE");
  }

  /**
   * Get fields that need grouping (non-aggregated fields)
   */
  getGroupByFields(): FieldSelection[] {
    if (!this.hasAggregations()) return [];
    return this._fields.filter((f) => f.enabled && f.aggregation === "NONE");
  }

  /**
   * Validate query against available data sources
   */
  validate(availableSources: DataSource[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const sourceMap = new Map(availableSources.map((s) => [s.id, s]));

    // Check all sources exist
    for (const sourceId of this._sources) {
      if (!sourceMap.has(sourceId)) {
        errors.push(`Unknown data source: ${sourceId}`);
      }
    }

    // Check all fields exist
    for (const field of this._fields) {
      const source = sourceMap.get(field.sourceId);
      if (source) {
        const dataField = source.getField(field.fieldId);
        if (!dataField) {
          errors.push(
            `Unknown field '${field.fieldId}' in source '${field.sourceId}'`,
          );
        } else if (field.aggregation !== "NONE" && !dataField.aggregatable) {
          errors.push(`Field '${field.fieldId}' is not aggregatable`);
        }
      }
    }

    // Check calculated field references
    for (const calcField of this._calculatedFields) {
      const refs = calcField.getFieldReferences();
      for (const ref of refs) {
        if (!this._sources.has(ref.sourceId)) {
          errors.push(
            `Calculated field '${calcField.name}' references unknown source '${ref.sourceId}'`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Serialize to plain object
   */
  toJSON(): VisualizationQueryProps {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      nameEn: this.nameEn,
      sources: this.sources,
      fields: this.fields.map((f) => f.toJSON()),
      joins: this.joins.map((j) => j.toJSON()),
      filters: this.filters.map((f) => f.toJSON()),
      calculatedFields: this.calculatedFields.map((c) => c.toJSON()),
      sort: this.sort.map((s) => s.toJSON()),
      limit: this.limit,
      offset: this.offset,
    };
  }
}
