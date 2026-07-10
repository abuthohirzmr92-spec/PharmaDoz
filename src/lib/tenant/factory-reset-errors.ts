// =================================================================
// MEDISYNC — Factory Reset Error Model
// 🔒 Architecture Constitution v1.0
//
// Categorized errors for production reliability.
// Consumers can handle errors by category, not by string matching.
// =================================================================

export class FactoryResetError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "FactoryResetError";
  }
}

export class ValidationError extends FactoryResetError {
  constructor(field: string, message: string) {
    super(`[${field}] ${message}`, "VALIDATION_ERROR");
  }
}

export class PermissionError extends FactoryResetError {
  constructor(message = "Only tenant owner or super admin can perform factory reset") {
    super(message, "PERMISSION_ERROR");
  }
}

export class TransactionError extends FactoryResetError {
  constructor(table: string, detail: string) {
    super(`Transaction failed on ${table}: ${detail}`, "TRANSACTION_ERROR");
  }
}

export class ConcurrencyError extends FactoryResetError {
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} is already being reset. Concurrent reset is not allowed.`, "CONCURRENCY_ERROR");
  }
}

export class ForeignKeyError extends FactoryResetError {
  constructor(table: string, detail: string) {
    super(`FK violation on ${table}: ${detail}`, "FK_ERROR");
  }
}

export class DatabaseError extends FactoryResetError {
  constructor(detail: string) {
    super(`Database error: ${detail}`, "DATABASE_ERROR");
  }
}

export class LifecycleError extends FactoryResetError {
  constructor(message: string) {
    super(message, "LIFECYCLE_ERROR");
  }
}
