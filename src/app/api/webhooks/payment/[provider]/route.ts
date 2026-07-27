import { NextResponse } from "next/server";
import { paymentProviderManager } from "@/lib/billing/providers/manager";
import { createPrivilegedBilling } from "@/lib/services/billing-factory";

// Payment provider webhook (composition root). Per the Webhook Ownership
// Matrix: the adapter verifies + parses; BillingService records + orchestrates.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const { provider: providerKey } = await ctx.params;

  let provider;
  try {
    provider = paymentProviderManager.getProvider(providerKey);
  } catch {
    return NextResponse.json({ error: "unknown_provider" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const verified = await provider.verifyWebhook(payload, headers);
  if (!verified) {
    return NextResponse.json({ error: "unverified" }, { status: 401 });
  }

  const event = await provider.processWebhook(payload);

  // Payment recording + downstream orchestration (BillingService, privileged).
  try {
    const result = await createPrivilegedBilling().recordPayment(providerKey, event);
    return NextResponse.json({ received: true, result: result.status });
  } catch (e) {
    // Return 500 so the provider retries; recordPayment is idempotent.
    return NextResponse.json(
      { received: false, error: e instanceof Error ? e.message : "record_failed" },
      { status: 500 },
    );
  }
}
