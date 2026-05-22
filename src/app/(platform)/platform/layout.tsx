"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { useEffect } from "react";

/**
 * Platform sub-layout — auth guard only.
 * The shell (PlatformSidebar + main wrapper) is rendered by
 * (platform)/layout.tsx → PlatformShell. This layout must NOT
 * render a second shell.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isPlatformUser(user?.role)) {
      router.replace("/unauthorized");
    }
  }, [isLoading, isAuthenticated, user?.role, router]);

  if (isLoading || !isAuthenticated) return null;

  return <>{children}</>;
}
