import { describe, it, expect } from "vitest";
import { SchedulerRunRepository } from "@/lib/repositories/scheduler-run";
import { createSleRepositories } from "@/lib/repository-instances";
import { getServiceRoleClient, getTestClient } from "@/lib/supabase/client-factory";

/* ─── BaseRepository client injection ─── */
describe("BaseRepository injected client", () => {
  it("uses the injected client (isConnected true even without env)", () => {
    const repo = new SchedulerRunRepository({ from: () => ({}) } as never);
    expect(repo.isConnected).toBe(true);
  });
  it("without injection falls back to the (unset in test) module client", () => {
    const repo = new SchedulerRunRepository();
    expect(repo.isConnected).toBe(false);
  });
});

/* ─── createSleRepositories ─── */
describe("createSleRepositories", () => {
  it("binds every repo to the injected client", () => {
    const repos = createSleRepositories({ from: () => ({}) } as never);
    expect(repos.settings.isConnected).toBe(true);
    expect(repos.subscription.isConnected).toBe(true);
    expect(repos.reminder.isConnected).toBe(true);
    expect(repos.schedulerRun.isConnected).toBe(true);
  });
});

/* ─── client factory ─── */
describe("client-factory", () => {
  it("getServiceRoleClient throws when env is not configured", () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      expect(() => getServiceRoleClient()).toThrow(/service-role/i);
    } finally {
      if (url !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    }
  });
  it("getTestClient is not implemented yet", () => {
    expect(() => getTestClient()).toThrow(/not implemented/i);
  });
});
