/**
 * Custom typed error hierarchy for Thunder Edge.
 * Ensures zero silent failures with rich contextual diagnostic data.
 */

export class ThunderEdgeError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class InvalidTradeError extends ThunderEdgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_TRADE_ERROR', details);
  }
}

export class InvalidImportError extends ThunderEdgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_IMPORT_ERROR', details);
  }
}

export class DuplicateTradeError extends ThunderEdgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'DUPLICATE_TRADE_ERROR', details);
  }
}

export class DataValidationError extends ThunderEdgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATA_VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends ThunderEdgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', details);
  }
}
