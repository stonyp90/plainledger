/**
 * DataSource Domain Entity
 * 
 * Represents a data source that can be used in visualizations.
 * Part of the Gold layer star schema (dimensions and facts).
 * 
 * Domain Rules:
 * - Each data source has a unique identifier
 * - Fields must be validated before use
 * - Relationships define joinable sources
 */

import { DomainError } from '../../errors/DomainError';

// =====================================================
// VALUE OBJECTS
// =====================================================

export type FieldType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'CURRENCY' 
  | 'DATE' 
  | 'DATETIME' 
  | 'BOOLEAN' 
  | 'PERCENT';

export type AggregationType = 
  | 'SUM' 
  | 'AVG' 
  | 'COUNT' 
  | 'COUNT_DISTINCT' 
  | 'MIN' 
  | 'MAX' 
  | 'NONE';

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export type DataSourceType = 'dimension' | 'fact';

/**
 * DataSourceId Value Object
 */
export class DataSourceId {
  private constructor(private readonly value: string) {}

  static create(value: string): DataSourceId {
    if (!value || value.trim().length === 0) {
      throw new DomainError('DataSourceId cannot be empty');
    }
    if (!/^[a-z_]+$/.test(value)) {
      throw new DomainError('DataSourceId must be lowercase with underscores only');
    }
    return new DataSourceId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: DataSourceId): boolean {
    return this.value === other.value;
  }
}

/**
 * FieldId Value Object
 */
export class FieldId {
  private constructor(private readonly value: string) {}

  static create(value: string): FieldId {
    if (!value || value.trim().length === 0) {
      throw new DomainError('FieldId cannot be empty');
    }
    return new FieldId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: FieldId): boolean {
    return this.value === other.value;
  }
}

// =====================================================
// DATA FIELD ENTITY
// =====================================================

export interface DataFieldProps {
  id: string;
  name: string;
  nameEn: string;
  type: FieldType;
  description?: string;
  descriptionEn?: string;
  aggregatable: boolean;
  filterable: boolean;
  sortable: boolean;
  defaultAggregation?: AggregationType;
  format?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencesSource?: string;
  referencesField?: string;
}

export class DataField {
  private readonly _id: FieldId;
  private readonly _name: string;
  private readonly _nameEn: string;
  private readonly _type: FieldType;
  private readonly _description?: string;
  private readonly _descriptionEn?: string;
  private readonly _aggregatable: boolean;
  private readonly _filterable: boolean;
  private readonly _sortable: boolean;
  private readonly _defaultAggregation: AggregationType;
  private readonly _format?: string;
  private readonly _isPrimaryKey: boolean;
  private readonly _isForeignKey: boolean;
  private readonly _referencesSource?: string;
  private readonly _referencesField?: string;

  private constructor(props: DataFieldProps) {
    this._id = FieldId.create(props.id);
    this._name = props.name;
    this._nameEn = props.nameEn;
    this._type = props.type;
    this._description = props.description;
    this._descriptionEn = props.descriptionEn;
    this._aggregatable = props.aggregatable;
    this._filterable = props.filterable;
    this._sortable = props.sortable;
    this._defaultAggregation = props.defaultAggregation || 'NONE';
    this._format = props.format;
    this._isPrimaryKey = props.isPrimaryKey || false;
    this._isForeignKey = props.isForeignKey || false;
    this._referencesSource = props.referencesSource;
    this._referencesField = props.referencesField;
  }

  static create(props: DataFieldProps): DataField {
    // Validation
    if (!props.name || !props.nameEn) {
      throw new DomainError('Field must have both French and English names');
    }

    // Currency and Number fields should be aggregatable by default
    if ((props.type === 'CURRENCY' || props.type === 'NUMBER') && !props.aggregatable) {
      // Allow non-aggregatable numeric fields (e.g., IDs)
    }

    // Foreign keys should reference a source
    if (props.isForeignKey && !props.referencesSource) {
      throw new DomainError('Foreign key fields must reference a source');
    }

    return new DataField(props);
  }

