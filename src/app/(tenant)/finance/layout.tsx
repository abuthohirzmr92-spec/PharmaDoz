"use client";

import { FeatureGate } from "@/lib/features/feature-gate";
import { useAuthStore } from "@/store/auth-store";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;

  // Demo mode or no tenant context — allow access
  if (!tenantId) return <>{children}</>;

  return (
    <FeatureGate tenantId={tenantId} feature="financial_wallet">
      {children}
    </FeatureGate>
  );
}
