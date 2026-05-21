"use client";

import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface GuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PlatformGuard — only allows platform users (super_admin, developer,
 * support_ai) to see children. Redirects non-platform users to /unauthorized.
 * Shows fallback (default null) while loading or not authenticated.
 */
export function PlatformGuard({ children, fallback = null }: GuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isPlatformUser(user?.role)) {
      router.replace("/unauthorized");
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading || !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (!isPlatformUser(user?.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * TenantGuard — only allows tenant users (tenant_owner, admin, pharmacist,
 * cashier, staff) to see children. Redirects platform users to /admin.
 * Shows fallback (default null) while loading or not authenticated.
 */
export function TenantGuard({ children, fallback = null }: GuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && isPlatformUser(user?.role)) {
      router.replace("/admin");
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading || !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (isPlatformUser(user?.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
