"use client";

import { TenantProviders } from "@/providers/tenant-providers";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { MobileLayout } from "@/components/mobile/mobile-layout";
import { TenantPageErrorBoundary } from "@/components/shared/tenant-page-error-boundary";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantProviders>
      {/* Desktop: sidebar layout */}
      <div className="hidden md:block">
        <SidebarLayout>
          <TenantPageErrorBoundary>{children}</TenantPageErrorBoundary>
        </SidebarLayout>
      </div>

      {/* Mobile: bottom nav layout */}
      <div className="md:hidden">
        <MobileLayout>
          <TenantPageErrorBoundary>{children}</TenantPageErrorBoundary>
        </MobileLayout>
      </div>
    </TenantProviders>
  );
}
