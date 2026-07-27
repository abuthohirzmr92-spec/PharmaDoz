"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Selection Context                                                   */
/* ------------------------------------------------------------------ */

type SelectionContextValue = {
  selectedId: string | null;
  select: (id: string | null) => void;
};

const SelectionCtx = createContext<SelectionContextValue>({
  selectedId: null,
  select: () => {},
});

export function useWorkspaceSelection() {
  return useContext(SelectionCtx);
}

/* ------------------------------------------------------------------ */
/*  WorkspaceLayout                                                     */
/* ------------------------------------------------------------------ */

/**
 * Enterprise ERP Master-Detail Workspace.
 *
 * Fluid flex layout — no fixed widths. Left panel flex-grows to fill
 * available space; right panel takes a proportional share. Heights are
 * matched so both panels form a single unified workspace.
 *
 * Reusable across: Inventory, Cashier, Supplier, CRM, Keuangan, etc.
 */
export function WorkspaceLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const select = useCallback((id: string | null) => setSelectedId(id), []);

  return (
    <SelectionCtx.Provider value={{ selectedId, select }}>
      <div
        className={cn(
          "flex flex-col lg:flex-row lg:items-stretch gap-4 h-full min-h-0 overflow-hidden",
          className,
        )}
      >
        {children}
      </div>
    </SelectionCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  MasterPanel                                                         */
/* ------------------------------------------------------------------ */

/**
 * Left panel — the master list. Takes remaining space after DetailPanel.
 *
 * Props:
 * - flex: proportion (default 7 → ~70% when DetailPanel is 3)
 */
export function MasterPanel({
  children,
  flex = 7,
  className,
}: {
  children: ReactNode;
  flex?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex flex-col min-h-0 h-full overflow-hidden",
        "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
      style={{ flex: `${flex} 1 0%` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailPanel                                                         */
/* ------------------------------------------------------------------ */

/**
 * Right panel — detail view. Proportional width, tab-ready.
 *
 * Props:
 * - flex: proportion (default 3 → ~30% when MasterPanel is 7)
 * - tabs: optional tab definitions for future expansion
 * - activeTab / onTabChange: tab state (if not provided, renders children directly)
 *
 * When no selection is active, shows `empty` content.
 */
export function DetailPanel({
  children,
  empty,
  flex = 3,
  tabs,
  activeTab,
  onTabChange,
  title,
  subtitle,
  onClose,
  className,
}: {
  children?: ReactNode;
  empty?: ReactNode;
  flex?: number;
  tabs?: { key: string; label: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  className?: string;
}) {
  const { selectedId } = useWorkspaceSelection();
  const isActive = selectedId !== null;

  if (!isActive) {
    return (
      <div
        className={cn(
          "hidden lg:flex flex-col items-center justify-center h-full min-h-0 overflow-hidden",
          "rounded-xl border border-neutral-200 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30",
          "p-6 text-center",
          className,
        )}
        style={{ flex: `${flex} 1 0%` }}
      >
        {empty ?? (
          <div>
            <p className="text-sm font-medium text-neutral-400">Detail</p>
            <p className="mt-1 text-xs text-neutral-400">
              Pilih item untuk melihat detail.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col min-h-0 h-full overflow-hidden",
        "rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
        className,
      )}
      style={{ flex: `${flex} 1 0%` }}
    >
      {/* Header */}
      {(title || onClose || tabs) && (
        <div className="shrink-0 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            {title && (
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[11px] text-neutral-400">{subtitle}</p>
                )}
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                title="Tutup detail"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="mt-2 flex gap-1 rounded-lg border border-neutral-100 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange?.(tab.key)}
                  className={cn(
                    "flex-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                    (activeTab ?? tabs[0]!.key) === tab.key
                      ? "bg-white text-brand-700 shadow-sm dark:bg-neutral-800 dark:text-brand-300"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content — passes height constraint to child, child handles its own scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
