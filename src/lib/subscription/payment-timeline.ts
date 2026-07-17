// ---------------------------------------------------------------------------
// buildPaymentTimeline — canonical payment timeline for an invoice (PURE)
// ---------------------------------------------------------------------------
// Reflects the Payment Timeline Policy. Derives ordered steps from an invoice +
// its latest payment. No I/O, no money math.
// ---------------------------------------------------------------------------

export interface PaymentTimelineStep {
  step: string;
  at: string | null;
  done: boolean;
}

export function buildPaymentTimeline(input: {
  invoiceCreatedAt: string | null;
  invoiceStatus: string;
  paymentStatus: string | null; // pending | success | failed | refunded | null
  paidAt: string | null;
}): PaymentTimelineStep[] {
  const paid = input.invoiceStatus === "paid";
  const paySuccess = input.paymentStatus === "success";
  const paymentStarted = input.paymentStatus !== null;

  return [
    { step: "Invoice dibuat", at: input.invoiceCreatedAt, done: input.invoiceCreatedAt !== null },
    { step: "Pembayaran dimulai", at: null, done: paymentStarted },
    { step: "Pembayaran diterima", at: paySuccess ? input.paidAt : null, done: paySuccess },
    { step: "Invoice lunas", at: paid ? input.paidAt : null, done: paid },
  ];
}
