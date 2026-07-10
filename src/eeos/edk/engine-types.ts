// =================================================================
// EEOS EDK — Engine Types
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Base types for all EEOS engines.
// Every engine must implement these contracts.
// =================================================================

import type { PipelinePhase, ExecutionContext, EngineResult } from "../runtime/types";

// ─── Metadata ───

export interface EngineMetadata {
  id: string;
  version: string;
  displayName: string;
  description: string;
  phase: PipelinePhase;
  priority: number;
  blocking: boolean;
  author: string;
  tags: string[];
}

// ─── Contract ───

export interface EngineContractDef {
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  policies: string[];
  decisionGates: string[];
}

// ─── Hooks ───

export interface EngineHooks {
  beforeValidate?: () => void;
  afterValidate?: () => void;
  beforeExecute?: (ctx: ExecutionContext) => void;
  afterExecute?: (ctx: ExecutionContext, result: EngineResult) => void;
  onFailure?: (ctx: ExecutionContext, error: Error) => void;
  onBlocked?: (ctx: ExecutionContext, reason: string) => void;
  dispose?: () => void;
}

// ─── Lifecycle ───

export type EngineLifecycleState =
  | "REGISTERED"
  | "VALIDATED"
  | "INITIALIZED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED"
  | "DISPOSED";

// ─── Definition ───

export interface EngineDefinition {
  metadata: EngineMetadata;
  contract: EngineContractDef;
  hooks?: EngineHooks;
  execute: (ctx: ExecutionContext) => EngineResult | Promise<EngineResult>;
}
