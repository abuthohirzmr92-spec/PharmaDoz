"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Receipt, Gauge, Activity, Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "Overview", href: "/settings/subscription", icon: LayoutDashboard, exact: true },
  { label: "Paket", href: "/settings/subscription/plans", icon: Package, exact: false },
  { label: "Tagihan", href: "/settings/subscription/billing", icon: Receipt, exact: false },
  { label: "Penggunaan", href: "/settings/subscription/usage", icon: Gauge, exact: false },
  { label: "Aktivitas", href: "/settings/subscription/activity", icon: Activity, exact: false },
  { label: "Pengaturan", href: "/settings/subscription/settings", icon: Settings2, exact: false },
];

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                active
                  ? "border-brand-200 bg-white text-brand-700 font-semibold shadow-sm dark:border-brand-800 dark:bg-neutral-800 dark:text-brand-300"
                  : "border-transparent text-neutral-500 hover:bg-white/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-300",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
