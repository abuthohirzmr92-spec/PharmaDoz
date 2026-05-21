// ---------------------------------------------------------------------------
// Repository Guard — Higher‑Order Utilities for Repository Methods
// ---------------------------------------------------------------------------
// Provides guards that repository code can call at the top of every public
// method to assert that the required security context is present.
//
// All error messages use Bahasa Indonesia.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ScopeViolationError
// ---------------------------------------------------------------------------

/**
 * Thrown when a repository operation is attempted without the correct
 * security scope (tenant or branch).
 */
export class ScopeViolationError extends Error {
  /** The operation that was attempted (e.g. "ProductRepository.findAll"). */
  public readonly operation: string;

  /** Description of the scope that was required. */
  public readonly required: string;

  /** The actual scope value that was supplied (or "undefined"). */
  public readonly actual: string;

  constructor(operation: string, required: string, actual: string) {
    const message =
      `ScopeViolation: operasi "${operation}" membutuhkan ${required}, ` +
      `tetapi menerima "${actual}".`;
    super(message);
    this.name = "ScopeViolationError";
    this.operation = operation;
    this.required = required;
    this.actual = actual;
  }
}

// ---------------------------------------------------------------------------
// Tenant scope guard
// ---------------------------------------------------------------------------

/**
 * Assert that a repository has a valid tenant id before proceeding with
 * the given operation.
 *
 * Usage:
 * ```typescript
 * class ProductRepository {
 *   async findAll() {
 *     requireTenantScope(this, "ProductRepository.findAll");
 *     // … proceed with query scoped to this.getTenantId()
 *   }
 * }
 * ```
 *
 * @param repo      An object that exposes `getTenantId()` (e.g. a repository
 *                  instance extending BaseRepository).
 * @param operation Human‑readable operation name for error messages.
 * @throws ScopeViolationError if the repository's tenant id is undefined.
 */
export function requireTenantScope<T>(
  repo: { getTenantId(): string | undefined },
  operation: string,
): void {
  const tenantId = repo.getTenantId();
  if (typeof tenantId !== "string" || tenantId.length === 0) {
    throw new ScopeViolationError(
      operation,
      "tenant_id terdefinisi",
      String(tenantId),
    );
  }
}

// ---------------------------------------------------------------------------
// Branch scope guard
// ---------------------------------------------------------------------------

/**
 * Assert that a branch id is provided before proceeding with the given
 * operation.
 *
 * @param branchId  The branch id to validate (typically from the active
 *                  branch context or a request parameter).
 * @param operation Human‑readable operation name for error messages.
 * @throws ScopeViolationError if branchId is undefined, null, or empty.
 */
export function requireBranchScope(
  branchId: string | undefined,
  operation: string,
): void {
  if (typeof branchId !== "string" || branchId.length === 0) {
    throw new ScopeViolationError(
      operation,
      "branch_id terdefinisi",
      String(branchId),
    );
  }
}
