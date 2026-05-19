"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useCashierStore } from "@/store/cashier-store";
import { useTransactionStore } from "@/store/transaction-store";
import { useInventoryStore } from "@/store/inventory-store";
import { useHoldCartStore } from "@/store/hold-cart-store";
import { supabase, isSupabaseConnected } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const loginAs = useAuthStore((s) => s.loginAs);
  const initFromSupabaseSession = useAuthStore(
    (s) => s.initFromSupabaseSession,
  );
  const router = useRouter();

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

      // 2. Check localStorage for demo session
      if (!cancelled) {
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem("apotek-auth")
            : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.user && parsed.isAuthenticated) {
              // Already hydrated by the store's module-level init
              setIsHydrating(false);
              return;
            }
          } catch {
            /* ignore corrupt storage */
          }
        }
      }

      // 3. Fallback — login as owner
      if (!cancelled) {
        if (!useAuthStore.getState().isAuthenticated) {
          loginAs("owner");
        }
        setIsHydrating(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [loginAs, initFromSupabaseSession]);

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

        // Clear auth state without calling signOut again (Supabase already signed out)
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          authMode: "demo",
        });
        router.push("/login");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Session restored — refresh user profile
        await initFromSupabaseSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initFromSupabaseSession, router]);

  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
