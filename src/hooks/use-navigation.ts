"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { TENANT_NAVIGATION } from "@/config/navigation";
import { PLATFORM_NAV_GROUPS } from "@/config/platform-navigation";
import type { NavItem } from "@/config/navigation";
import type { PlatformNavGroup } from "@/config/platform-navigation";

export interface NavigationResult {
  /** Whether the current user is a platform user (super_admin, developer, support_ai) */
  isPlatform: boolean;
  /** Tenant-scoped navigation items filtered by permission. Empty for platform users. */
  tenantNav: NavItem[];
  /** Platform navigation groups. Empty for tenant users. */
  platformNav: PlatformNavGroup[];
}

/**
 * Returns the appropriate navigation items for the current user.
 * Platform users get platform nav groups; tenant users get permission-filtered
 * tenant nav items.
 */
export function useNavigation(): NavigationResult {
  const user = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);
  const platform = isPlatformUser(user?.role);

  const tenantNav = useMemo(() => {
    if (platform) return [];
    return TENANT_NAVIGATION.filter(
      (item) => !item.permission || can(item.permission),
    );
  }, [platform, can]);

  const platformNav = useMemo(() => {
    if (!platform) return [];
    return PLATFORM_NAV_GROUPS;
  }, [platform]);

  return {
    isPlatform: platform,
    tenantNav,
    platformNav,
  };
}
