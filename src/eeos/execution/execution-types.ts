// =================================================================
// EEOS Execution Engine — Types
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Execution-specific types. Does NOT duplicate Runtime or EDK types.
// =================================================================

/** Unique identifier for an engine instance */
export type InstanceId = string;

/** Lifecycle state of an engine instance */
export type EngineInstanceState =
  | "CREATED"
  | "INITIALIZED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "DISPOSED";

/** Handle returned after creating an engine instance */
export interface ExecutionHandle {
  instanceId: InstanceId;
  getState: () => EngineInstanceState;
  initialize: () => void;
  markExecuting: () => void;
  markCompleted: () => void;
  markFailed: (error: Error) => void;
  dispose: () => void;
}

/** Lightweight record of one engine instance */
export interface EngineInstance {
  instanceId: InstanceId;
  engineId: string;
  state: EngineInstanceState;
  error: Error | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}