  // Getters
  get id(): string { return this._id.getValue(); }
  get name(): string { return this._name; }
  get nameEn(): string { return this._nameEn; }
  get type(): FieldType { return this._type; }
  get description(): string | undefined { return this._description; }
  get descriptionEn(): string | undefined { return this._descriptionEn; }
  get aggregatable(): boolean { return this._aggregatable; }
  get filterable(): boolean { return this._filterable; }
  get sortable(): boolean { return this._sortable; }
  get defaultAggregation(): AggregationType { return this._defaultAggregation; }
  get format(): string | undefined { return this._format; }
  get isPrimaryKey(): boolean { return this._isPrimaryKey; }
  get isForeignKey(): boolean { return this._isForeignKey; }
  get referencesSource(): string | undefined { return this._referencesSource; }
  get referencesField(): string | undefined { return this._referencesField; }

  /**
   * Check if field can be aggregated
   */
  canAggregate(): boolean {
    return this._aggregatable && this._type !== 'STRING' && this._type !== 'BOOLEAN';
  }

  /**
   * Get valid aggregations for this field
   */
  getValidAggregations(): AggregationType[] {
    if (!this._aggregatable) return ['NONE'];

    switch (this._type) {
      case 'NUMBER':
      case 'CURRENCY':
      case 'PERCENT':
        return ['SUM', 'AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'NONE'];
      case 'DATE':
      case 'DATETIME':
        return ['COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX', 'NONE'];
      case 'STRING':
        return ['COUNT', 'COUNT_DISTINCT', 'NONE'];
      case 'BOOLEAN':
        return ['COUNT', 'NONE'];
      default:
        return ['NONE'];
    }
  }

  /**
   * Serialize to plain object
   */
  toJSON(): DataFieldProps {
    return {
      id: this.id,
      name: this.name,
      nameEn: this.nameEn,
      type: this.type,
      description: this.description,
      descriptionEn: this.descriptionEn,
      aggregatable: this.aggregatable,
      filterable: this.filterable,
      sortable: this.sortable,
      defaultAggregation: this.defaultAggregation,
      format: this.format,
      isPrimaryKey: this.isPrimaryKey,
      isForeignKey: this.isForeignKey,
      referencesSource: this.referencesSource,
      referencesField: this.referencesField,
    };
  }
}

// =====================================================
// DATA SOURCE RELATIONSHIP
// =====================================================

export interface DataSourceRelationshipProps {
  targetSource: string;
  sourceField: string;
  targetField: string;
  joinType: JoinType;
  description?: string;
}

export class DataSourceRelationship {
  private readonly _targetSource: DataSourceId;
  private readonly _sourceField: FieldId;
  private readonly _targetField: FieldId;
  private readonly _joinType: JoinType;
  private readonly _description?: string;

  private constructor(props: DataSourceRelationshipProps) {
    this._targetSource = DataSourceId.create(props.targetSource);
    this._sourceField = FieldId.create(props.sourceField);
    this._targetField = FieldId.create(props.targetField);
    this._joinType = props.joinType;
    this._description = props.description;
  }

  static create(props: DataSourceRelationshipProps): DataSourceRelationship {
    return new DataSourceRelationship(props);
  }

  get targetSource(): string { return this._targetSource.getValue(); }
  get sourceField(): string { return this._sourceField.getValue(); }
  get targetField(): string { return this._targetField.getValue(); }
  get joinType(): JoinType { return this._joinType; }
  get description(): string | undefined { return this._description; }

  toJSON(): DataSourceRelationshipProps {
    return {
      targetSource: this.targetSource,
      sourceField: this.sourceField,
      targetField: this.targetField,
      joinType: this.joinType,
      description: this.description,
    };
  }
}

// =====================================================
// DATA SOURCE AGGREGATE ROOT
// =====================================================

export interface DataSourceProps {
  id: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  type: DataSourceType;
  icon?: string;
  tableName: string;
  fields: DataFieldProps[];
  relationships?: DataSourceRelationshipProps[];
}

export class DataSource {
  private readonly _id: DataSourceId;
  private readonly _name: string;
  private readonly _nameEn: string;
  private readonly _description?: string;
  private readonly _descriptionEn?: string;
  private readonly _type: DataSourceType;
  private readonly _icon: string;
  private readonly _tableName: string;
  private readonly _fields: Map<string, DataField>;
  private readonly _relationships: DataSourceRelationship[];

