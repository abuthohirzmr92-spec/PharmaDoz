// =================================================================
// EEOS Runtime — Engine Registry
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Runtime registration of all 15 certified EEOS engines.
// Matches certified Engine Registry (EEOS doc 15).
// =================================================================

import type { EngineContract, PipelinePhase } from "./types";

const ENGINE_REGISTRY: ReadonlyMap<string, EngineContract> = new Map([
  ["SelfValidation",        { name: "SelfValidation",        phase: "INTAKE",                  blocking: true,  mandatory: true }],
  ["TaskClassification",    { name: "TaskClassification",    phase: "CLASSIFICATION",          blocking: false, mandatory: true }],
  ["ContextResolution",     { name: "ContextResolution",     phase: "CONTEXT_RESOLUTION",      blocking: false, mandatory: true }],
  ["MemoryResolution",      { name: "MemoryResolution",      phase: "MEMORY_RESOLUTION",       blocking: false, mandatory: true }],
  ["PolicyResolution",      { name: "PolicyResolution",      phase: "POLICY_RESOLUTION",       blocking: false, mandatory: true }],
  ["Discovery",             { name: "Discovery",             phase: "DISCOVERY",               blocking: false, mandatory: true }],
  ["DependencyResolution",  { name: "DependencyResolution",  phase: "DEPENDENCY_RESOLUTION",   blocking: false, mandatory: true }],
  ["ArchitectureCompliance",{ name: "ArchitectureCompliance",phase: "ARCHITECTURE_COMPLIANCE", blocking: true,  mandatory: true }],
  ["RiskResolution",        { name: "RiskResolution",        phase: "RISK_RESOLUTION",         blocking: true,  mandatory: true }],
  ["Planning",              { name: "Planning",              phase: "PLANNING",               blocking: false, mandatory: true }],
  ["Implementation",        { name: "Implementation",        phase: "IMPLEMENTATION",          blocking: false, mandatory: true }],
  ["Verification",          { name: "Verification",          phase: "VERIFICATION",            blocking: true,  mandatory: true }],
  ["Regression",            { name: "Regression",            phase: "REGRESSION",             blocking: true,  mandatory: true }],
  ["Documentation",         { name: "Documentation",         phase: "DOCUMENTATION",          blocking: false, mandatory: true }],
  ["Release",               { name: "Release",               phase: "RELEASE",                blocking: false, mandatory: true }],
]);

export function getEngine(name: string): EngineContract | undefined {
  return ENGINE_REGISTRY.get(name);
}

export function getEngineByPhase(phase: PipelinePhase): EngineContract | undefined {
  for (const engine of ENGINE_REGISTRY.values()) {
    if (engine.phase === phase) return engine;
  }
  return undefined;
}

export function getAllEngines(): readonly EngineContract[] {
  return [...ENGINE_REGISTRY.values()];
}

export function getPhaseOrder(): readonly PipelinePhase[] {
  return [
    "INTAKE",
    "CLASSIFICATION",
    "CONTEXT_RESOLUTION",
    "MEMORY_RESOLUTION",
    "POLICY_RESOLUTION",
    "DISCOVERY",
    "DEPENDENCY_RESOLUTION",
    "ARCHITECTURE_COMPLIANCE",
    "RISK_RESOLUTION",
    "PLANNING",
    "IMPLEMENTATION",
    "VERIFICATION",
    "REGRESSION",
    "HARDENING",
    "DOCUMENTATION",
    "RELEASE",
  ];
}
