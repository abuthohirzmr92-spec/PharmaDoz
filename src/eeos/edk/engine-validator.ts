// =================================================================
// EEOS EDK — Engine Validator
// 🔒 Certified Architecture v2.x (LOCKED)
//
// Validates engine definition before registration.
// Invalid engines are rejected — never silently accepted.
// =================================================================

import type { EngineDefinition } from "./engine-types";
import { ValidationError } from "./engine-errors";

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEngine(def: EngineDefinition): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Metadata completeness
  if (!def.metadata?.id) errors.push("Missing metadata.id");
  if (!def.metadata?.version) errors.push("Missing metadata.version");
  if (!def.metadata?.displayName) errors.push("Missing metadata.displayName");
  if (!def.metadata?.phase) errors.push("Missing metadata.phase");
  if (def.metadata?.priority == null) errors.push("Missing metadata.priority");

  // Contract completeness
  if (!def.contract) {
    errors.push("Missing contract");
  } else {
    if (!def.contract.inputs) errors.push("Missing contract.inputs");
    if (!def.contract.outputs) errors.push("Missing contract.outputs");
    if (!def.contract.dependencies || def.contract.dependencies.length === 0) warnings.push("contract.dependencies is empty");
    if (!def.contract.policies || def.contract.policies.length === 0) warnings.push("contract.policies is empty");
  }

  // Execute function
  if (typeof def.execute !== "function") {
    errors.push("Missing execute function");
  }

  // ID validation
  if (def.metadata?.id && !/^[a-z][a-z0-9-]+$/.test(def.metadata.id)) {
    errors.push("metadata.id must be lowercase kebab-case");
  }

  // Version validation
  if (def.metadata?.version && !/^\d+\.\d+\.\d+$/.test(def.metadata.version)) {
    errors.push("metadata.version must be semver (e.g., 1.0.0)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValid(def: EngineDefinition): void {
  const report = validateEngine(def);
  if (!report.valid) {
    throw new ValidationError(
      def.metadata?.id ?? "unknown",
      `Engine validation failed: ${report.errors.join("; ")}`,
    );
  }
}
