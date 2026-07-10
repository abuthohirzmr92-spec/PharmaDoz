// =================================================================
// MEDISYNC — Factory Reset Service (Modular v3)
// 🔒 Architecture Constitution v1.0
//
// Provides granular, domain-specific reset operations.
// Each operation deletes ONE category of data in FK-safe order.
// Steps call these directly — no monolithic execute-all.
// =================================================================

import { supabase } from "@/lib/supabase/client";

export interface ResetSummary { table: string; count: number; }
export interface DeleteResult { success: boolean; summaries: ResetSummary[]; totalRecords: number; error?: string; }

// ─── Internal helper ───

async function deleteTables(
  tenantId: string,
  tables: { name: string; label: string }[],
): Promise<DeleteResult> {
  if (!supabase) throw new Error("Database not connected");
  const summaries: ResetSummary[] = [];
  let total = 0;

  for (const t of tables) {
    const { count } = await supabase.from(t.name).select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
    const n = count ?? 0;
    if (n > 0) {
      const { error } = await supabase.from(t.name).delete().eq("tenant_id", tenantId);
      if (error) return { success: false, summaries, totalRecords: total, error: `[${t.label}] ${error.message}` };
    }
    summaries.push({ table: t.label, count: n });
    total += n;
  }

  return { success: true, summaries, totalRecords: total };
}

// ─── Domain Operations (FK-safe order within each group) ───

export async function deleteSales(tenantId: string): Promise<DeleteResult> {
  return deleteTables(tenantId, [
    { name: "sale_batch_allocations", label: "Sale Batch Allocations" },
    { name: "transaction_payments",     label: "Transaction Payments" },
    { name: "transaction_items",        label: "Transaction Items" },
    { name: "transactions",             label: "Transactions" },
    { name: "sales_returns",            label: "Sales Returns" },
  ]);
}

export async function deletePurchase(tenantId: string): Promise<DeleteResult> {
  return deleteTables(tenantId, [
    { name: "purchase_items",    label: "Purchase Items" },
    { name: "purchase_payments", label: "Purchase Payments" },
    { name: "purchase_invoices", label: "Purchase Invoices" },
  ]);
}

export async function deleteInventory(tenantId: string): Promise<DeleteResult> {
  return deleteTables(tenantId, [
    { name: "stock_opname_items", label: "Stock Opname Items" },
    { name: "stock_opname",       label: "Stock Opname" },
    { name: "stock_movements",    label: "Stock Movements" },
  ]);
}

export async function deleteBatches(tenantId: string): Promise<DeleteResult> {
  return deleteTables(tenantId, [
    { name: "product_batches", label: "Product Batches" },
  ]);
}

export async function deleteFinance(tenantId: string): Promise<DeleteResult> {
  return deleteTables(tenantId, [
    { name: "wallet_transactions", label: "Wallet Transactions" },
  ]);
}

// ─── Convenience: full reset (calls all domain operations) ───

export async function executeFactoryReset(tenantId: string, performedBy: string): Promise<DeleteResult & { tenantId: string; deletedAt: string }> {
  const startedAt = new Date().toISOString();
  const allSummaries: ResetSummary[] = [];
  let totalRecords = 0;

  const ops = [deleteSales, deletePurchase, deleteInventory, deleteBatches, deleteFinance];
  for (const op of ops) {
    const result = await op(tenantId);
    if (!result.success) {
      return { success: false, tenantId, deletedAt: startedAt, summaries: allSummaries, totalRecords, error: result.error };
    }
    allSummaries.push(...result.summaries);
    totalRecords += result.totalRecords;
  }

  // Audit log
  try {
    await supabase?.from("activity_logs").insert({
      tenant_id: tenantId, action: "tenant.factory_reset", resource_type: "tenant",
      resource_id: tenantId, performed_by: performedBy,
      metadata: { total_records: totalRecords, tables_cleared: allSummaries.length, started_at: startedAt },
      created_at: new Date().toISOString(),
    } as any);
  } catch { /* non-blocking */ }

  return { success: true, tenantId, deletedAt: startedAt, summaries: allSummaries, totalRecords };
}

export async function previewReset(tenantId: string): Promise<ResetSummary[]> {
  if (!supabase) throw new Error("Database not connected");
  const allTables = [
    { name: "sale_batch_allocations", label: "Sale Batch Allocations" },
    { name: "transaction_payments", label: "Transaction Payments" },
    { name: "transaction_items", label: "Transaction Items" },
    { name: "transactions", label: "Transactions" },
    { name: "sales_returns", label: "Sales Returns" },
    { name: "purchase_items", label: "Purchase Items" },
    { name: "purchase_payments", label: "Purchase Payments" },
    { name: "purchase_invoices", label: "Purchase Invoices" },
    { name: "stock_opname_items", label: "Stock Opname Items" },
    { name: "stock_opname", label: "Stock Opname" },
    { name: "stock_movements", label: "Stock Movements" },
    { name: "product_batches", label: "Product Batches" },
    { name: "wallet_transactions", label: "Wallet Transactions" },
  ];
  const summaries: ResetSummary[] = [];
  for (const t of allTables) {
    const { count, error } = await supabase.from(t.name).select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
    if (!error) summaries.push({ table: t.label, count: count ?? 0 });
  }
  return summaries;
}
