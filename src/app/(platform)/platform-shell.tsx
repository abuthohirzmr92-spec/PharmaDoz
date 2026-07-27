"use client";

import { PlatformProviders } from "@/providers/platform-providers";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { SIDEBAR_CONTENT_GAP } from "@/config/constants";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <PlatformProviders>
      <div className="flex min-h-screen">
        <PlatformSidebar />
        <main className="flex-1 overflow-auto bg-white dark:bg-neutral-950">
          <div
            className="py-6"
            style={{ paddingLeft: SIDEBAR_CONTENT_GAP, paddingRight: SIDEBAR_CONTENT_GAP }}
          >
            {children}
          </div>
        </main>
      </div>
    </PlatformProviders>
  );
}
