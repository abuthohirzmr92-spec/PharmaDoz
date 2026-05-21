"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const role = useAuthStore.getState().user?.role;
    router.replace(role === "super_admin" ? "/admin" : "/dashboard");
  }, [router]);

  return null;
}
