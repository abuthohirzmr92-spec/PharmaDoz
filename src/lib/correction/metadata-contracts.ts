// =================================================================
// Metadata Contracts — Zod-validated per module
// EEOS V5 — Security Architect Mandated
// =================================================================

import { z } from "zod";

// ─── Purchase Invoice Metadata Contract ───

export const PurchaseInvoiceMetadataContract = z.object({
  invoice_number: z.string(),
  supplier_id: z.string().uuid(),
  supplier_name: z.string(),
  total_before: z.number(),
  total_after: z.number(),
  item_count: z.number().int().positive(),
  changed_fields: z.array(z.string()),
  overpayment_amount: z.number().optional(),
  outstanding_amount: z.number().optional(),
  reason_category: z.enum(["data_entry_error", "supplier_correction", "price_change", "quantity_discrepancy", "other"]).optional(),
  contract_version: z.literal(1),
});

export type PurchaseInvoiceMetadata = z.infer<typeof PurchaseInvoiceMetadataContract>;

// ─── Future Contracts (ready when modules are built) ───

export const SalesInvoiceMetadataContract = z.object({
  transaction_number: z.string(),
  customer_id: z.string().uuid().optional(),
  total_before: z.number(),
  total_after: z.number(),
  item_count: z.number().int().positive(),
  changed_fields: z.array(z.string()),
  reason_category: z.enum(["data_entry_error", "customer_request", "pricing_error", "other"]).optional(),
  contract_version: z.literal(1),
});

export const StockAdjustmentMetadataContract = z.object({
  batch_ids: z.array(z.string().uuid()),
  adjustment_type: z.enum(["correction", "write_off", "found", "damaged"]),
  total_qty_before: z.number(),
  total_qty_after: z.number(),
  contract_version: z.literal(1),
});

// ─── Contract Registry ───

export const MetadataContracts = {
  purchase_invoice: PurchaseInvoiceMetadataContract,
  sales_invoice: SalesInvoiceMetadataContract,
  stock_adjustment: StockAdjustmentMetadataContract,
} as const;

export type MetadataContractMap = {
  purchase_invoice: PurchaseInvoiceMetadata;
  sales_invoice: z.infer<typeof SalesInvoiceMetadataContract>;
  stock_adjustment: z.infer<typeof StockAdjustmentMetadataContract>;
};

/**
 * Validate and return typed metadata for a given module.
 * Throws if metadata does not match the contract.
 */
export function validateMetadata<M extends keyof typeof MetadataContracts>(
  module: M,
  data: unknown,
): MetadataContractMap[M] {
  const contract = MetadataContracts[module];
  return contract.parse(data) as MetadataContractMap[M];
}
