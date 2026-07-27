"use client";

import { useMemo } from "react";
import {
  WorkspaceLayout,
  MasterPanel,
  DetailPanel,
  useWorkspaceSelection,
} from "@/components/shared/workspace";
import { useInventoryStore } from "@/store/inventory-store";
import { useProductCatalog } from "@/hooks/use-product-catalog";
import { buildInventoryProducts } from "@/lib/inventory-demo";
import { useInventoryBranch } from "../use-inventory-branch";
import { InventoryStockTable } from "@/components/inventory/inventory-stock-table";
import { BatchDetailContent } from "@/components/inventory/batch-detail-content";

export default function StockWorkspacePage() {
  useInventoryBranch();

  const { selectedId } = useWorkspaceSelection();
  const batches = useInventoryStore((s) => s.batches);
  const { catalog: productCatalog } = useProductCatalog();

  const products = useMemo(() => {
    if (productCatalog.size === 0) return [];
    return buildInventoryProducts(batches, productCatalog);
  }, [batches, productCatalog]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  const title = selectedProduct ? selectedProduct.name : "Detail Batch";
  const subtitle = selectedProduct
    ? `${selectedProduct.totalStock} ${selectedProduct.salesUnit || selectedProduct.unit || ""} · ${selectedProduct.batches.filter((b) => b.quantity > 0).length} batch aktif`
    : "Pilih produk untuk melihat batch";

  return (
    <WorkspaceLayout className="flex-1 overflow-hidden">
      <MasterPanel flex={6}>
        <InventoryStockTable />
      </MasterPanel>

      <DetailPanel
        flex={4}
        title={title}
        subtitle={subtitle}
        onClose={StockWorkspaceClose}
        empty={
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl opacity-30">📦</span>
            <p className="text-sm font-medium text-neutral-400">Detail Batch</p>
            <p className="text-xs text-neutral-400">
              Pilih salah satu produk untuk melihat daftar batch.
            </p>
          </div>
        }
      >
        <BatchDetailContent />
      </DetailPanel>
    </WorkspaceLayout>
  );
}

function StockWorkspaceClose() {
  const { select } = useWorkspaceSelection();
  return select(null);
}
