"use server";

import { createPrivilegedBilling } from "@/lib/services/billing-factory";

// Pay Now (server action). Initiates payment via the ACTIVE provider (chosen by
// PaymentProviderManager — the tenant never chooses). Privileged (service-role).
export async function payInvoice(invoiceId: string): Promise<{ ok: boolean; message: string; reference?: string }> {
  if (!invoiceId) return { ok: false, message: "Invoice tidak valid." };
  try {
    const r = await createPrivilegedBilling().initiatePayment(invoiceId);
    return { ok: r.ok, message: r.message, reference: r.reference };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal memproses pembayaran." };
  }
}
