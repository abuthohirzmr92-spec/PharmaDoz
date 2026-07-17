// ---------------------------------------------------------------------------
// Cron authorization + run-date helpers (pure)
// ---------------------------------------------------------------------------
// Vercel Cron invokes the handler with `Authorization: Bearer <CRON_SECRET>`
// when the CRON_SECRET env var is set. These helpers are pure so they can be
// unit-tested without a request context.
// ---------------------------------------------------------------------------

/** Pure: is the request authorized as a Vercel Cron call? Fails closed. */
export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false; // not configured → deny (fail closed)
  return authHeader === `Bearer ${secret}`;
}

/** Pure: derive the run_date (YYYY-MM-DD, UTC) used for scheduler idempotency. */
export function toRunDate(nowISO: string): string {
  return nowISO.slice(0, 10);
}
