// =================================================================
// IAE Strategy Registry — Governance-controlled strategy management
// EEOS Business Core — L1 Domain Engine
// =================================================================

import type {
  IAllocationStrategy,
  AllocationStrategy,
  StrategyRegistration,
  StrategyLifecycleStatus,
} from "./allocation-types";
import { FefoStrategy } from "./strategies/fefo-strategy";

// ─── Registry ───

class StrategyRegistry {
  private strategies = new Map<AllocationStrategy, StrategyRegistration>();

  constructor() {
    // Register default strategies
    this.register({
      strategy: "FEFO",
      implementation: new FefoStrategy(),
      registeredBy: "ADR-010",
      registeredAt: new Date().toISOString(),
      status: "active",
      requiresApproval: false, // FEFO is the default — always active
    });
  }

  register(reg: StrategyRegistration): void {
    if (reg.status === "active" && reg.requiresApproval) {
      console.warn(
        `[IAE] Strategy "${reg.strategy}" registered as active without ADR approval. ` +
        `Production strategies require Architecture Board approval per EEOS Governance.`,
      );
    }
    this.strategies.set(reg.strategy, reg);
  }

  get(strategy: AllocationStrategy): IAllocationStrategy | undefined {
    const reg = this.strategies.get(strategy);
    if (!reg || reg.status === "deprecated") return undefined;
    return reg.implementation;
  }

  getActive(): AllocationStrategy[] {
    return Array.from(this.strategies.values())
      .filter((r) => r.status === "active")
      .map((r) => r.strategy);
  }

  getAvailable(): AllocationStrategy[] {
    return Array.from(this.strategies.values())
      .filter((r) => r.status !== "deprecated")
      .map((r) => r.strategy);
  }

  deprecate(strategy: AllocationStrategy, replacedBy: AllocationStrategy, reason: string): void {
    if (strategy === "FEFO") {
      throw new Error("FEFO is the default strategy and cannot be deprecated.");
    }
    const reg = this.strategies.get(strategy);
    if (!reg) throw new Error(`Unknown strategy: ${strategy}`);
    reg.status = "deprecated";
    console.warn(`[IAE] Strategy "${strategy}" deprecated → use "${replacedBy}". Reason: ${reason}`);
  }

  getRegistration(strategy: AllocationStrategy): StrategyRegistration | undefined {
    return this.strategies.get(strategy);
  }
}

export const strategyRegistry = new StrategyRegistry();
