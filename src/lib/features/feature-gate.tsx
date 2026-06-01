"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FeatureResolver } from "./resolver";
import type { FeatureFlagKey } from "./registry";
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "./registry";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

// ---------------------------------------------------------------------------
// <FeatureGate> — Wraps children, only renders if feature is enabled
// ---------------------------------------------------------------------------
// Usage:
//   <FeatureGate tenantId={tid} feature="financial_wallet">
//     <FinancialDashboard />
//   </FeatureGate>
//
//   <FeatureGate tenantId={tid} feature="financial_wallet" fallback={<UpsellBanner />}>
//     <FinancialDashboard />
//   </FeatureGate>
// ---------------------------------------------------------------------------

interface FeatureGateProps {
  tenantId: string;
  feature: FeatureFlagKey;
  children: ReactNode;
  /** Custom fallback when feature is disabled. Default: premium lock screen. */
  fallback?: ReactNode;
  /** If true, show loading state while resolving */
  showLoading?: boolean;
}

export function FeatureGate({
  tenantId,
  feature,
  children,
  fallback,
  showLoading = false,
}: FeatureGateProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    FeatureResolver.canAccessFeature(tenantId, feature).then((result) => {
      if (!cancelled) setEnabled(result);
    });
    return () => { cancelled = true; };
  }, [tenantId, feature]);

  // Loading
  if (enabled === null) {
    if (showLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      );
    }
    return null; // Don't flash content while resolving
  }

  // Enabled
  if (enabled) return <>{children}</>;

  // Disabled — show fallback
  if (fallback) return <>{fallback}</>;

  // Default premium lock
  return (
    <EmptyState
      icon={<Lock className="h-6 w-6" />}
      title={`Fitur: ${FEATURE_LABELS[feature]}`}
      description={
        FEATURE_DESCRIPTIONS[feature] ??
        "Fitur ini tersedia untuk paket yang lebih tinggi. Tingkatkan paket Anda untuk mengakses fitur ini."
      }
      badge="Premium"
      action={
        <a
          href="/settings"
          className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          Tingkatkan Paket
        </a>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// useFeature — Hook for programmatic feature checks
// ---------------------------------------------------------------------------

export function useFeature(tenantId: string | undefined, feature: FeatureFlagKey): {
  isEnabled: boolean | null;
  isLoading: boolean;
} {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIsEnabled(false);
      return;
    }
    let cancelled = false;
    FeatureResolver.canAccessFeature(tenantId, feature).then((result) => {
      if (!cancelled) setIsEnabled(result);
    });
    return () => { cancelled = true; };
  }, [tenantId, feature]);

  return { isEnabled, isLoading: isEnabled === null };
}
