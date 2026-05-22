"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { logRouteTransition } from "@/lib/observability/route-debug";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Handle Supabase auth callbacks that land on the root (e.g. password
    // recovery from Supabase Dashboard where redirect_to points to root).
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
      return;
    }

    // Handle hash fragments (access_token for implicit flow fallback)
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");
      if (accessToken && (type === "recovery" || type === "signup")) {
        const params = new URLSearchParams();
        params.set("access_token", accessToken);
        if (refreshToken) params.set("refresh_token", refreshToken);
        params.set("type", type);
        params.set("next", next);
        router.replace(`/auth/callback?${params.toString()}`);
        return;
      }
    }

    // Wait for auth hydration to settle before resolving the redirect
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    const destination = isPlatformUser(user?.role) ? "/platform" : "/dashboard";
    logRouteTransition("/", destination, user?.role ?? "none");
    router.replace(destination);
  }, [isAuthenticated, isLoading, user?.role, router, searchParams]);

  return <PageSkeleton />;
}
