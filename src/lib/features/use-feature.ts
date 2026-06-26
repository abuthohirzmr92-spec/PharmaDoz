// ---------------------------------------------------------------------------
// ADR-015 — useFeature Hook
// ---------------------------------------------------------------------------
// Single entry point for feature visibility in React components.
// All premium features MUST use this hook — no direct queries to app_settings,
// tenant_packages, or package_features.
//
// Usage:
//   const canImport = useFeature("product_import_excel");
//   {canImport && <ImportButton />}
// ---------------------------------------------------------------------------

"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { FeatureResolver } from "./resolver";
import type { FeatureFlagKey } from "./registry";
import { isDemoMode } from "@/config/env";

/**
 * Check if the current tenant has access to a feature.
 * Returns true in demo mode (all features enabled).
 * Returns true while loading (optimistic — avoids layout flicker).
 */
export function useFeature(featureKey: FeatureFlagKey): boolean {
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const [enabled, setEnabled] = useState(() => isDemoMode());

  useEffect(() => {
    if (isDemoMode()) {
      setEnabled(true);
      return;
    }
    if (!tenantId) {
      setEnabled(false);
      return;
    }

    let cancelled = false;
    FeatureResolver.canAccessFeature(tenantId, featureKey).then((result) => {
      if (!cancelled) setEnabled(result);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantId, featureKey]);

  return enabled;
}
