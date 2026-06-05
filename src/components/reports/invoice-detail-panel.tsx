"use client";

import { useMemo } from "react";
import type { TransactionItem } from "@/types/transaction";

// Column config — extensible for P2 (HPP, Profit), P3 (Batch drilldown)
interface ItemColumn {
  key: string;
  label: string;
  width: string;
  align: "left" | "right" | "center";
  render: (item: TransactionItem) => string;
}

const COLUMNS: ItemColumn[] = [
  { key: "productName", label: "Product", width: "40%", align: "left", render: (i) => i.productName },
  { key: "quantity",    label: "Qty",     width: "15%", align: "center", render: (i) => String(i.quantity) },
  { key: "unitPrice",   label: "Unit Price", width: "22%", align: "right", render: (i) => i.unitPrice.toLocaleString("id-ID") },
  { key: "subtotal",    label: "Subtotal",   width: "23%", align: "right", render: (i) => i.subtotal.toLocaleString("id-ID") },
];

interface Props {
  items: TransactionItem[];
  transactionId: string;
}

export function InvoiceDetailPanel({ items, transactionId }: Props) {
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);
    return { sku: items.length, qty: totalQty, amount: totalAmount };
  }, [items]);

  if (!items.length) return null;

  return (
    <tr data-invoice-detail={transactionId} className="bg-neutral-50 dark:bg-neutral-900/50">
      <td colSpan={8} className="px-0 py-0">
        <div className="mx-3 my-2 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-1.5 font-medium text-neutral-500"
                    style={{ width: col.width, textAlign: col.align }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item, idx) => (
                <tr
                  key={item.productId ?? idx}
                  data-product-id={item.productId}
                  data-item-quantity={item.quantity}
                  data-item-subtotal={item.subtotal}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-1 text-neutral-700 dark:text-neutral-300"
                      style={{ textAlign: col.align }}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-300 bg-neutral-50 font-medium dark:border-neutral-600 dark:bg-neutral-800/70">
                <td className="px-3 py-1.5 text-neutral-600 dark:text-neutral-400">
                  Total SKU: {totals.sku}
                </td>
                <td className="px-3 py-1.5 text-center text-neutral-600 dark:text-neutral-400">
                  {totals.qty}
                </td>
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5 text-right text-neutral-800 dark:text-neutral-200 font-semibold">
                  Rp {totals.amount.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </td>
    </tr>
  );
}
