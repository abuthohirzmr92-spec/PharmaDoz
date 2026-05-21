"use client";

import { useState } from "react";
import { Container } from "@/components/shared/container";
import { ReportTabs } from "@/components/reports/report-tabs";
import { SalesTable } from "@/components/reports/sales-table";
import { InventoryReportTable } from "@/components/reports/inventory-report-table";
import { ExpiredReportTable } from "@/components/reports/expired-report-table";
import { PurchaseReportTable } from "@/components/reports/purchase-report-table";
import { ProfitLossTable } from "@/components/reports/profit-loss-table";
import type { ReportTab } from "@/types/report";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  return (
    <Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Laporan
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Penjualan, inventory, kadaluarsa, pembelian, dan laba/rugi operasional
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6">
        <ReportTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab content */}
      {activeTab === "sales" && <SalesTable />}
      {activeTab === "inventory" && <InventoryReportTable />}
      {activeTab === "expired" && <ExpiredReportTable />}
      {activeTab === "purchase" && <PurchaseReportTable />}
      {activeTab === "pl" && <ProfitLossTable />}
    </Container>
  );
}
