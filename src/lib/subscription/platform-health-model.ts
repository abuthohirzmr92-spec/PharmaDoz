// ---------------------------------------------------------------------------
// Platform health hero ViewModel (PURE) — operational summary
// ---------------------------------------------------------------------------
// Summarizes scheduler/provider/runtime/database health into a single hero
// status. Consumes existing data; NO business logic or I/O.
// ---------------------------------------------------------------------------

export type HeroStatus = "healthy" | "attention" | "critical";

export interface HealthHero {
  status: HeroStatus;
  icon: string;
  label: string;
  items: { label: string; ok: boolean }[];
}

export function platformHealthHero(input: {
  schedulerOk: boolean;
  providerOk: boolean;
  billingOk: boolean;
  databaseOk: boolean;
}): HealthHero {
  const items = [
    { label: "Scheduler", ok: input.schedulerOk },
    { label: "Penyedia Pembayaran", ok: input.providerOk },
    { label: "Penagihan", ok: input.billingOk },
    { label: "Database", ok: input.databaseOk },
  ];
  const allOk = items.every((i) => i.ok);
  const anyCritical = items.filter((i) => !i.ok).length >= 2;
  const status: HeroStatus = allOk ? "healthy" : anyCritical ? "critical" : "attention";
  return {
    status,
    icon: status === "healthy" ? "🟢" : status === "critical" ? "🔴" : "🟡",
    label: status === "healthy" ? "Platform Sehat" : status === "critical" ? "Masalah Kritis" : "Perhatian Diperlukan",
    items,
  };
}
