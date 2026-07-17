// ---------------------------------------------------------------------------
// Payment confidence & payment status explanations (pure config, PURE)
// ---------------------------------------------------------------------------
// Presentation-only — NO provider logic, NO business rules, NO money math.
// Payment provider selection is handled by PaymentProviderManager; the tenant
// NEVER chooses. These messages reassure tenants about what happens next.
// ---------------------------------------------------------------------------

/** Human-readable payment status explanations (never expose raw values). */
export function paymentStatusExplanation(status: string): string {
  switch (status) {
    case "pending": return "Menunggu konfirmasi pembayaran.";
    case "success": return "Pembayaran telah diterima.";
    case "failed": return "Pembayaran tidak dapat diselesaikan.";
    case "refunded": return "Dana telah dikembalikan.";
    default: return status ? `Status: ${status}` : "—";
  }
}

/** Provider confidence message — reassures the tenant about what happens after "Pay Now". */
export function paymentConfidenceMessage(providerKey: string): string {
  switch (providerKey) {
    case "manual":
      return "Instruksi transfer akan ditampilkan. Pembayaran diverifikasi oleh administrator.";
    case "flip":
      return "Anda akan dialihkan ke Flip dengan aman untuk menyelesaikan pembayaran. Konfirmasi dilakukan otomatis.";
    case "midtrans":
      return "Anda akan dialihkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi. Konfirmasi dilakukan otomatis.";
    case "xendit":
      return "Anda akan dialihkan ke halaman pembayaran Xendit. Konfirmasi dilakukan otomatis.";
    default:
      return "Ikuti instruksi yang diberikan oleh penyedia pembayaran.";
  }
}
