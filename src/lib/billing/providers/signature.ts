import { createHash, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Webhook signature helpers (pure)
// ---------------------------------------------------------------------------

/** Midtrans notification signature: sha512(order_id + status_code + gross_amount + serverKey). */
export function midtransSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");
}

/** Constant-time string comparison (avoids timing leaks). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
