"use client";

import { Sun, Moon, Monitor, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useThemeMode } from "@/hooks/use-theme-mode";

const OPTIONS = [
  { value: "light" as const, label: "Terang", desc: "Tampilan putih sepanjang hari", icon: Sun },
  { value: "dark" as const, label: "Gelap", desc: "Nyaman untuk mata di malam hari", icon: Moon },
  { value: "system" as const, label: "Sistem", desc: "Mengikuti pengaturan perangkat Anda", icon: Monitor },
];

export default function ThemePage() {
  const { mode, setMode } = useThemeMode();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
          <Sun className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Tema</h2>
          <p className="text-xs text-neutral-500">Pilih tampilan yang nyaman untuk Anda</p>
        </div>
      </div>

      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = mode === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800",
                isActive
                  ? "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30"
                  : "border-neutral-200 dark:border-neutral-700",
              )}
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isActive ? "bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{opt.label}</p>
                <p className="text-xs text-neutral-400">{opt.desc}</p>
              </div>
              {isActive && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
