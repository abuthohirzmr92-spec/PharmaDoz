import { settingsRepo } from "@/lib/repository-instances";
import type { SettingsRepository } from "@/lib/repositories/subscription-settings";
import type { PaymentProvider } from "./types";
import { PaymentProviderRegistry, paymentProviderRegistry, pickActiveProviderKey } from "./registry";

// ---------------------------------------------------------------------------
// PaymentProviderManager — the ONLY component that selects a provider
// ---------------------------------------------------------------------------
// BillingService asks the manager ("give me the active provider"); it never
// selects a provider itself. Selection is configuration-driven via
// SettingsRepository (`payment.providers.active`, in priority order) against
// what is actually registered. Adding a provider requires NO BillingService
// change. Dependencies are injectable for tests / privileged graphs.
// ---------------------------------------------------------------------------

const MANUAL_FALLBACK = "manual";

export class PaymentProviderManager {
  constructor(
    private registry: PaymentProviderRegistry = paymentProviderRegistry,
    private settings: SettingsRepository = settingsRepo,
  ) {}

  /** The active provider per config, falling back to Manual. */
  async getActiveProvider(): Promise<PaymentProvider> {
    const activeKeys = await this.settings.getStringArray("payment.providers.active", "providers", [MANUAL_FALLBACK]);
    const key = pickActiveProviderKey(activeKeys, this.registry.keys()) ?? MANUAL_FALLBACK;
    const provider = this.registry.get(key) ?? this.registry.get(MANUAL_FALLBACK);
    if (!provider) throw new Error("No payment provider available (manual not registered).");
    return provider;
  }

  /** Explicit provider by key (e.g. for a webhook routed to a known provider). */
  getProvider(key: string): PaymentProvider {
    const provider = this.registry.get(key);
    if (!provider) throw new Error(`Unknown payment provider: ${key}`);
    return provider;
  }
}

export const paymentProviderManager = new PaymentProviderManager();
