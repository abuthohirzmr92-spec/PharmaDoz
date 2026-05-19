"use client";

import { useEffect } from "react";
import { useNetworkStore } from "@/store/network-store";
import { subscribeToNetworkChanges } from "@/lib/network-status";

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const setStatus = useNetworkStore((s) => s.setStatus);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((status) => {
      setStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, [setStatus]);

  return <>{children}</>;
}
