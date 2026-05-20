"use client";

import { useAuthStore } from "@/store/auth-store";
import type { AppRole, Permission } from "@/types";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loginAs = useAuthStore((s) => s.loginAs);
  const logout = useAuthStore((s) => s.logout);
  const switchRole = useAuthStore((s) => s.switchRole);
  const can = useAuthStore((s) => s.can);
  const getRole = useAuthStore((s) => s.getRole);

  return { user, isAuthenticated, loginAs, logout, switchRole, can, getRole };
}

export function usePermission(permission: Permission): boolean {
  return useAuthStore((s) => s.can(permission));
}

export function useRole(): AppRole | null {
  return useAuthStore((s) => s.getRole());
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
