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

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/unauthorized", "/offline"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const initFromSupabaseSession = useAuthStore((s) => s.initFromSupabaseSession);
  const router = useRouter();
  const pathname = usePathname();

  // If on a public path (login, register, etc.), skip hydration and show page immediately
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    // Public pages don't need auth check — show content right away
    if (isPublic) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      try {
        // 1. Try Supabase session
        if (isSupabaseConnected()) {
          const restored = await initFromSupabaseSession();
          if (restored && !cancelled) {
            setIsHydrating(false);
            return;
          }
        }

        // 2. Demo mode: check localStorage
        if (isDemoMode() && !cancelled) {
          try {
            const stored = localStorage.getItem("apotek-auth");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.user && parsed.isAuthenticated) {
                setIsHydrating(false);
                return;
              }
            }
          } catch {
            /* ignore */
          }
          // Auto-login as tenant_owner
          if (!useAuthStore.getState().isAuthenticated) {
            useAuthStore.getState().loginAs("tenant_owner");
          }
          setIsHydrating(false);
          return;
        }

        // 3. Production: no session → redirect to /login
        if (!cancelled) {
          router.replace("/login");
          setIsHydrating(false);
        }
      } catch (err) {
        console.error("Auth hydration error:", err);
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [isPublic, initFromSupabaseSession, router]);

  // Listen for Supabase auth state changes (only when connected)
  useEffect(() => {
    if (!isSupabaseConnected()) return;

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event) => {
      try {
        if (event === "SIGNED_OUT") {
          useCashierStore.getState().resetCashier();
          useTransactionStore.setState({
            transactions: [],
            isLoaded: false,
            isLoading: false,
            isDemoMode: isDemoMode(),
          });
          useInventoryStore.setState({
            batches: [],
            suppliers: [],
            purchaseInvoices: [],
            stockMovements: [],
            stockOpnames: [],
            dataSource: isDemoMode() ? "demo" : "loading",
            isDemoMode: isDemoMode(),
            isLoading: false,
            isSubmitting: false,
          });
          useHoldCartStore.setState({ heldCarts: [], isHoldListOpen: false });
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            impersonating: false,
            originalUser: null,
          });
          if (pathname !== "/login") {
            router.push("/login");
          }
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await initFromSupabaseSession();
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initFromSupabaseSession, router, pathname]);

  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-xs text-neutral-400">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
