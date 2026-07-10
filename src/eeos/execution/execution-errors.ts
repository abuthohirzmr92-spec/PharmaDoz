// =================================================================
// EEOS Execution Engine — Errors
// 🔒 Certified Architecture v2.x (LOCKED)
// =================================================================

export class ExecutionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "ExecutionError";
  }
}

export class EngineNotFoundError extends ExecutionError {
  constructor(engineId: string) {
    super(`Engine not found: ${engineId}`, "ENGINE_NOT_FOUND");
    this.name = "EngineNotFoundError";
  }
}

export class IllegalExecutionError extends ExecutionError {
  constructor(message: string) {
    super(message, "ILLEGAL_EXECUTION");
  }
}

export class ExecutionBlockedError extends ExecutionError {
  constructor(engineId: string, reason: string) {
    super(`Execution blocked by ${engineId}: ${reason}`, "EXECUTION_BLOCKED");
  }
}

export class DuplicateExecutionError extends ExecutionError {
  constructor(engineId: string) {
    super(`Engine ${engineId} already executed in this session`, "DUPLICATE_EXECUTION");
  }
}

export class ContextViolationError extends ExecutionError {
  constructor(message: string) {
    super(message, "CONTEXT_VIOLATION");
  }
}
