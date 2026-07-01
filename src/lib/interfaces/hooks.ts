// =================================================================
// Extension Hooks — EEOS V5 Compliance
// Constitution Article 6: Extension Point Required
// Constitution Article 5: Reusable First
//
// All hooks are optional. Engines must call them at the right
// lifecycle points. Default implementations are no-ops.
// =================================================================

// ─── Correction Lifecycle Hooks ───

export interface CorrectionLifecycleHooks {
  /** Called BEFORE validation. Can modify params or abort. */
  beforeValidate?(context: CorrectionContext): Promise<HookResult>;

  /** Called AFTER validation, BEFORE apply. Can add conditions. */
  beforeApply?(context: CorrectionContext): Promise<HookResult>;

  /** Called AFTER successful apply. Can trigger side effects. */
  afterApply?(context: CorrectionContext): Promise<HookResult>;

  /** Called BEFORE audit log is written. Can enrich audit data. */
  beforeAudit?(context: CorrectionContext, auditEntry: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Called AFTER audit log is written. */
  afterAudit?(context: CorrectionContext): Promise<void>;

  /** Called BEFORE the DB transaction commits. Can abort. */
  beforeCommit?(context: CorrectionContext): Promise<HookResult>;

  /** Called AFTER successful commit. Final side effects here. */
  afterCommit?(context: CorrectionContext): Promise<void>;

  /** Called when an error occurs. Can transform error. */
  onError?(context: CorrectionContext, error: Error): Promise<Error>;
}

// ─── Hook Context ───

export interface CorrectionContext {
  module: string;
  resourceType: string;
  resourceId: string;
  correlationId: string;
  correctionId?: string;
  correctionNumber?: number;
  tenantId?: string;
  branchId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  reason?: string;
  details?: Array<{
    fieldName: string;
    oldValue: string;
    newValue: string;
    productName?: string;
  }>;
  metadata?: Record<string, unknown>;
}

// ─── Hook Result ───

export interface HookResult {
  /** true = continue, false = abort */
  allow: boolean;
  /** Reason if aborted */
  reason?: string;
  /** Additional data to pass to next hook */
  data?: Record<string, unknown>;
}

// ─── Hook Registry ───

const hookRegistries = new Map<string, CorrectionLifecycleHooks[]>();

export function registerCorrectionHooks(module: string, hooks: CorrectionLifecycleHooks): () => void {
  if (!hookRegistries.has(module)) {
    hookRegistries.set(module, []);
  }
  hookRegistries.get(module)!.push(hooks);

  return () => {
    const registry = hookRegistries.get(module);
    if (registry) {
      const idx = registry.indexOf(hooks);
      if (idx >= 0) registry.splice(idx, 1);
    }
  };
}

export function getCorrectionHooks(module: string): CorrectionLifecycleHooks[] {
  return hookRegistries.get(module) ?? [];
}

// ─── Hook Runner (called by engine at lifecycle points) ───

export async function runHooks(
  module: string,
  hookName: keyof CorrectionLifecycleHooks,
  context: CorrectionContext,
  ...args: any[]
): Promise<HookResult> {
  const hooks = getCorrectionHooks(module);
  for (const hook of hooks) {
    const fn = hook[hookName] as any;
    if (typeof fn === "function") {
      const result = await fn(context, ...args);
      if (result && !result.allow) return result;
    }
  }
  return { allow: true };
}
