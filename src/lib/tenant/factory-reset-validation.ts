// =================================================================
// MEDISYNC — Factory Reset Validation
// 🔒 Architecture Constitution v1.0
//
// Validates pre-conditions before reset. Rules are extensible.
// =================================================================

import type { ValidationRule, ValidationCheck, ValidationReport } from "./factory-reset.types";

export class ResetValidation {
  private rules: ValidationRule[] = [];

  constructor(tenantId: string, userId: string) {
    // Core validation rules (extensible)
    this.rules = [
      {
        name: "tenant_exists",
        validate: async (): Promise<ValidationCheck> => ({
          passed: !!tenantId,
          rule: "tenant_exists",
          message: tenantId ? "Tenant exists" : "Tenant ID is required",
        }),
      },
      {
        name: "tenant_not_system",
        validate: async (): Promise<ValidationCheck> => {
          // System tenant check — placeholder
          const isSystem = tenantId === "00000000-0000-0000-0000-000000000000";
          return {
            passed: !isSystem,
            rule: "tenant_not_system",
            message: isSystem ? "Cannot reset system tenant" : "Tenant is not a system tenant",
          };
        },
      },
      {
        name: "user_authenticated",
        validate: async (): Promise<ValidationCheck> => ({
          passed: !!userId,
          rule: "user_authenticated",
          message: userId ? "User authenticated" : "User ID is required",
        }),
      },
    ];
  }

  /** Add a custom validation rule (extension point) */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  async validate(): Promise<ValidationReport> {
    const checks: ValidationCheck[] = [];
    for (const rule of this.rules) {
      checks.push(await rule.validate());
    }
    return {
      valid: checks.every((c) => c.passed),
      checks,
    };
  }
}
