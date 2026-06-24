"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { TenantProvider } from "./tenant-provider";
import { BranchProvider } from "./branch-provider";
import { TenantBrandProvider } from "./tenant-brand-provider";
import { MaintenanceProvider } from "./maintenance-provider";
import { NetworkProvider } from "./network-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";
import { bootstrapMpkb } from "@/lib/bootstrap/mpkb-bootstrap";

// RC1.5 P0C — Initialize MPKB listener once at app startup
bootstrapMpkb();

/**
 * Tenant-only provider tree.
 * Includes full tenant/branch scope providers needed for business operations.
 */
export function TenantProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>
          <TenantProvider>
            <BranchProvider>
              <TenantBrandProvider>
                <MaintenanceProvider>
                  <QueryProvider>
                    {children}
                    <ToastProvider />
                  </QueryProvider>
                </MaintenanceProvider>
              </TenantBrandProvider>
            </BranchProvider>
          </TenantProvider>
        </AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
