"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { MaintenanceProvider } from "./maintenance-provider";
import { NetworkProvider } from "./network-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

/**
 * Platform-only provider tree.
 * Excludes TenantProvider, BranchProvider, and TenantBrandProvider —
 * platform users have no tenant/branch scope.
 */
export function PlatformProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>
          <MaintenanceProvider>
            <QueryProvider>
              {children}
              <ToastProvider />
            </QueryProvider>
          </MaintenanceProvider>
        </AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
