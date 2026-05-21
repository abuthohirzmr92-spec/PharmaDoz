"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { logRouteTransition } from "@/lib/observability/route-debug";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Wait for auth hydration to settle before resolving the redirect
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    const destination = isPlatformUser(user?.role) ? "/platform" : "/dashboard";
    logRouteTransition("/", destination, user?.role ?? "none");
    router.replace(destination);
  }, [isAuthenticated, isLoading, user?.role, router]);

  return <PageSkeleton />;
}
