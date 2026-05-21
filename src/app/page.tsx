"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { isPlatformUser } from "@/lib/auth/role-resolver";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
    router.replace(isPlatformUser(role) ? "/platform" : "/dashboard");
  }, [router]);

  return null;
}
