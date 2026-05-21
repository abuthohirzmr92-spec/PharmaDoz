"use client";

import { useRouter, usePathname } from "next/navigation";
import type { PlatformNavItem as PlatformNavItemType } from "@/config/platform-navigation";

interface PlatformNavItemProps {
  item: PlatformNavItemType;
  active: boolean;
}

export function PlatformNavItem({ item, active }: PlatformNavItemProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(item.href)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
      }`}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </button>
  );
}
