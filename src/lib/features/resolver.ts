// ---------------------------------------------------------------------------
// Feature Resolver — Checks feature access for tenants
// ---------------------------------------------------------------------------
// Resolution order:
//   1. Package-level defaults (package_features table)
//   2. Package feature_flags JSONB (package-level overrides)
//   3. Tenant settings JSONB (per-tenant overrides — tenants.settings.feature_flags)
//   4. Subscription status check (active or trialing)
// ---------------------------------------------------------------------------

import type { FeatureFlagKey } from "./registry";
import { supabase } from "@/lib/supabase/client";

export interface FeatureAccess {
  featureKey: FeatureFlagKey;
  isEnabled: boolean;
  source: "package_default" | "package_override" | "tenant_override" | "subscription_blocked";
}

/**
 * Pure: collect the transitive set of REQUIRED features a feature depends on
 * (feature_dependencies graph). Circular-safe via a visited set.
 */
export function collectRequiredDependencies(
  featureKey: string,
  edges: { feature_key: string; requires_feature_key: string; dependency_type: string }[],
): string[] {
  const reqMap = new Map<string, string[]>();
  for (const e of edges) {
    if (e.dependency_type !== "required") continue;
    const list = reqMap.get(e.feature_key) ?? [];
    list.push(e.requires_feature_key);
    reqMap.set(e.feature_key, list);
  }
  const result = new Set<string>();
  const visited = new Set<string>();
  const stack = [featureKey];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const req of reqMap.get(cur) ?? []) {
      result.add(req);
      stack.push(req);
    }
  }
  return [...result];
}

export class FeatureResolver {
  /**
   * Check if a tenant has access to a specific feature.
   * Returns false if Supabase is not connected (demo mode — all features enabled).
   */
  static async canAccessFeature(
    tenantId: string,
    featureKey: FeatureFlagKey,
  ): Promise<boolean> {
    if (!supabase) return true; // Demo mode — all features available

    // 1. Check subscription status
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (!sub) return false; // No active subscription

    // 2. Get tenant package
    const tRes = await supabase
      .from("tenants")
      .select("package_id, settings")
      .eq("id", tenantId)
      .maybeSingle();

    const tenant = tRes.data as { package_id: string; settings: Record<string, unknown> } | null;
    if (!tenant?.package_id) return false;

    // 3. Check tenant-level feature overrides (tenants.settings.feature_flags)
    const tenantSettings = tenant.settings ?? {};
    const tenantFlags = (tenantSettings.feature_flags as Record<string, boolean>) ?? {};
    if (featureKey in tenantFlags) {
      return tenantFlags[featureKey] === true;
    }

    // 4. Check package-level feature flags (tenant_packages.feature_flags JSONB)
    const pRes = await supabase
      .from("tenant_packages")
      .select("feature_flags")
      .eq("id", tenant.package_id)
      .maybeSingle();

    const pkg = pRes.data as { feature_flags: Record<string, boolean> } | null;
    if (pkg) {
      const pkgFlags = pkg.feature_flags ?? {};
      if (featureKey in pkgFlags) {
        return pkgFlags[featureKey] === true;
      }
    }

    // 5. Check package_features table (default)
    const fRes = await supabase
      .from("package_features")
      .select("is_enabled")
      .eq("package_id", tenant.package_id)
      .eq("feature_key", featureKey)
      .maybeSingle();

    const feature = fRes.data as { is_enabled: boolean } | null;

    return feature?.is_enabled === true;
  }

  /**
   * Get all enabled features for a tenant.
   */
  static async getEnabledFeatures(tenantId: string): Promise<FeatureFlagKey[]> {
    if (!supabase) {
      // Demo mode — all features
      const { ALL_FEATURE_KEYS } = await import("./registry");
      return [...ALL_FEATURE_KEYS];
    }

    // 1. Check subscription status
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (!sub) return [];

    // 2. Get tenant + package
    const tRes = await supabase
      .from("tenants")
      .select("package_id, settings")
      .eq("id", tenantId)
      .maybeSingle();

    const tenant = tRes.data as { package_id: string; settings: Record<string, unknown> } | null;
    if (!tenant?.package_id) return [];

    // 3. Get all package features
    const fRes = await supabase
      .from("package_features")
      .select("feature_key, is_enabled")
      .eq("package_id", tenant.package_id);

    // Build enabled set from package_features defaults
    const enabled = new Set<string>();
    for (const f of (fRes.data ?? []) as Array<{ feature_key: string; is_enabled: boolean }>) {
      if (f.is_enabled) enabled.add(f.feature_key);
    }

    // 4. Apply package-level overrides (feature_flags JSONB)
    const pRes = await supabase
      .from("tenant_packages")
      .select("feature_flags")
      .eq("id", tenant.package_id)
      .maybeSingle();

    const pkg = pRes.data as { feature_flags: Record<string, boolean> } | null;
    if (pkg) {
      for (const [key, val] of Object.entries(pkg.feature_flags ?? {})) {
        if (val) enabled.add(key);
        else enabled.delete(key);
      }
    }

    // 5. Apply tenant-level overrides
    const tenantSettings = tenant.settings ?? {};
    const tenantFlags = (tenantSettings.feature_flags as Record<string, boolean>) ?? {};
    for (const [key, val] of Object.entries(tenantFlags)) {
      if (val) enabled.add(key);
      else enabled.delete(key);
    }

    return Array.from(enabled) as FeatureFlagKey[];
  }

