"use client";

import { useAuthStore } from "@/store/auth-store";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
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

  return <SidebarLayout>{children}</SidebarLayout>;
}
