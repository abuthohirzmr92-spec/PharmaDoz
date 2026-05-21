"use client";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { RecoveryBanner } from "@/components/shared/recovery-banner";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [stagingDismissed, setStagingDismissed] = useState(false);
  const pathname = usePathname();

  const isStaging =
    process.env.NEXT_PUBLIC_APP_URL &&
    !process.env.NEXT_PUBLIC_APP_URL.includes("localhost");

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect super admins away from tenant-scoped pages
  useEffect(() => {
    if (
      isAuthenticated &&
      isSuperAdmin(user?.role) &&
      pathname === "/dashboard"
    ) {
      router.replace("/admin");
    }
  }, [isAuthenticated, user?.role, pathname, router]);

  const isAdminRoute = pathname?.startsWith("/admin");
  const platformUser = isPlatformUser(user?.role);

  // Show skeleton while checking auth (prevents flash of login redirect
  // during the brief moment Supabase session is being restored).
  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated) return null;

  return (
    <>
      {isStaging && !stagingDismissed && (
        <div className="flex h-8 items-center justify-center gap-2 bg-amber-500 px-4 text-xs font-medium text-white">
          <span className="tracking-wide">Staging Environment</span>
          <button
            onClick={() => setStagingDismissed(true)}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded hover:bg-amber-400"
            aria-label="Tutup"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <OfflineBanner />
      <RecoveryBanner />
      {isAdminRoute || platformUser ? children : <SidebarLayout>{children}</SidebarLayout>}
    </>
  );
}
