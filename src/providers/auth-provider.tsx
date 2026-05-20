"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useCashierStore } from "@/store/cashier-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useHoldCartStore } from "@/store/hold-cart-store";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";
import { isDemoMode } from "@/config/env";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/unauthorized", "/offline"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const loginAs = useAuthStore((s) => s.loginAs);
  const initFromSupabaseSession = useAuthStore((s) => s.initFromSupabaseSession);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // 1. Try Supabase session first
      if (isSupabaseConnected()) {
        const restored = await initFromSupabaseSession();
        if (restored && !cancelled) {
          setIsHydrating(false);
          return;
        }
      }

      // 2. Demo mode: check localStorage for persisted demo session
      if (isDemoMode() && !cancelled) {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("apotek-auth")
            : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.user && parsed.isAuthenticated) {
              setIsHydrating(false);
              return;
            }
          } catch {
            /* ignore corrupt storage */
          }
        }
      }

      // 3. Demo mode: auto-login as tenant_owner for convenience
      if (isDemoMode() && !cancelled) {
        if (!useAuthStore.getState().isAuthenticated) {
          loginAs("tenant_owner");
        }
        setIsHydrating(false);
        return;
      }

      // 4. Production: no session → redirect to /login
      if (!cancelled) {
        const isPublic = PUBLIC_PATHS.some(
          (p) => pathname === p || pathname.startsWith(p + "/"),
        );
        if (!isPublic) {
          router.replace("/login");
        }
        setIsHydrating(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [loginAs, initFromSupabaseSession, pathname, router]);

  // Listen for Supabase auth state changes
  useEffect(() => {
    if (!isSupabaseConnected()) return;

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        // Clear domain stores to prevent tenant/session leakage
        useCashierStore.getState().resetCashier();
        useTransactionStore.setState({
          transactions: [],
          isLoaded: false,
          isLoading: false,
          isDemoMode: true,
        });
        useInventoryStore.setState({
          batches: [],
          suppliers: [],
          purchaseInvoices: [],
          stockMovements: [],
          stockOpnames: [],
          dataSource: "demo",
          isDemoMode: true,
          isLoading: false,
          isSubmitting: false,
        });
        useHoldCartStore.setState({ heldCarts: [], isHoldListOpen: false });

        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        if (pathname !== "/login") {
          router.push("/login");
        }
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await initFromSupabaseSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initFromSupabaseSession, router, pathname]);

  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
