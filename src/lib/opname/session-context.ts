// ---------------------------------------------------------------------------
// RC1 P0H.3D — Session Execution Context Builder (PURE)
// ---------------------------------------------------------------------------
// Single source of truth for building SessionExecutionContext.
// Used by Web, Mobile, Worker, CLI, Offline Sync — no copy-paste.
// PURE: zero Store, React, Repository, or Service imports.
// ---------------------------------------------------------------------------

export interface SessionExecutionContext {
  userId: string;
  tenantId: string;
  branchId: string | null;
}

/**
 * Build execution context from auth user and active branch.
 * Pure function — deterministic, no side effects.
 *
 * @param authUser   User object from AuthStore or equivalent
 * @param activeBranch Active branch from BranchStore or equivalent
 * @returns SessionExecutionContext ready for SessionLifecycleService
 */
export function buildSessionExecutionContext(
  authUser: { id?: string; tenantId?: string } | null,
  activeBranch: { id?: string } | null,
): SessionExecutionContext {
  return {
    userId: authUser?.id ?? "system",
    tenantId: authUser?.tenantId ?? "",
    branchId: activeBranch?.id ?? null,
  };
}
