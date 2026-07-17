// ---------------------------------------------------------------------------
// Sweep decision (pure) — one lifecycle step per run, per subscription
// ---------------------------------------------------------------------------
// Given a subscription's current state + temporal fields + config timings,
// decide the NEXT single transition for a scheduler sweep. Pure — no I/O.
// Progresses one stage per run (idempotent by design):
//   active/trial_active → expired/trial_expired (period ended)
//   expired/trial_expired → grace_period
//   grace_period → read_only (after grace_until)
//   read_only → suspended (after read_only_at + read_only_days)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

export interface SweepInput {
  lifecycleState: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
  readOnlyAt: string | null;
}

export interface SweepTimings {
  readOnlyDays: number; // days in read_only before suspension
}

export interface SweepDecision {
  toState: string;
  eventType: string;
}

/** Pure: decide the next sweep transition, or null if nothing is due. */
export function decideSweepTransition(
  s: SweepInput,
  nowISO: string,
  timings: SweepTimings,
): SweepDecision | null {
  const now = Date.parse(nowISO);
  const periodEnded = Date.parse(s.currentPeriodEnd) <= now;

  switch (s.lifecycleState) {
    case "active":
      return periodEnded ? { toState: "expired", eventType: "expired" } : null;
    case "trial_active":
      return periodEnded ? { toState: "trial_expired", eventType: "trial_ended" } : null;
    case "expired":
    case "trial_expired":
      return { toState: "grace_period", eventType: "grace_started" };
    case "grace_period":
      if (s.graceUntil && Date.parse(s.graceUntil) <= now) {
        return { toState: "read_only", eventType: "read_only_started" };
      }
      return null;
    case "read_only":
      if (s.readOnlyAt && Date.parse(s.readOnlyAt) + timings.readOnlyDays * DAY_MS <= now) {
        return { toState: "suspended", eventType: "suspended" };
      }
      return null;
    default:
      return null;
  }
}
