"use client";

import { TenantProviders } from "@/providers/tenant-providers";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { MobileLayout } from "@/components/mobile/mobile-layout";
import { MobileGuard } from "@/components/mobile/mobile-guard";
import { TenantPageErrorBoundary } from "@/components/shared/tenant-page-error-boundary";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantProviders>
      {/* Desktop: sidebar layout — always allowed */}
      <div className="hidden md:block">
        <SidebarLayout>
          <TenantPageErrorBoundary>{children}</TenantPageErrorBoundary>
        </SidebarLayout>
      </div>

      {/* Mobile: bottom nav layout — guarded by mobile_app_enabled */}
      <div className="md:hidden">
        <MobileGuard>
          <MobileLayout>
            <TenantPageErrorBoundary>{children}</TenantPageErrorBoundary>
          </MobileLayout>
        </MobileGuard>
      </div>
    </TenantProviders>
  );
}
