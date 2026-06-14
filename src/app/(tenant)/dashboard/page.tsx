"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { OnboardingBanner } from "@/components/shared/onboarding-banner";
import { GlobalFilterBar } from "@/components/dashboard/global-filter-bar";
import { BranchContextSelector } from "@/components/shared/branch-context-selector";
import { BranchSummaryGrid } from "@/components/dashboard/branch-summary-grid";
import { useBranchStore } from "@/store/branch-store";
import { useTransactionStore } from "@/store/transaction-store";
import { ArrowLeft, Store } from "lucide-react";
import type { MetricFilter } from "@/hooks/use-owner-metrics";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded existing dashboard components (unchanged)               */
/* ------------------------------------------------------------------ */

const DashboardStatsGrid = dynamic(
  () => import("@/components/dashboard/dashboard-stats-grid").then((m) => m.DashboardStatsGrid),
  {
    loading: () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ),
  },
);

const OwnerKpiCards = dynamic(
  () => import("@/components/dashboard/owner-kpi-cards").then((m) => m.OwnerKpiCards),
  { loading: () => <CardSkeleton className="h-[200px]" /> },
);

const SalesChartCard = dynamic(
  () => import("@/components/dashboard/sales-chart-card").then((m) => m.SalesChartCard),
  { loading: () => <CardSkeleton className="h-[280px]" /> },
);

const TopProductsCard = dynamic(
  () => import("@/components/dashboard/top-products-card").then((m) => m.TopProductsCard),
  { loading: () => <TableSkeleton rows={5} /> },
);

const LowStockCard = dynamic(
  () => import("@/components/dashboard/low-stock-card").then((m) => m.LowStockCard),
  { loading: () => <TableSkeleton rows={5} /> },
);

const NearExpiryCard = dynamic(
  () => import("@/components/dashboard/near-expiry-card").then((m) => m.NearExpiryCard),
  { loading: () => <TableSkeleton rows={5} /> },
);

const SupplierDebtCard = dynamic(
  () => import("@/components/dashboard/supplier-debt-card").then((m) => m.SupplierDebtCard),
  { loading: () => <CardSkeleton /> },
);

const RecentTransactionsCard = dynamic(
  () => import("@/components/dashboard/recent-transactions-card").then((m) => m.RecentTransactionsCard),
  { loading: () => <TableSkeleton rows={5} /> },
);

/* ------------------------------------------------------------------ */
/*  Branch Detail View — inline (same page, no route change)           */
/* ------------------------------------------------------------------ */

function BranchDashboard({
  branchId,
  branchName,
  filter,
  onBack,
}: {
  branchId: string;
  branchName: string;
  filter: MetricFilter;
  onBack: () => void;
}) {
  return (
    <>
      {/* Back button + Branch header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard Global
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
            <Store className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {branchName}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Dashboard operasional cabang
            </p>
          </div>
        </div>
      </div>

      {/* Branch KPIs (filtered by branchId) */}
      <WidgetErrorBoundary title="Ringkasan Cabang">
        <OwnerKpiCards filter={filter} branchId={branchId} />
      </WidgetErrorBoundary>

      {/* Sales trend + Top products (branch-scoped) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WidgetErrorBoundary title="Tren Penjualan">
            <SalesChartCard branchId={branchId} />
          </WidgetErrorBoundary>
        </div>
        <div>
          <WidgetErrorBoundary title="Produk Terlaris">
            <TopProductsCard branchId={branchId} />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Low stock + Near expiry (branch-scoped) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="Stok Menipis">
          <LowStockCard branchId={branchId} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Kadaluarsa">
          <NearExpiryCard branchId={branchId} />
        </WidgetErrorBoundary>
      </div>

      {/* Supplier debt + Recent transactions (branch-scoped) */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="Hutang Supplier">
          <SupplierDebtCard branchId={branchId} />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Transaksi Terbaru">
          <RecentTransactionsCard branchId={branchId} />
        </WidgetErrorBoundary>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Global Dashboard View                                              */
/* ------------------------------------------------------------------ */

function GlobalDashboard({ filter, onSelectBranch }: { filter: MetricFilter; onSelectBranch: (id: string) => void }) {
  return (
    <>
      {/* Row 1: Stat cards */}
      <WidgetErrorBoundary title="Ringkasan">
        <DashboardStatsGrid />
      </WidgetErrorBoundary>

      {/* Row 1b: Global KPIs (period-filtered, all branches) */}
      <WidgetErrorBoundary title="Ringkasan Bisnis">
        <OwnerKpiCards filter={filter} />
      </WidgetErrorBoundary>

      {/* Row 2: Sales chart + Top products */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WidgetErrorBoundary title="Tren Penjualan">
            <SalesChartCard />
          </WidgetErrorBoundary>
        </div>
        <div>
          <WidgetErrorBoundary title="Produk Terlaris">
            <TopProductsCard />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Row 3: Low stock + Near expiry */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="Stok Menipis">
          <LowStockCard />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Kadaluarsa">
          <NearExpiryCard />
        </WidgetErrorBoundary>
      </div>

      {/* Row 4: Supplier debt + Recent transactions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="Hutang Supplier">
          <SupplierDebtCard />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Transaksi Terbaru">
          <RecentTransactionsCard />
        </WidgetErrorBoundary>
      </div>

      {/* Row 5: Branch summary grid */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-neutral-50">
          Cabang Saya
        </h2>
        <BranchSummaryGrid onSelectBranch={onSelectBranch} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page — two-level architecture                            */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [filter, setFilter] = useState<MetricFilter>({ period: "today" });
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const loadTxns = useTransactionStore((s) => s.loadDemoTransactions);
  const isTxnsLoaded = useTransactionStore((s) => s.isLoaded);

  /* ---- Load data on mount ---- */
  useEffect(() => {
    if (!isTxnsLoaded) loadTxns();
  }, [isTxnsLoaded, loadTxns]);

  // Branches are loaded by BranchProvider on auth — no lazy load needed

  /* ---- Resolve selected branch name ---- */
  const selectedBranch = useMemo(
    () => (selectedBranchId ? branches.find((b) => b.id === selectedBranchId) : null),
    [selectedBranchId, branches],
  );

  return (
    <Container>
      <OnboardingBanner />

      {/* Global Filter Bar + Dashboard Scope Selector */}
      <div className="mb-6 space-y-3">
        <GlobalFilterBar filter={filter} onChange={setFilter} />
        <BranchContextSelector
          value={selectedBranchId ?? "all"}
          onChange={(id) => setSelectedBranchId(id === "all" ? null : id)}
        />
      </div>

      {/* LEVEL 2: Branch Detail Dashboard */}
      {selectedBranchId && selectedBranch && (
        <BranchDashboard
          branchId={selectedBranchId}
          branchName={selectedBranch.name}
          filter={filter}
          onBack={() => setSelectedBranchId(null)}
        />
      )}

      {/* LEVEL 1: Global Dashboard */}
      {selectedBranchId === null && (
        <GlobalDashboard
          filter={filter}
          onSelectBranch={setSelectedBranchId}
        />
      )}
    </Container>
  );
}
