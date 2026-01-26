/**
 * Base class for domain errors
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Entity not found error
 */
export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id '${id}' not found`);
    this.name = 'EntityNotFoundError';
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

/**
 * Duplicate entity error
 */
export class DuplicateEntityError extends DomainError {
  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field} '${value}' already exists`);
    this.name = 'DuplicateEntityError';
    Object.setPrototypeOf(this, DuplicateEntityError.prototype);
  }
}

/**
 * Invalid operation error
 */
export class InvalidOperationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationError';
    Object.setPrototypeOf(this, InvalidOperationError.prototype);
  }
}

/**
 * Authorization error
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Validation error with field details
 */
export class ValidationError extends DomainError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
