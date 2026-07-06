// =================================================================
// CheckoutSessionService — Application Service (V10.4)
// 🔒 Architecture Baseline v1.0 (LOCKED)
//
// Orchestrates the checkout flow by composing Domain Services.
// This is an ORCHESTRATOR — it does NOT contain business logic.
//
// Responsibility: Compose AllocationBuilder → PricingEngine →
//                 AllocationValidator → TransactionFreezer
//
// NEVER: business logic, pricing calculation, FEFO, inventory access,
//        direct DB access, React, Zustand
//
// Architecture Rules:
//   ADR-001  — CheckoutSession as Aggregate Root
//   Princ-6  — Composition over Coupling
// =================================================================

import type {
  CheckoutSession,
  SessionStatus,
  AllocationDraft,
  PriceSnapshot,
  ValidationResult,
  TransactionSnapshot,
  BatchProvider,
  BatchPriceProvider,
  InventorySnapshotProvider,
} from "@/lib/cashier/types";
import { buildAllocation } from "@/lib/cashier/allocation-builder";
import { calculatePricing } from "@/lib/cashier/pricing-engine";
import { validateAllocation } from "@/lib/cashier/allocation-validator";
import { freeze as freezeTransaction } from "@/lib/cashier/transaction-freezer";

// ─── Helpers ───

