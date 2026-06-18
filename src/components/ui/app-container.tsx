"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerSize = "phone" | "tablet" | "desktop";

const maxWidthMap: Record<ContainerSize, string> = {
  phone: "max-w-md",
  tablet: "max-w-3xl",
  desktop: "max-w-7xl",
};

interface AppContainerProps {
  children: ReactNode;
  size?: ContainerSize;
  className?: string;
}

export function AppContainer({ children, size = "desktop", className }: AppContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4", maxWidthMap[size], className)}>
      {children}
    </div>
  );
}