  /**
   * Get detailed feature access information for a tenant.
   */
  static async getFeatureAccess(tenantId: string): Promise<FeatureAccess[]> {
    if (!supabase) return [];

    const { ALL_FEATURE_KEYS } = await import("./registry");

    const results: FeatureAccess[] = [];

    // Get subscription status
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (!sub) {
      // No active subscription — all features blocked
      return ALL_FEATURE_KEYS.map((key) => ({
        featureKey: key,
        isEnabled: false,
        source: "subscription_blocked" as const,
      }));
    }

    // Get tenant
    const tRes2 = await supabase
      .from("tenants")
      .select("package_id, settings")
      .eq("id", tenantId)
      .maybeSingle();

    const tenant2 = tRes2.data as { package_id: string; settings: Record<string, unknown> } | null;
    if (!tenant2?.package_id) {
      return ALL_FEATURE_KEYS.map((key) => ({
        featureKey: key,
        isEnabled: false,
        source: "subscription_blocked" as const,
      }));
    }

    // Get all package features
    const fRes2 = await supabase
      .from("package_features")
      .select("feature_key, is_enabled")
      .eq("package_id", tenant2.package_id);

    const featureMap = new Map<string, boolean>();
    for (const f of (fRes2.data ?? []) as Array<{ feature_key: string; is_enabled: boolean }>) {
      featureMap.set(f.feature_key, f.is_enabled);
    }

    // Apply package-level overrides
    const pRes2 = await supabase
      .from("tenant_packages")
      .select("feature_flags")
      .eq("id", tenant2.package_id)
      .maybeSingle();

    const pkg2 = pRes2.data as { feature_flags: Record<string, boolean> } | null;
    const pkgFlags = pkg2?.feature_flags ?? {};

    // Apply tenant-level overrides
    const tenantSettings = tenant2.settings ?? {};
    const tenantFlags = (tenantSettings.feature_flags as Record<string, boolean>) ?? {};

    for (const key of ALL_FEATURE_KEYS) {
      let isEnabled = featureMap.get(key) ?? false;
      let source: FeatureAccess["source"] = "package_default";

      if (key in tenantFlags) {
        isEnabled = tenantFlags[key] === true;
        source = "tenant_override";
      } else if (key in pkgFlags) {
        isEnabled = pkgFlags[key] === true;
        source = "package_override";
      }

      results.push({ featureKey: key, isEnabled, source });
    }

    return results;
  }

  /**
   * Required dependency feature keys that are NOT currently enabled for the
   * tenant. Empty array = all required dependencies satisfied.
   */
  static async getUnmetDependencies(
    tenantId: string,
    featureKey: string,
  ): Promise<string[]> {
    if (!supabase) return []; // Demo mode — all features available

    const { data } = await supabase
      .from("feature_dependencies")
      .select("feature_key, requires_feature_key, dependency_type");

    const required = collectRequiredDependencies(
      featureKey,
      (data ?? []) as { feature_key: string; requires_feature_key: string; dependency_type: string }[],
    );
    if (required.length === 0) return [];

    const enabled = new Set<string>(await FeatureResolver.getEnabledFeatures(tenantId));
    return required.filter((r) => !enabled.has(r));
  }

  /**
   * True only if the feature is accessible AND all its required dependencies
   * are also enabled for the tenant.
   */
  static async hasFeatureWithDeps(
    tenantId: string,
    featureKey: FeatureFlagKey,
  ): Promise<boolean> {
    const ok = await FeatureResolver.canAccessFeature(tenantId, featureKey);
    if (!ok) return false;
    const unmet = await FeatureResolver.getUnmetDependencies(tenantId, featureKey);
    return unmet.length === 0;
  }
}
