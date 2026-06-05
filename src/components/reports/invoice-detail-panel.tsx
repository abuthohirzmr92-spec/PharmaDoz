"use client";

import React, { useMemo, useState } from "react";
import { useInventoryStore } from "@/store/inventory-store";
import { BatchAllocationPanel } from "./batch-allocation-panel";
import type { TransactionItem } from "@/types/transaction";

interface ItemColumn {
  key: string;
  label: string;
  width: string;
  align: "left" | "right" | "center";
  render: (item: TransactionItem, hpp: number) => string;
}

const COLUMNS: ItemColumn[] = [
  { key: "productName", label: "Product",     width: "28%", align: "left",   render: (i) => i.productName },
  { key: "quantity",    label: "Qty",          width: "8%",  align: "center", render: (i) => String(i.quantity) },
  { key: "unitPrice",   label: "Unit Price",   width: "14%", align: "right",  render: (i) => i.unitPrice.toLocaleString("id-ID") },
  { key: "subtotal",    label: "Revenue",      width: "15%", align: "right",  render: (i) => i.subtotal.toLocaleString("id-ID") },
  { key: "hpp",         label: "HPP",           width: "14%", align: "right",  render: (_, hpp) => hpp > 0 ? hpp.toLocaleString("id-ID") : "—" },
  { key: "profit",      label: "Profit",        width: "10%", align: "right",  render: (i, hpp) => { const p = i.subtotal - hpp; return hpp > 0 ? (p >= 0 ? "+" : "") + p.toLocaleString("id-ID") : "—"; }},
  { key: "margin",      label: "M%",            width: "5%",  align: "center", render: (i, hpp) => hpp > 0 ? Math.round(((i.subtotal - hpp) / i.subtotal) * 100) + "%" : "—" },
  { key: "expand",      label: "",              width: "6%",  align: "center", render: () => "" },
];

interface Props {
  items: TransactionItem[];
  transactionId: string;
}

export function InvoiceDetailPanel({ items, transactionId }: Props) {
  const allocations = useInventoryStore((s) => s.saleAllocations);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Build per-item HPP map from allocations
  const hppMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of allocations) {
      if (a.transactionId !== transactionId) continue;
      if (!a.transactionItemId) continue;
      const current = map.get(a.transactionItemId) ?? 0;
      map.set(a.transactionItemId, current + a.quantity * a.costPrice);
    }
    return map;
  }, [allocations, transactionId]);

  const hasAllocations = allocations.length > 0;

  const totals = useMemo(() => {
    let qty = 0, revenue = 0, hpp = 0;
    for (const item of items) {
      qty += item.quantity;
      revenue += item.subtotal;
      if (hasAllocations) hpp += (hppMap.get(item.id ?? "") ?? 0);
    }
    const profit = revenue - hpp;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return { sku: items.length, qty, revenue, hpp, profit, margin, hasAllocations };
  }, [items, hppMap, hasAllocations]);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!items.length) return null;

  return (
    <tr data-invoice-detail={transactionId} className="bg-neutral-50 dark:bg-neutral-900/50">
      <td colSpan={9} className="px-0 py-0">
        <div className="mx-3 my-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-2 py-1.5 font-medium text-neutral-500 whitespace-nowrap"
                    style={{ width: col.width, textAlign: col.align }}>
                    {col.key === "expand" ? "" : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item, idx) => {
                const itemId = item.id ?? item.productId ?? String(idx);
                const itemHpp = hppMap.get(itemId) ?? 0;
                const isExpanded = expandedItems.has(itemId);
                const hasBatches = hasAllocations && itemHpp > 0;
                return (
                  <React.Fragment key={itemId}>
                    <tr data-product-id={item.productId} data-item-id={item.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      {COLUMNS.map((col) => {
                        if (col.key === "expand") {
                          return (
                            <td key={col.key} className="px-2 py-1 text-center">
                              {hasBatches && (
                                <button onClick={() => toggleItem(itemId)}
                                  className="text-[9px] text-neutral-400 hover:text-neutral-600 font-mono">
                                  {isExpanded ? "▲" : "▼"}
                                </button>
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className="px-2 py-1 text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
                            style={{ textAlign: col.align }}>
                            {col.render(item, itemHpp)}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && (
                      <BatchAllocationPanel
                        transactionId={transactionId}
                        itemId={itemId}
                        itemHpp={itemHpp}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-300 bg-neutral-50 font-medium dark:border-neutral-600 dark:bg-neutral-800/70">
                <td className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400">SKU: {totals.sku}</td>
                <td className="px-2 py-1.5 text-center text-neutral-600">{totals.qty}</td>
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5 text-right text-neutral-800 dark:text-neutral-200 font-semibold">Rp {totals.revenue.toLocaleString("id-ID")}</td>
                <td className="px-2 py-1.5 text-right text-neutral-600">{totals.hasAllocations ? "Rp " + totals.hpp.toLocaleString("id-ID") : "—"}</td>
                <td className="px-2 py-1.5 text-right font-semibold" style={{ color: totals.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                  {totals.hasAllocations ? (totals.profit >= 0 ? "+" : "") + "Rp " + totals.profit.toLocaleString("id-ID") : "—"}
                </td>
                <td className="px-2 py-1.5 text-center font-semibold" style={{ color: totals.margin >= 30 ? "#16a34a" : totals.margin >= 10 ? "#d97706" : "#dc2626" }}>
                  {totals.hasAllocations ? totals.margin + "%" : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}
