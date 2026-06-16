"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Lock, Monitor, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "Profil", href: "/settings/profile", icon: User },
  { label: "Keamanan", href: "/settings/security", icon: Lock },
  { label: "Session", href: "/settings/session", icon: Monitor },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            Pengaturan Akun
          </h1>
          <p className="text-sm text-neutral-500">Kelola profil, keamanan, dan session Anda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-900">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
}
