import { BaseRepository } from "./base";

// ---------------------------------------------------------------------------
// QuotaRepository — resource limit resolution + usage + validation
// ---------------------------------------------------------------------------
// Dual-source limit (Batch 4 transition; supersedes package-limits.ts hardcode):
//   tenant_quota_usage.max_override → tenant_packages.resource_limits[key]
//   → legacy tenant_packages.max_* (mapped) → null (unlimited)
// Usage from tenant_quota_usage.current_value.
// Transaction Policy: OPTIONAL. Limits cacheable (short TTL); usage not cached.
// ---------------------------------------------------------------------------

/** resource_key → legacy max_* column (only these have a legacy fallback). */
const LEGACY_MAX_COLUMN: Record<string, string> = {
  users: "max_users",
  branches: "max_branches",
  products: "max_products",
  storage_mb: "max_storage_mb",
  cashiers: "max_cashier",
};

export interface QuotaEvaluation {
  allowed: boolean;
  current: number;
  max: number | null; // null = unlimited
  remaining: number | null;
  resource: string;
}

/** Pure: dual-source limit resolution (first non-null wins; null = unlimited). */
export function resolveLimit(
  override: number | null,
  fromResourceLimits: number | null,
  fromLegacy: number | null,
): number | null {
  if (override !== null && override !== undefined) return override;
  if (fromResourceLimits !== null && fromResourceLimits !== undefined) return fromResourceLimits;
  if (fromLegacy !== null && fromLegacy !== undefined) return fromLegacy;
  return null;
}

/** Pure: evaluate a prospective increment against a limit. */
export function evaluateQuota(
  resource: string,
  current: number,
  max: number | null,
  delta = 1,
): QuotaEvaluation {
  if (max === null || max === undefined) {
    return { allowed: true, current, max: null, remaining: null, resource };
  }
  return {
    allowed: current + delta <= max,
    current,
    max,
    remaining: Math.max(0, max - current),
    resource,
  };
}

export class QuotaRepository extends BaseRepository {
  private async getPackageId(tenantId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("tenants")
      .select("package_id")
      .eq("id", tenantId)
      .maybeSingle();
    if (error) return this.handleError(error, "QuotaRepository.getPackageId");
    return (data as { package_id: string | null } | null)?.package_id ?? null;
  }

  async getLimit(tenantId: string, resourceKey: string): Promise<number | null> {
    if (!this.isConnected) return null;

    // 1. Per-tenant override
    const { data: usageRow } = await this.client
      .from("tenant_quota_usage")
      .select("max_override")
      .eq("tenant_id", tenantId)
      .eq("resource_key", resourceKey)
      .maybeSingle();
    const override = (usageRow as { max_override: number | null } | null)?.max_override ?? null;

    // 2/3. Package resource_limits + legacy max_*
    const packageId = await this.getPackageId(tenantId);
    let fromResourceLimits: number | null = null;
    let fromLegacy: number | null = null;
    if (packageId) {
      const legacyCol = LEGACY_MAX_COLUMN[resourceKey];
      const cols = legacyCol ? `resource_limits, ${legacyCol}` : "resource_limits";
      const { data: pkg, error } = await this.client
        .from("tenant_packages")
        .select(cols)
        .eq("id", packageId)
        .maybeSingle();
      if (error) return this.handleError(error, "QuotaRepository.getLimit");
      const rl = (pkg as { resource_limits?: Record<string, unknown> } | null)?.resource_limits ?? {};
      const rlVal = rl[resourceKey];
      fromResourceLimits = typeof rlVal === "number" ? rlVal : null;
      if (legacyCol) {
        const legacyVal = (pkg as Record<string, unknown> | null)?.[legacyCol];
        fromLegacy = typeof legacyVal === "number" ? legacyVal : null;
      }
    }

    return resolveLimit(override, fromResourceLimits, fromLegacy);
  }

  async getUsage(tenantId: string, resourceKey: string): Promise<number> {
    if (!this.isConnected) return 0;
    const { data, error } = await this.client
      .from("tenant_quota_usage")
      .select("current_value")
      .eq("tenant_id", tenantId)
      .eq("resource_key", resourceKey)
      .maybeSingle();
    if (error) return this.handleError(error, "QuotaRepository.getUsage");
    return (data as { current_value: number } | null)?.current_value ?? 0;
  }

  async getUtilization(tenantId: string, resourceKey: string): Promise<QuotaEvaluation> {
    const [current, max] = await Promise.all([
      this.getUsage(tenantId, resourceKey),
      this.getLimit(tenantId, resourceKey),
    ]);
    return evaluateQuota(resourceKey, current, max, 0);
  }

  async check(tenantId: string, resourceKey: string, delta = 1): Promise<QuotaEvaluation> {
    if (!this.isConnected) {
      return { allowed: true, current: 0, max: null, remaining: null, resource: resourceKey };
    }
    const [current, max] = await Promise.all([
      this.getUsage(tenantId, resourceKey),
      this.getLimit(tenantId, resourceKey),
    ]);
    return evaluateQuota(resourceKey, current, max, delta);
  }

  async listUsage(tenantId: string): Promise<QuotaEvaluation[]> {
    if (!this.isConnected) return [];
    const { data, error } = await this.client
      .from("tenant_quota_usage")
      .select("resource_key, current_value")
      .eq("tenant_id", tenantId);
    if (error) return this.handleError(error, "QuotaRepository.listUsage");
    const rows = (data ?? []) as { resource_key: string; current_value: number }[];
    const out: QuotaEvaluation[] = [];
    for (const r of rows) {
      const max = await this.getLimit(tenantId, r.resource_key);
      out.push(evaluateQuota(r.resource_key, r.current_value, max, 0));
    }
    return out;
  }
}
