import { Container } from "@/components/shared/container";
import { DashboardStatsGrid } from "@/components/dashboard/dashboard-stats-grid";
import { SalesChartCard } from "@/components/dashboard/sales-chart-card";
import { TopProductsCard } from "@/components/dashboard/top-products-card";
import { LowStockCard } from "@/components/dashboard/low-stock-card";
import { NearExpiryCard } from "@/components/dashboard/near-expiry-card";
import { SupplierDebtCard } from "@/components/dashboard/supplier-debt-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";

export default function DashboardPage() {
  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Overview operasional apotek — penjualan, stok, monitoring, dan finansial
        </p>
      </div>

      {/* Row 1: Stat cards */}
      <DashboardStatsGrid />

      {/* Row 2: Sales chart + Top products */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChartCard />
        </div>
        <div>
          <TopProductsCard />
        </div>
      </div>

      {/* Row 3: Low stock + Near expiry */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LowStockCard />
        <NearExpiryCard />
      </div>

      {/* Row 4: Supplier debt + Recent transactions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SupplierDebtCard />
        <RecentTransactionsCard />
      </div>
    </Container>
  );
}