  private constructor(props: DataSourceProps, fields: DataField[], relationships: DataSourceRelationship[]) {
    this._id = DataSourceId.create(props.id);
    this._name = props.name;
    this._nameEn = props.nameEn;
    this._description = props.description;
    this._descriptionEn = props.descriptionEn;
    this._type = props.type;
    this._icon = props.icon || (props.type === 'dimension' ? '📊' : '📈');
    this._tableName = props.tableName;
    this._fields = new Map(fields.map(f => [f.id, f]));
    this._relationships = relationships;
  }

  static create(props: DataSourceProps): DataSource {
    // Validate
    if (!props.name || !props.nameEn) {
      throw new DomainError('DataSource must have both French and English names');
    }

    if (!props.fields || props.fields.length === 0) {
      throw new DomainError('DataSource must have at least one field');
    }

    // Must have a primary key
    const hasPrimaryKey = props.fields.some(f => f.isPrimaryKey);
    if (!hasPrimaryKey) {
      throw new DomainError('DataSource must have a primary key field');
    }

    // Create field entities
    const fields = props.fields.map(f => DataField.create(f));

    // Create relationships
    const relationships = (props.relationships || []).map(r => DataSourceRelationship.create(r));

    return new DataSource(props, fields, relationships);
  }

  // Getters
  get id(): string { return this._id.getValue(); }
  get name(): string { return this._name; }
  get nameEn(): string { return this._nameEn; }
  get description(): string | undefined { return this._description; }
  get descriptionEn(): string | undefined { return this._descriptionEn; }
  get type(): DataSourceType { return this._type; }
  get icon(): string { return this._icon; }
  get tableName(): string { return this._tableName; }
  get fields(): DataField[] { return Array.from(this._fields.values()); }
  get relationships(): DataSourceRelationship[] { return [...this._relationships]; }

  /**
   * Get field by ID
   */
  getField(fieldId: string): DataField | undefined {
    return this._fields.get(fieldId);
  }

  /**
   * Get primary key field
   */
  getPrimaryKey(): DataField | undefined {
    return this.fields.find(f => f.isPrimaryKey);
  }

  /**
   * Get foreign key fields
   */
  getForeignKeys(): DataField[] {
    return this.fields.filter(f => f.isForeignKey);
  }

  /**
   * Get filterable fields
   */
  getFilterableFields(): DataField[] {
    return this.fields.filter(f => f.filterable);
  }

  /**
   * Get aggregatable fields
   */
  getAggregatableFields(): DataField[] {
    return this.fields.filter(f => f.aggregatable);
  }

  /**
   * Check if can join with another source
   */
  canJoinWith(targetSourceId: string): boolean {
    return this._relationships.some(r => r.targetSource === targetSourceId);
  }

  /**
   * Get suggested join for a target source
   */
  getSuggestedJoin(targetSourceId: string): DataSourceRelationship | undefined {
    return this._relationships.find(r => r.targetSource === targetSourceId);
  }

  /**
   * Validate a field selection
   */
  validateFieldSelection(fieldIds: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const fieldId of fieldIds) {
      if (!this._fields.has(fieldId)) {
        errors.push(`Field '${fieldId}' does not exist in source '${this.id}'`);
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
  toJSON(): DataSourceProps {
    return {
      id: this.id,
      name: this.name,
      nameEn: this.nameEn,
      description: this.description,
      descriptionEn: this.descriptionEn,
      type: this.type,
      icon: this.icon,
      tableName: this.tableName,
      fields: this.fields.map(f => f.toJSON()),
      relationships: this.relationships.map(r => r.toJSON()),
    };
  }
}
