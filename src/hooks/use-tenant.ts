"use client";

import { useTenantContext } from "@/providers/tenant-provider";
import type { Tenant, AppRole } from "@/types";

interface UseTenantResult {
  tenant: Tenant | null;
  tenantRole: AppRole | null;
  tenantId: string | null;
  tenantName: string | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  hasAccess: (requestedTenantId: string) => boolean;
}

export function useTenant(): UseTenantResult {
  const { tenant, tenantRole, isSuperAdmin, isLoading, error } =
    useTenantContext();

  const hasAccess = (requestedTenantId: string): boolean => {
    if (isSuperAdmin) return true;
    if (!tenant) return false;
    return tenant.id === requestedTenantId;
  };

  return {
    tenant,
    tenantRole,
    tenantId: tenant?.id ?? null,
    tenantName: tenant?.name ?? null,
    isSuperAdmin,
    isLoading,
    error,
    hasAccess,
  };
}

export function useRequireTenant(): { tenantId: string; tenant: Tenant } {
  const { tenant, tenantId, isLoading, error } = useTenant();

  if (isLoading) {
    throw new Promise(() => {}); // Suspense boundary
  }

  if (error || !tenant) {
    throw new Error(error ?? "Tenant tidak ditemukan. Hubungi administrator.");
  }

  return { tenantId: tenantId!, tenant: tenant! };
}
