"use client";

import { OfflineBanner } from "@/components/shared/offline-banner";
import { RecoveryBanner } from "@/components/shared/recovery-banner";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while checking auth (prevents flash of login redirect
  // during the brief moment Supabase session is being restored).
  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <>
      <OfflineBanner />
      <RecoveryBanner />
      <SidebarLayout>{children}</SidebarLayout>
    </>
  );
}
