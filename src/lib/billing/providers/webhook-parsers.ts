import type { PaymentIntentStatus, WebhookEvent } from "./types";

// ---------------------------------------------------------------------------
// Provider webhook parsers (pure) — normalize provider payloads → WebhookEvent
// ---------------------------------------------------------------------------
// `verified` is set by the route after the adapter's verifyWebhook(); parsers
// return verified:false and only normalize reference/status/invoiceId.
// ---------------------------------------------------------------------------

type Payload = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null);

/* ── Midtrans ── */
export function mapMidtransStatus(s: string): PaymentIntentStatus {
  switch (s) {
    case "settlement":
    case "capture":
      return "success";
    case "pending":
      return "pending";
    case "expire":
      return "expired";
    default:
      return "failed"; // deny | cancel | failure
  }
}
export function parseMidtransWebhook(p: Payload): WebhookEvent {
  const orderId = str(p.order_id);
  const ts = str(p.transaction_status);
  return { verified: false, reference: orderId, status: ts ? mapMidtransStatus(ts) : null, invoiceId: orderId };
}

/* ── Xendit ── */
export function mapXenditStatus(s: string): PaymentIntentStatus {
  switch (s.toUpperCase()) {
    case "PAID":
    case "SETTLED":
      return "success";
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    default:
      return "failed";
  }
}
export function parseXenditWebhook(p: Payload): WebhookEvent {
  const ext = str(p.external_id);
  const id = str(p.id) ?? ext;
  const s = str(p.status);
  return { verified: false, reference: id, status: s ? mapXenditStatus(s) : null, invoiceId: ext };
}

/* ── Flip ── */
export function mapFlipStatus(s: string): PaymentIntentStatus {
  switch (s.toUpperCase()) {
    case "SUCCESSFUL":
    case "SUCCESS":
      return "success";
    case "PENDING":
      return "pending";
    case "EXPIRED":
      return "expired";
    default:
      return "failed"; // FAILED | CANCELLED
  }
}
export function parseFlipWebhook(p: Payload): WebhookEvent {
  const id = str(p.id);
  const billLink = str(p.bill_link_id);
  const s = str(p.status);
  return { verified: false, reference: id, status: s ? mapFlipStatus(s) : null, invoiceId: billLink };
}
