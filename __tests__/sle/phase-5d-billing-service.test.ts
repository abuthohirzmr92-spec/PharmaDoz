import { describe, it, expect, vi } from "vitest";
import {
  paymentCorrelationId,
  resolvePaymentTransitions,
  mapIntentToPaymentStatus,
  BillingService,
} from "@/lib/services/billing-service";

/* ─── pure helpers ─── */
describe("paymentCorrelationId", () => {
  it("formats <payment>:<provider>:<reference>", () => {
    expect(paymentCorrelationId("midtrans", "INV-1")).toBe("payment:midtrans:INV-1");
  });
});

describe("resolvePaymentTransitions", () => {
  it("trial_active → converted → active", () => {
    expect(resolvePaymentTransitions("trial_active").map((s) => s.toState)).toEqual(["converted", "active"]);
  });
  it("grace/read_only/suspended → active (reactivated)", () => {
    for (const s of ["grace_period", "read_only", "suspended"]) {
      expect(resolvePaymentTransitions(s)).toEqual([{ toState: "active", eventType: "reactivated" }]);
    }
  });
  it("active/expired → [] (not handled here)", () => {
    expect(resolvePaymentTransitions("active")).toEqual([]);
    expect(resolvePaymentTransitions("expired")).toEqual([]);
  });
});

describe("mapIntentToPaymentStatus", () => {
  it("maps canonical intent → payment status", () => {
    expect(mapIntentToPaymentStatus("success")).toBe("success");
    expect(mapIntentToPaymentStatus("pending")).toBe("pending");
    expect(mapIntentToPaymentStatus("failed")).toBe("failed");
    expect(mapIntentToPaymentStatus("expired")).toBe("failed");
  });
});

/* ─── recordPayment orchestration (DI fakes) ─── */
function makeFakes(overrides: Record<string, unknown> = {}) {
  const invoices = {
    getById: vi.fn(async () => ({ id: "inv1", tenantId: "t1", subscriptionId: "s1", amount: 299000, currency: "IDR", dueDate: null })),
    updateStatus: vi.fn(async () => {}),
  };
  const payments = { record: vi.fn(async () => "p1") };
  const subs = {
    existsEventByCorrelation: vi.fn(async () => false),
    getCurrent: vi.fn(async () => ({ id: "s1", lifecycleState: "trial_active" })),
  };
  const lifecycle = { move: vi.fn(async () => {}) };
  const reminders = { notifyPaymentReceived: vi.fn(async () => {}) };
  Object.assign(subs, overrides.subs ?? {});
  const svc = new BillingService(invoices as never, payments as never, subs as never, lifecycle as never, reminders as never);
  return { svc, invoices, payments, subs, lifecycle, reminders };
}

describe("BillingService.recordPayment", () => {
  const successEvent = { verified: true, reference: "REF1", status: "success" as const, invoiceId: "inv1" };

  it("is idempotent when the correlation already exists", async () => {
    const { svc, subs, payments, lifecycle } = makeFakes({ subs: { existsEventByCorrelation: vi.fn(async () => true) } });
    const r = await svc.recordPayment("midtrans", successEvent);
    expect(r.status).toBe("idempotent");
    expect(payments.record).not.toHaveBeenCalled();
    expect(lifecycle.move).not.toHaveBeenCalled();
    void subs;
  });

  it("processes a success: transitions (trial→converted→active), invoice paid, payment recorded, notify", async () => {
    const { svc, invoices, payments, lifecycle, reminders } = makeFakes();
    const r = await svc.recordPayment("midtrans", successEvent);
    expect(r.status).toBe("processed");
    expect(lifecycle.move).toHaveBeenCalledTimes(2); // converted, active
    expect(invoices.updateStatus).toHaveBeenCalledWith("inv1", "paid", expect.objectContaining({ paymentMethod: "midtrans" }));
    expect(payments.record).toHaveBeenCalledTimes(1);
    expect(reminders.notifyPaymentReceived).toHaveBeenCalledWith("t1", "s1");
  });

  it("ignores a non-success event but records the attempt", async () => {
    const { svc, payments, invoices, lifecycle } = makeFakes();
    const r = await svc.recordPayment("midtrans", { ...successEvent, status: "failed" });
    expect(r.status).toBe("ignored");
    expect(payments.record).toHaveBeenCalledTimes(1);
    expect(invoices.updateStatus).not.toHaveBeenCalled();
    expect(lifecycle.move).not.toHaveBeenCalled();
  });

  it("ignores when the invoice cannot be found", async () => {
    const { svc, invoices } = makeFakes();
    invoices.getById = vi.fn(async () => null) as never;
    const r = await svc.recordPayment("midtrans", successEvent);
    expect(r.status).toBe("ignored");
  });
});
