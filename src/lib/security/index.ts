// ---------------------------------------------------------------------------
// Security — barrel export
// ---------------------------------------------------------------------------

export {
  canAccessBranch,
  assertBranchAccess,
  hasValidContext,
  getEffectiveScope,
} from "./access-guard";

export type { ScopeLevel } from "./access-guard";

export {
  ScopeViolationError,
  requireTenantScope,
  requireBranchScope,
} from "./repository-guard";
