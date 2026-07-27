"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Palette, Shield, Monitor, Sun, Wrench } from "lucide-react";
import { cn } from "@/lib/cn";

// Locked order — do not reorder.
const CONFIG_TABS = [
  { label: "Branding", href: "/settings/config", icon: Palette, exact: true },
  { label: "Security", href: "/settings/config/security", icon: Shield, exact: false },
  { label: "Session", href: "/settings/config/session", icon: Monitor, exact: false },
  { label: "Theme", href: "/settings/config/theme", icon: Sun, exact: false },
  { label: "Maintenance", href: "/settings/config/maintenance", icon: Wrench, exact: false },
];

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {CONFIG_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap",
                isActive
                  ? "border-brand-200 bg-white text-brand-700 font-semibold shadow-sm hover:border-brand-300 hover:shadow dark:border-brand-700 dark:bg-neutral-800 dark:text-brand-300 dark:hover:border-brand-600"
                  : "border-transparent text-neutral-500 hover:bg-white/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300")}>
              <Icon className="h-4 w-4" />{tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
