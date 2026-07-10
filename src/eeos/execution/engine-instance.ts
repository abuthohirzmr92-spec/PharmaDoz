// =================================================================
// EEOS Execution Engine — Engine Instance
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Creates isolated engine instances. One definition → many instances.
// Each instance owns its lifecycle, state, and execution handle.
// =================================================================

import type {
  InstanceId,
  EngineInstance,
  EngineInstanceState,
  ExecutionHandle,
} from "./execution-types";
import { transition } from "./execution-lifecycle";

let _seq = 0;

function generateId(): InstanceId {
  _seq++;
  return `inst-${Date.now()}-${String(_seq).padStart(4, "0")}`;
}

export function createInstance(engineId: string): {
  instance: EngineInstance;
  handle: ExecutionHandle;
} {
  const instanceId = generateId();
  const now = new Date().toISOString();

  const record: EngineInstance = {
    instanceId,
    engineId,
    state: "CREATED",
    error: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };

  const handle: ExecutionHandle = {
    instanceId,

    getState: () => record.state,

    initialize: () => {
      record.state = transition(instanceId, record.state, "INITIALIZED");
    },

    markExecuting: () => {
      record.state = transition(instanceId, record.state, "EXECUTING");
      record.startedAt = new Date().toISOString();
    },

    markCompleted: () => {
      record.state = transition(instanceId, record.state, "COMPLETED");
      record.finishedAt = new Date().toISOString();
    },

    markFailed: (error: Error) => {
      record.state = transition(instanceId, record.state, "FAILED");
      record.error = error;
      record.finishedAt = new Date().toISOString();
    },

    dispose: () => {
      if (record.state !== "DISPOSED") {
        record.state = transition(instanceId, record.state, "DISPOSED");
        record.finishedAt = record.finishedAt ?? new Date().toISOString();
      }
    },
  };

  return { instance: record, handle };
}
