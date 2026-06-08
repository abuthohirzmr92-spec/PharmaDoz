"use client";

import { useState } from "react";
import { Container } from "@/components/shared/container";
import { ReportTabs } from "@/components/reports/report-tabs";
import { BranchContextSelector } from "@/components/shared/branch-context-selector";
import { SalesTable } from "@/components/reports/sales-table";
import { InventoryReportTable } from "@/components/reports/inventory-report-table";
import { ExpiredReportTable } from "@/components/reports/expired-report-table";
import { PurchaseReportTable } from "@/components/reports/purchase-report-table";
import { ProfitLossTable } from "@/components/reports/profit-loss-table";
import { ProductAnalyticsPanel } from "@/components/reports/product-analytics-panel";
import { ActivityLogTable } from "@/components/reports/activity-log-table";
import type { ReportTab } from "@/types/report";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [branchId, setBranchId] = useState<string>("all");

  return (
    <Container>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Laporan
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Penjualan, inventory, kadaluarsa, pembelian, dan laba/rugi operasional
        </p>
      </div>

      {/* Branch filter — shared across all report tabs */}
      <div className="mb-4">
        <BranchContextSelector value={branchId} onChange={setBranchId} />
      </div>

      {/* Tab bar */}
      <div className="mb-6">
        <ReportTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab content */}
      {activeTab === "sales" && <SalesTable branchId={branchId} />}
      {activeTab === "inventory" && <InventoryReportTable branchId={branchId} />}
      {activeTab === "expired" && <ExpiredReportTable branchId={branchId} />}
      {activeTab === "purchase" && <PurchaseReportTable branchId={branchId} />}
      {activeTab === "pl" && <ProfitLossTable branchId={branchId} />}
      {activeTab === "products" && <ProductAnalyticsPanel branchId={branchId} />}
      {activeTab === "activity" && <ActivityLogTable branchId={branchId} />}
    </Container>
  );
}
