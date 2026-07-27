import { NextResponse } from "next/server";
import { createPrivilegedScheduler } from "@/lib/services/scheduler-factory";
import { isAuthorizedCron, toRunDate } from "@/lib/cron/auth";

// Vercel Cron entrypoint — reminder dispatch.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const nowISO = new Date().toISOString();
  const runDate = toRunDate(nowISO);
  const startedAt = Date.now();

  try {
    const result = await createPrivilegedScheduler().runReminderDispatch(runDate, nowISO);
    // eslint-disable-next-line no-console -- structured observability log (info)
    console.log(
      JSON.stringify({
        ts: nowISO, level: "info", service: "scheduler", op: "reminder_dispatch",
        correlationId: `scheduler:reminder_dispatch:${runDate}`,
        runDate, durationMs: Date.now() - startedAt, outcome: "ok", ...result,
      }),
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(
      JSON.stringify({
        ts: nowISO, level: "error", service: "scheduler", op: "reminder_dispatch",
        correlationId: `scheduler:reminder_dispatch:${runDate}`,
        runDate, durationMs: Date.now() - startedAt, outcome: "error",
        errorClass: "unexpected", error: e instanceof Error ? e.message : String(e),
      }),
    );
    return NextResponse.json({ ok: false, error: "dispatch_failed" }, { status: 500 });
  }
}
