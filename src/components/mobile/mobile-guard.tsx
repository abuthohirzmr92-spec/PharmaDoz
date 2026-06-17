"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
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
        if (!supabase) { setAllowed(true); setChecking(false); return; }

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
        // On error, allow through
        setAllowed(true);
      }
      setChecking(false);
    };

    checkPackage();
  }, [router]);

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
