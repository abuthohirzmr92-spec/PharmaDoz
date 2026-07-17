import { describe, it, expect } from "vitest";
import { isAuthorizedCron, toRunDate } from "@/lib/cron/auth";

describe("isAuthorizedCron", () => {
  it("accepts a matching Bearer secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
  });
  it("rejects a mismatched secret", () => {
    expect(isAuthorizedCron("Bearer wrong", "s3cret")).toBe(false);
  });
  it("rejects a missing header", () => {
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });
  it("fails closed when the secret is not configured", () => {
    expect(isAuthorizedCron("Bearer anything", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
  });
  it("rejects a raw secret without the Bearer prefix", () => {
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
  });
});

describe("toRunDate", () => {
  it("extracts YYYY-MM-DD (UTC) from an ISO timestamp", () => {
    expect(toRunDate("2026-07-12T03:07:41.000Z")).toBe("2026-07-12");
  });
});
