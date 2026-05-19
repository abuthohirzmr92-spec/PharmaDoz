"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-provider";
import { NetworkProvider } from "./network-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { ToastProvider } from "./toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>
          <QueryProvider>
            {children}
            <ToastProvider />
          </QueryProvider>
        </AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}
