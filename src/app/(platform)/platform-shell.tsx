"use client";

import { PlatformProviders } from "@/providers/platform-providers";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProviders>
      <div className="flex min-h-screen">
        <PlatformSidebar />
        <main className="flex-1 overflow-auto bg-white dark:bg-neutral-950">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </PlatformProviders>
  );
}