let _seq = 0;
function generateSessionId(): string {
  _seq++;
  return `session-${Date.now()}-${_seq}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Service ───

export class CheckoutSessionService {
  private batchProvider: BatchProvider;
  private priceProvider: BatchPriceProvider;
  private inventoryProvider: InventorySnapshotProvider;

  /**
   * @param batchProvider — Batch data access (implements BatchProvider)
   * @param priceProvider — Pricing data access (implements BatchPriceProvider)
   * @param inventoryProvider — Current inventory snapshot (implements InventorySnapshotProvider)
   */
  constructor(
    batchProvider: BatchProvider,
    priceProvider: BatchPriceProvider,
    inventoryProvider: InventorySnapshotProvider,
  ) {
    this.batchProvider = batchProvider;
    this.priceProvider = priceProvider;
    this.inventoryProvider = inventoryProvider;
  }

  // ── Lifecycle ──

  /**
   * Create a new CheckoutSession from a cart.
   * Initial state: DRAFT.
   */
  createSession(params: {
    cartId: string;
    tenantId: string;
    branchId: string;
    cashierId: string;
  }): CheckoutSession {
    return {
      sessionId: generateSessionId(),
      cartId: params.cartId,
      tenantId: params.tenantId,
      branchId: params.branchId,
      cashierId: params.cashierId,
      status: "DRAFT",
      version: 1,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  }

  /**
   * Allocate inventory for a product in this session.
   * Composes AllocationBuilder.buildAllocation().
   * Transitions: DRAFT → ALLOCATING (or rebuild from later states).
   */
  allocateInventory(
    session: CheckoutSession,
    productId: string,
    baseQty: number,
  ): CheckoutSession {
    this.assertNotFrozen(session);

    const batches = this.batchProvider.getBatchesByProduct(productId);

    const allocationDraft = buildAllocation({
      productId,
      baseQty,
      availableBatches: batches,
    });

    return {
      ...session,
      status: "ALLOCATING",
      allocationDraft,
      priceSnapshot: undefined,      // stale after re-allocation
      validationResult: undefined,   // stale after re-allocation
      version: session.version + 1,
      updatedAt: nowISO(),
    };
  }

  /**
   * Calculate pricing for the current allocation.
   * Composes PricingEngine.calculatePricing().
   * Transitions: ALLOCATING → PRICED.
   */
  calculatePricing(session: CheckoutSession): CheckoutSession {
    this.assertNotFrozen(session);

    if (!session.allocationDraft) {
      throw new Error("Tidak dapat menghitung harga: alokasi belum dilakukan.");
    }

    const priceSnapshot = calculatePricing({
      allocationDraft: session.allocationDraft,
      priceProvider: this.priceProvider,
    });

    return {
      ...session,
      status: "PRICED",
      priceSnapshot,
      version: session.version + 1,
      updatedAt: nowISO(),
    };
  }

  /**
   * Validate the current allocation against inventory.
   * Composes AllocationValidator.validateAllocation().
   * Transitions: PRICED → VALIDATED (if valid).
   */
  validate(session: CheckoutSession): CheckoutSession {
    this.assertNotFrozen(session);

    if (!session.allocationDraft) {
      throw new Error("Tidak dapat memvalidasi: alokasi belum dilakukan.");
    }

    const currentBatches = this.inventoryProvider.getCurrentBatches(
      session.allocationDraft.productId,
    );

    const validationResult = validateAllocation({
      allocationDraft: session.allocationDraft,
      currentBatches,
    });

    if (validationResult.status === "INVALID") {
      // Stay at PRICED — caller must decide: rebuild or abort
      return {
        ...session,
        validationResult,
        version: session.version + 1,
        updatedAt: nowISO(),
      };
    }

    return {
      ...session,
      status: "VALIDATED",
      validationResult,
      version: session.version + 1,
      updatedAt: nowISO(),
    };
  }

  /**
   * Freeze the session into an immutable TransactionSnapshot.
   * Composes TransactionFreezer.freeze().
   * Transitions: VALIDATED → FROZEN.
   *
   * This is the FINAL operation. After freeze, the session is immutable.
   */
  freeze(
    session: CheckoutSession,
    cartItems: {
      productId: string;
      productName: string;
      baseQuantity: number;
      baseUnitPrice: number;
      selectedUnitCode?: string;
      allocationDraft?: AllocationDraft;
      priceSnapshot?: PriceSnapshot;
    }[],
    payments: { amount: number; method: string; ref?: string; walletId?: string }[],
    transactionId: string,
    invoiceNumber: string,
    cashierName: string,
  ): CheckoutSession {
    this.assertNotFrozen(session);

    if (session.status !== "VALIDATED") {
      throw new Error(
        `Tidak dapat membekukan transaksi: sesi belum divalidasi (status: ${session.status}).`,
      );
    }

    const snapshot = freezeTransaction({
      cartItems,
      payments,
      transactionId,
      invoiceNumber,
      cashierName,
      pharmacyId: session.branchId,
      cashierId: session.cashierId,
    });

    return {
      ...session,
      status: "FROZEN",
      transactionSnapshot: snapshot,
      version: session.version + 1,
      updatedAt: nowISO(),
    };
  }

  /**
   * Run the full checkout pipeline.
   * Convenience method that chains: allocate → price → validate → freeze.
   */
  checkout(params: {
    session: CheckoutSession;
    productId: string;
    baseQty: number;
    cartItems: {
      productId: string;
      productName: string;
      baseQuantity: number;
      baseUnitPrice: number;
      selectedUnitCode?: string;
      allocationDraft?: AllocationDraft;
      priceSnapshot?: PriceSnapshot;
    }[];
    payments: { amount: number; method: string; ref?: string; walletId?: string }[];
    transactionId: string;
    invoiceNumber: string;
    cashierName: string;
  }): CheckoutSession {
    let session = params.session;

    session = this.allocateInventory(session, params.productId, params.baseQty);
    session = this.calculatePricing(session);
    session = this.validate(session);
    session = this.freeze(
      session,
      params.cartItems,
      params.payments,
      params.transactionId,
      params.invoiceNumber,
      params.cashierName,
    );

    return session;
  }

  // ── Guards ──

  private assertNotFrozen(session: CheckoutSession): void {
    if (session.status === "FROZEN") {
      throw new Error(
        `Sesi ${session.sessionId} sudah dibekukan. Tidak dapat dimodifikasi.`,
      );
    }
  }
}
