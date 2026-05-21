"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authRepo } from "@/lib/repository-instances";
import { productRepo, supplierRepo, inventoryRepo, transactionRepo } from "@/lib/repository-instances";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import type { Tenant, AppRole, TenantContext } from "@/types";

interface TenantContextValue {
  tenant: Tenant | null;
  tenantRole: AppRole | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

const TenantCtx = createContext<TenantContextValue>({
  tenant: null,
  tenantRole: null,
  isSuperAdmin: false,
  isLoading: false,
  error: null,
});

export function useTenantContext(): TenantContextValue {
  return useContext(TenantCtx);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantRole, setTenantRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdminUser = isSuperAdmin(user?.role);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setTenant(null);
      setTenantRole(null);
      setError(null);
      return;
    }

    // Super admin has no tenant scope
    if (isSuperAdmin(user.role)) {
      setTenant(null);
      setTenantRole("super_admin");
      productRepo.setTenantContext(undefined);
      supplierRepo.setTenantContext(undefined);
      inventoryRepo.setTenantContext(undefined);
      transactionRepo.setTenantContext(undefined);
      return;
    }

    // Resolve tenant for business roles
    const tenantId = user.tenantId ?? user.pharmacyId;
    if (!tenantId) {
      setError("Tidak ada tenant yang terkait dengan akun ini.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    authRepo
      .getTenantForProfile(user.id)
      .then((t) => {
        if (t) {
          setTenant(t);
          setTenantRole(user.role);
          const ctx = { tenantId: t.id, role: user.role, userId: user.id };
          productRepo.setTenantContext(ctx);
          supplierRepo.setTenantContext(ctx);
          inventoryRepo.setTenantContext(ctx);
          transactionRepo.setTenantContext(ctx);
        } else if (tenantId) {
          // Fallback: use tenant info from user profile
          const fallback: Tenant = {
            id: tenantId,
            name: user.tenantName ?? user.pharmacyName ?? "Tenant",
            slug: tenantId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setTenant(fallback);
          setTenantRole(user.role);
        }
      })
      .catch((err) => {
        setError("Gagal memuat data tenant.");
        console.error("Tenant resolution error:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, isAuthenticated]);

  return (
    <TenantCtx.Provider
      value={{ tenant, tenantRole, isSuperAdmin: isSuperAdminUser, isLoading, error }}
    >
      {children}
    </TenantCtx.Provider>
  );
}
