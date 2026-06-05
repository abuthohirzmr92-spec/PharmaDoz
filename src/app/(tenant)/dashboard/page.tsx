import dynamic from "next/dynamic";
import { Container } from "@/components/shared/container";
import { WidgetErrorBoundary } from "@/components/shared/widget-error-boundary";
import { CardSkeleton } from "@/components/shared/card-skeleton";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { OnboardingBanner } from "@/components/shared/onboarding-banner";

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
  {
    loading: () => <CardSkeleton className="h-[280px]" />,
  },
);

const TopProductsCard = dynamic(
  () => import("@/components/dashboard/top-products-card").then((m) => m.TopProductsCard),
  {
    loading: () => <TableSkeleton rows={5} />,
  },
);

const LowStockCard = dynamic(
  () => import("@/components/dashboard/low-stock-card").then((m) => m.LowStockCard),
  {
    loading: () => <TableSkeleton rows={5} />,
  },
);

const NearExpiryCard = dynamic(
  () => import("@/components/dashboard/near-expiry-card").then((m) => m.NearExpiryCard),
  {
    loading: () => <TableSkeleton rows={5} />,
  },
);

const SupplierDebtCard = dynamic(
  () => import("@/components/dashboard/supplier-debt-card").then((m) => m.SupplierDebtCard),
  {
    loading: () => <CardSkeleton />,
  },
);

const RecentTransactionsCard = dynamic(
  () => import("@/components/dashboard/recent-transactions-card").then((m) => m.RecentTransactionsCard),
  {
    loading: () => <TableSkeleton rows={5} />,
  },
);

export default function DashboardPage() {
  return (
    <Container>
      <OnboardingBanner />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Overview operasional apotek — penjualan, stok, monitoring, dan finansial
        </p>
      </div>

      {/* Row 1: Stat cards */}
      <WidgetErrorBoundary title="Ringkasan">
        <DashboardStatsGrid />
      </WidgetErrorBoundary>

      {/* Row 1b: Owner KPI Cards */}
      <WidgetErrorBoundary title="Ringkasan Bisnis">
        <OwnerKpiCards />
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
    </Container>
  );
}
