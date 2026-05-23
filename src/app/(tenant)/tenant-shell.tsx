"use client";

import { TenantProviders } from "@/providers/tenant-providers";
import { SidebarLayout } from "@/components/shared/sidebar-layout";
import { TenantPageErrorBoundary } from "@/components/shared/tenant-page-error-boundary";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantProviders>
      <SidebarLayout>
        <TenantPageErrorBoundary>{children}</TenantPageErrorBoundary>
      </SidebarLayout>
    </TenantProviders>
  );
}
