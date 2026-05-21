"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isSuperAdmin } from "@/lib/auth/super-admin";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
    router.replace(isSuperAdmin(role) ? "/admin" : "/dashboard");
  }, [router]);

  return null;
}
