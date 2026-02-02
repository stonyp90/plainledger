/**
 * Visualization Domain Entities
 *
 * Domain-driven design entities for the visualization system.
 * These entities encapsulate business rules and validation logic.
 */

// Data Source entities
export {
  DataSource,
  DataSourceProps,
  DataSourceId,
  DataSourceType,
  DataField,
  DataFieldProps,
  FieldId,
  FieldType,
  AggregationType,
  JoinType,
  DataSourceRelationship,
  DataSourceRelationshipProps,
} from "./DataSource";

// Visualization Query entities
export {
  VisualizationQuery,
  VisualizationQueryProps,
  QueryId,
  OrganizationId,
  FieldSelection,
  FieldSelectionProps,
  JoinCondition,
  JoinConditionProps,
  FilterCondition,
  FilterConditionProps,
  FilterOperator,
  CalculatedField,
  CalculatedFieldProps,
  SortSpecification,
  SortSpecificationProps,
  SortDirection,
} from "./VisualizationQuery";
