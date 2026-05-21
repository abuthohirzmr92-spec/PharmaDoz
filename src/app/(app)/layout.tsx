"use client";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { RecoveryBanner } from "@/components/shared/recovery-banner";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { logLayoutResolution } from "@/lib/observability/route-debug";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const PLATFORM_PREFIXES = ["/admin", "/platform"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [stagingDismissed, setStagingDismissed] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const pathname = usePathname();

  const isStaging =
    process.env.NEXT_PUBLIC_APP_URL &&
    !process.env.NEXT_PUBLIC_APP_URL.includes("localhost");

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect platform users away from tenant-scoped pages.
  // The middleware handles this server-side; this is defense-in-depth.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isPlatformUser(user?.role)) return;
    const isPlatformRoute = PLATFORM_PREFIXES.some((p) => pathname?.startsWith(p));
    if (!isPlatformRoute) {
      logLayoutResolution(pathname, user?.role ?? "none", "redirecting");
      setIsRedirecting(true);
      router.replace("/platform");
    }
  }, [isAuthenticated, user?.role, pathname, router]);

  const isPlatformRoute = PLATFORM_PREFIXES.some((p) => pathname?.startsWith(p));
  const platformUser = isPlatformUser(user?.role);

  // Show skeleton while checking auth or redirecting
  if (isLoading || isRedirecting) return <PageSkeleton />;
  if (!isAuthenticated) return null;

  // Platform users on tenant routes — show nothing while redirecting
  if (platformUser && !isPlatformRoute) return <PageSkeleton />;

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
      {(isPlatformRoute || platformUser)
        ? (logLayoutResolution(pathname, user?.role ?? "none", "platform"), children)
        : (logLayoutResolution(pathname, user?.role ?? "none", "tenant"),
           <SidebarLayout>{children}</SidebarLayout>)}
    </>
  );
}
