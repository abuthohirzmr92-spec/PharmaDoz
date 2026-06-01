"use client";

import { FeatureGate } from "@/lib/features/feature-gate";
import { useAuthStore } from "@/store/auth-store";

export default function InsightLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;

  if (!tenantId) return <>{children}</>;

  return (
    <FeatureGate tenantId={tenantId} feature="financial_insight">
      {children}
    </FeatureGate>
  );
}
