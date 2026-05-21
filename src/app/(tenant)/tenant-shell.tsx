"use client";

import { TenantProviders } from "@/providers/tenant-providers";
import { SidebarLayout } from "@/components/shared/sidebar-layout";

export function TenantShell({ children }: { children: React.ReactNode }) {
  return (
    <TenantProviders>
      <SidebarLayout>{children}</SidebarLayout>
    </TenantProviders>
  );
}
