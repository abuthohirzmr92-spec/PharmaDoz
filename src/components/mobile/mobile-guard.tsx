"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isMobileDevice } from "@/lib/device/device-access";
import { useAuthStore } from "@/store/auth-store";
import { usePackageStore } from "@/store/package-store";
import { Loader2 } from "lucide-react";

/**
 * Mobile Guard — redirects mobile users to /mobile-locked
 * if their tenant package does not have mobile_app_enabled.
 * Desktop users always pass through.
 */
export function MobileGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // P0: /mobile-locked MUST always render — prevent infinite redirect loop
    if (pathname === "/mobile-locked") {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // Desktop always allowed
    if (!isMobileDevice()) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // Mobile: check package
    const { user } = useAuthStore.getState();
    if (!user) {
      setAllowed(true);
      setChecking(false);
      return;
    }

    // Load packages and check tenant's package
    const { packages, loadPackages } = usePackageStore.getState();
    const checkPackage = async () => {
      try {
        if (packages.length === 0) await loadPackages();
        const pkgs = usePackageStore.getState().packages;

        // Get tenant's package_id via Supabase
        const { supabase } = await import("@/lib/supabase/client");
        if (!supabase) {
          // P1: fail-closed — no supabase means can't verify, lock access
          router.replace("/mobile-locked");
          setChecking(false);
          return;
        }

        const { data: tenant } = await (supabase as any)
          .from("tenants")
          .select("package_id")
          .eq("id", user.tenantId)
          .maybeSingle();

        const pkgId = tenant?.package_id;
        const pkg = pkgs.find((p) => p.id === pkgId);

        if (pkg?.mobileAppEnabled) {
          setAllowed(true);
        } else {
          router.replace("/mobile-locked");
        }
      } catch {
        // P1: fail-closed — on error, lock access
        router.replace("/mobile-locked");
      }
      setChecking(false);
    };

    checkPackage();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] dark:bg-[#0F172A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E88E5]" />
      </div>
    );
  }

  if (!allowed) return null;
  return <>{children}</>;
}
