"use client";

import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser as checkIsPlatformUser } from "@/lib/auth/role-resolver";
import type { AppRole, Permission } from "@/types";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loginAs = useAuthStore((s) => s.loginAs);
  const logout = useAuthStore((s) => s.logout);
  const switchRole = useAuthStore((s) => s.switchRole);
  const can = useAuthStore((s) => s.can);
  const getRole = useAuthStore((s) => s.getRole);

  const isPlatformUser = checkIsPlatformUser(user?.role);

  return {
    user,
    isAuthenticated,
    isLoading,
    isPlatformUser,
    loginAs,
    logout,
    switchRole,
    can,
    getRole,
  };
}

export function usePermission(permission: Permission): boolean {
  return useAuthStore((s) => s.can(permission));
}

export function useRole(): AppRole | null {
  return useAuthStore((s) => s.getRole());
}

export function useIsPlatformUser(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return checkIsPlatformUser(role);
}

export function usePharmacyId(): string | undefined {
  return useAuthStore((s) => s.user?.pharmacyId);
}

export function usePharmacyName(): string | undefined {
  return useAuthStore((s) => s.user?.pharmacyName);
}

export function useIsDemoMode(): boolean {
  return useAuthStore((s) => s.isStoreDemoMode());
}
