"use server";

import { createPrivilegedBilling } from "@/lib/services/billing-factory";

// Upgrade request (server action, privileged). Creates a draft upgrade invoice
// and returns the invoice details so the owner can proceed to payment.
export async function submitUpgradeRequest(input: {
  tenantId: string;
  subscriptionId: string;
  toPackageId: string;
  promoCode?: string;
}): Promise<{ ok: boolean; invoiceId?: string; amount?: number; discount?: number; total?: number; message: string }> {
  if (!input.toPackageId || !input.tenantId || !input.subscriptionId) {
    return { ok: false, message: "Silakan pilih paket tujuan terlebih dahulu." };
  }

  try {
    const billing = createPrivilegedBilling();
    const result = await billing.createUpgradeInvoice(
      input.tenantId, input.subscriptionId, input.toPackageId, input.promoCode,
    );

    if (result.error) {
      return { ok: false, message: result.error };
    }

    return {
      ok: true,
      invoiceId: result.invoiceId ?? undefined,
      amount: result.amount,
      discount: result.discount,
      total: result.total,
      message: `Invoice upgrade dibuat. Total: Rp ${Math.round(result.total).toLocaleString("id-ID")}. Lanjutkan ke pembayaran.`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal membuat invoice upgrade." };
  }
}
