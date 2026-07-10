// =================================================================
// EEOS EDK — Engine Errors
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Standardized error types for engine failures.
// =================================================================

export class EngineError extends Error {
  constructor(
    message: string,
    public engineId: string,
    public code: string,
  ) {
    super(`[${engineId}] ${message}`);
    this.name = "EngineError";
  }
}

export class ValidationError extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class RegistrationError extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "REGISTRATION_ERROR");
    this.name = "RegistrationError";
  }
}

export class ContractViolation extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "CONTRACT_VIOLATION");
    this.name = "ContractViolation";
  }
}

export class DependencyError extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "DEPENDENCY_ERROR");
    this.name = "DependencyError";
  }
}

export class PolicyViolation extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "POLICY_VIOLATION");
    this.name = "PolicyViolation";
  }
}

export class ExecutionFailure extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "EXECUTION_FAILURE");
    this.name = "ExecutionFailure";
  }
}

export class LifecycleError extends EngineError {
  constructor(engineId: string, message: string) {
    super(message, engineId, "LIFECYCLE_ERROR");
    this.name = "LifecycleError";
  }
}

export class UnknownEngine extends EngineError {
  constructor(engineId: string) {
    super(`Engine not found: ${engineId}`, engineId, "UNKNOWN_ENGINE");
    this.name = "UnknownEngine";
  }
}
