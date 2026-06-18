"use client";

import { type LucideIcon } from "lucide-react";
import { colorTokens } from "@/theme/tokens";

interface AppIconProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { container: "h-8 w-8 rounded-xl", icon: "h-4 w-4" },
  md: { container: "h-11 w-11 rounded-2xl", icon: "h-5 w-5" },
  lg: { container: "h-14 w-14 rounded-2xl", icon: "h-7 w-7" },
};

export function AppIcon({ icon: Icon, size = "md" }: AppIconProps) {
  const s = sizeMap[size];
  return (
    <div
      className={`flex items-center justify-center ${s.container}`}
      style={{
        background: `linear-gradient(135deg, ${colorTokens.mobile.turquoise}, ${colorTokens.mobile.blue})`,
      }}
    >
      <Icon className={`${s.icon} text-white`} />
    </div>
  );
}
