"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { useEffect } from "react";

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

  return (
    <div className="flex min-h-screen">
      <PlatformSidebar />
      <main className="flex-1 overflow-auto bg-white dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
