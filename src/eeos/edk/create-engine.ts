// =================================================================
// EEOS EDK — Engine Factory
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Standard engine factory. All engines MUST be created through this.
// Manual engine implementations are FORBIDDEN.
// =================================================================

import type {
  EngineDefinition,
  EngineMetadata,
  EngineContractDef,
  EngineHooks,
  EngineLifecycleState,
} from "./engine-types";
import type { ExecutionContext, EngineResult } from "../runtime/types";
import { assertValid } from "./engine-validator";
import { transition } from "./engine-lifecycle";
import { ExecutionFailure } from "./engine-errors";
import { createResult } from "./engine-result";

export interface CreateEngineParams {
  id: string;
  version?: string;
  displayName: string;
  description?: string;
  phase: EngineMetadata["phase"];
  priority?: number;
  blocking?: boolean;
  tags?: string[];
  inputs?: string[];
  outputs?: string[];
  dependencies?: string[];
  policies?: string[];
  decisionGates?: string[];
  hooks?: EngineHooks;
  execute: (ctx: ExecutionContext) => EngineResult | Promise<EngineResult>;
}

export function createEngine(params: CreateEngineParams): {
  definition: EngineDefinition;
  execute: (ctx: ExecutionContext) => Promise<EngineResult>;
  getState: () => EngineLifecycleState;
} {
  const metadata: EngineMetadata = {
    id: params.id,
    version: params.version ?? "1.0.0",
    displayName: params.displayName,
    description: params.description ?? "",
    phase: params.phase,
    priority: params.priority ?? 10,
    blocking: params.blocking ?? false,
    author: "EEOS EDK",
    tags: params.tags ?? [],
  };

  const contract: EngineContractDef = {
    inputs: params.inputs ?? [],
    outputs: params.outputs ?? [],
    dependencies: params.dependencies ?? [],
    policies: params.policies ?? [],
    decisionGates: params.decisionGates ?? [],
  };

  const hooks = params.hooks;

  let state: EngineLifecycleState = "REGISTERED";

  const definition: EngineDefinition = { metadata, contract, hooks, execute: params.execute };

  // Validate immediately — transitions to VALIDATED
  assertValid(definition);
  state = transition(metadata.id, "REGISTERED", "VALIDATED");

  async function execute(ctx: ExecutionContext): Promise<EngineResult> {
    state = transition(metadata.id, state, "INITIALIZED");

    hooks?.beforeExecute?.(ctx);

    state = transition(metadata.id, state, "EXECUTING");

    let result: EngineResult;
    try {
      result = await Promise.resolve(params.execute(ctx));
      state = transition(metadata.id, state, "COMPLETED");
    } catch (err) {
      state = transition(metadata.id, state, "FAILED");
      hooks?.onFailure?.(ctx, err instanceof Error ? err : new ExecutionFailure(metadata.id, String(err)));
      throw err;
    } finally {
      hooks?.dispose?.();
    }

    hooks?.afterExecute?.(ctx, result);
    return result;
  }

  return {
    definition,
    execute,
    getState: () => state,
  };
}
