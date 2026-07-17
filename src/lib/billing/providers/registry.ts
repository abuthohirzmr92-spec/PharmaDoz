import type { PaymentProvider } from "./types";
import { ManualProvider } from "./manual-provider";
import { FlipProvider } from "./flip";
import { MidtransProvider } from "./midtrans";
import { XenditProvider } from "./xendit";

// ---------------------------------------------------------------------------
// PaymentProviderRegistry — plugin registry of payment providers
// ---------------------------------------------------------------------------
// Adding a new provider = implement PaymentProvider + register it here (or at
// runtime). BillingService never touches this directly; it goes through
// PaymentProviderManager. Flip/Midtrans/Xendit adapters register in Batch 5D.
// ---------------------------------------------------------------------------

export class PaymentProviderRegistry {
  private providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): void {
    this.providers.set(provider.key, provider);
  }

  get(key: string): PaymentProvider | undefined {
    return this.providers.get(key);
  }

  has(key: string): boolean {
    return this.providers.has(key);
  }

  keys(): string[] {
    return [...this.providers.keys()];
  }
}

/** Pure: choose the first active provider key that is actually registered. */
export function pickActiveProviderKey(
  activeKeys: string[],
  registeredKeys: string[],
): string | null {
  const registered = new Set(registeredKeys);
  for (const key of activeKeys) {
    if (registered.has(key)) return key;
  }
  return null;
}

// Default registry with the first-class providers pre-registered.
// Manual + Flip + Midtrans + Xendit (Flip is a primary provider).
export const paymentProviderRegistry = new PaymentProviderRegistry();
paymentProviderRegistry.register(new ManualProvider());
paymentProviderRegistry.register(new FlipProvider());
paymentProviderRegistry.register(new MidtransProvider());
paymentProviderRegistry.register(new XenditProvider());
