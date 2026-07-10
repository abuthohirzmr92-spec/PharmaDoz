// =================================================================
// EEOS EDK — Engine Registry
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Runtime registry for EDK-created engines.
// The Runtime consumes this registry — no hardcoded engines.
// =================================================================

import type { EngineDefinition } from "./engine-types";
import type { ExecutionContext, EngineResult } from "../runtime/types";
import { RegistrationError, UnknownEngine } from "./engine-errors";

interface RegisteredEngine {
  definition: EngineDefinition;
  execute: (ctx: ExecutionContext) => Promise<EngineResult>;
  registeredAt: string;
}

const registry = new Map<string, RegisteredEngine>();

export function registerEngine(
  def: EngineDefinition,
  executor: (ctx: ExecutionContext) => Promise<EngineResult>,
): void {
  if (registry.has(def.metadata.id)) {
    throw new RegistrationError(
      def.metadata.id,
      `Engine "${def.metadata.id}" already registered`,
    );
  }

  registry.set(def.metadata.id, {
    definition: def,
    execute: executor,
    registeredAt: new Date().toISOString(),
  });
}

export function unregisterEngine(engineId: string): void {
  if (!registry.has(engineId)) {
    throw new UnknownEngine(engineId);
  }
  registry.delete(engineId);
}

export function getEngine(engineId: string): RegisteredEngine {
  const engine = registry.get(engineId);
  if (!engine) throw new UnknownEngine(engineId);
  return engine;
}

export function resolveEngine(engineId: string): {
  definition: EngineDefinition;
  execute: (ctx: ExecutionContext) => Promise<EngineResult>;
} | null {
  const engine = registry.get(engineId);
  return engine ? { definition: engine.definition, execute: engine.execute } : null;
}

export function listEngines(): readonly EngineDefinition[] {
  return [...registry.values()].map((r) => r.definition);
}

export function listEnginesByPhase(phase: string): readonly EngineDefinition[] {
  return [...registry.values()]
    .filter((r) => r.definition.metadata.phase === phase)
    .map((r) => r.definition);
}

export function hasEngine(engineId: string): boolean {
  return registry.has(engineId);
}

export function clearRegistry(): void {
  registry.clear();
}
