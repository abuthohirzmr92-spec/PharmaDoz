"use client";

import { useEffect } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { useBranchStore } from "@/store/branch-store";
import { isDemoMode as checkDemoMode } from "@/config/env";

/** Sync branch context + load demo data. Call once per inventory sub-page. */
export function useInventoryBranch() {
  const setInventoryBranchContext = useInventoryStore((s) => s.setBranchContext);
  const activeBranch = useBranchStore((s) => s.activeBranch);
  const loadDemoData = useInventoryStore((s) => s.loadDemoData);

  useEffect(() => {
    const branchId = activeBranch?.id ?? null;
    setInventoryBranchContext(branchId);
    if (!checkDemoMode() && branchId) {
      useInventoryStore.setState({
        batches: [],
        purchaseInvoices: [],
        stockMovements: [],
        stockOpnames: [],
        saleAllocations: [],
        dataSource: "loading" as const,
      });
    }
    loadDemoData();
  }, [activeBranch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (checkDemoMode()) {
      loadDemoData();
    }
  }, [loadDemoData]);
}
