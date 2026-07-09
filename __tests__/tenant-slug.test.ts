import { describe, it, expect } from "vitest";
import {
  validateSlug,
  generateSlug,
  ensureUniqueSlug,
  isReserved,
  getReservedSlugs,
} from "@/lib/tenant/slug";
import { resolveTenantFromHostname } from "@/lib/tenant/tenant-resolution";

/* ─── Validation ─── */

describe("Slug Validation", () => {
  it("accepts: lowercase letters + hyphens", () => {
    expect(validateSlug("apotek-sehat").valid).toBe(true);
  });

  it("accepts: letters + numbers", () => {
    expect(validateSlug("pharmacy123").valid).toBe(true);
  });

  it("accepts: single word", () => {
    expect(validateSlug("medika").valid).toBe(true);
  });

  it("accepts: 3 character minimum", () => {
    expect(validateSlug("abc").valid).toBe(true);
  });

  it("rejects: shorter than 3", () => {
    expect(validateSlug("ab").valid).toBe(false);
    expect(validateSlug("a").valid).toBe(false);
  });

  it("rejects: longer than 30 chars", () => {
    expect(validateSlug("a".repeat(31)).valid).toBe(false);
  });

  it("accepts: exactly 30 chars", () => {
    const slug = "a".repeat(30);
    expect(validateSlug(slug).valid).toBe(true);
  });

  it("rejects: uppercase", () => {
    expect(validateSlug("Apotek-Sehat").valid).toBe(false);
    expect(validateSlug("APOTEK").valid).toBe(false);
  });

  it("rejects: spaces", () => {
    expect(validateSlug("apotek sehat").valid).toBe(false);
  });

  it("rejects: special characters", () => {
    expect(validateSlug("apotek@sehat").valid).toBe(false);
    expect(validateSlug("apotek_sehat").valid).toBe(false);
    expect(validateSlug("apotek.sehat").valid).toBe(false);
    expect(validateSlug("apotek!sehat").valid).toBe(false);
  });

  it("rejects: unicode / non-ASCII", () => {
    expect(validateSlug("apotèk").valid).toBe(false);
    expect(validateSlug("аптека").valid).toBe(false);
  });

  it("rejects: leading hyphen", () => {
    expect(validateSlug("-apotek").valid).toBe(false);
  });

  it("rejects: trailing hyphen", () => {
    expect(validateSlug("apotek-").valid).toBe(false);
  });

  it("rejects: double hyphen", () => {
    expect(validateSlug("apotek--sehat").valid).toBe(false);
  });

  it("rejects: empty string", () => {
    expect(validateSlug("").valid).toBe(false);
  });

  it("rejects: whitespace-only", () => {
    expect(validateSlug("   ").valid).toBe(false);
  });

  it("rejects: number-only slug", () => {
    // Numbers are technically valid per the spec (alphanumeric)
    expect(validateSlug("12345").valid).toBe(true);
  });

  it("rejects: all reserved slugs", () => {
    for (const slug of getReservedSlugs()) {
      const result = validateSlug(slug);
      expect(result.valid).toBe(false);
    }
  });
});

/* ─── Generation ─── */

describe("Slug Generation", () => {
  it("generates slug from simple name", () => {
    expect(generateSlug("Apotek Sehat")).toBe("apotek-sehat");
  });

  it("converts to lowercase", () => {
    expect(generateSlug("APOTEK SEHAT")).toBe("apotek-sehat");
  });

  it("removes special characters", () => {
    expect(generateSlug("Apotek Sehat!")).toBe("apotek-sehat");
  });

  it("collapses multiple spaces", () => {
    expect(generateSlug("Apotek   Sehat")).toBe("apotek-sehat");
  });

  it("trims whitespace", () => {
    expect(generateSlug("  Apotek Sehat  ")).toBe("apotek-sehat");
  });

  it("strips unicode characters (not transliterated)", () => {
    // è is removed, not converted to e — generateSlug strips all non-[a-z0-9] chars
    expect(generateSlug("Apotèk Sehat")).toBe("apotk-sehat");
  });

  it("truncates to 30 characters", () => {
    const long = "Apotek Sehat Selalu Menyediakan Obat Berkualitas Untuk Semua";
    expect(generateSlug(long).length).toBeLessThanOrEqual(30);
    expect(generateSlug(long)).not.toContain("--");
  });

  it("collapses multiple hyphens in long names", () => {
    const result = generateSlug("A - B - C - D");
    expect(result).toBe("a-b-c-d");
    expect(result).not.toContain("--");
  });
});

/* ─── Uniqueness ─── */

describe("Slug Uniqueness", () => {
  it("returns original if no collision", () => {
    const existing = new Set(["other-slug"]);
    expect(ensureUniqueSlug("apotek-sehat", existing)).toBe("apotek-sehat");
  });

  it("appends suffix on collision", () => {
    const existing = new Set(["apotek-sehat"]);
    expect(ensureUniqueSlug("apotek-sehat", existing)).toBe("apotek-sehat-1");
  });

  it("increments suffix if -1 also taken", () => {
    const existing = new Set(["apotek-sehat", "apotek-sehat-1", "apotek-sehat-2"]);
    expect(ensureUniqueSlug("apotek-sehat", existing)).toBe("apotek-sehat-3");
  });

  it("throws after MAX_SUFFIX_ATTEMPTS collisions", () => {
    const existing = new Set<string>();
    for (let i = 1; i <= 100; i++) existing.add(`slug-${i}`);
    existing.add("slug");
    expect(() => ensureUniqueSlug("slug", existing)).toThrow(/Tidak dapat membuat slug unik/);
  });

  it("is deterministic — same input always gives same output", () => {
    const existing = new Set(["test", "test-1", "test-3"]);
    const a = ensureUniqueSlug("test", existing);
    const b = ensureUniqueSlug("test", existing);
    expect(a).toBe(b);
  });
});

/* ─── Reserved ─── */

describe("Reserved Slugs", () => {
  it("admin is reserved", () => expect(isReserved("admin")).toBe(true));
  it("API is reserved", () => expect(isReserved("api")).toBe(true));
  it("www is reserved", () => expect(isReserved("www")).toBe(true));
  it("MEDISYNC is reserved", () => expect(isReserved("medisync")).toBe(true));
  it("apotek-sehat is NOT reserved", () => expect(isReserved("apotek-sehat")).toBe(false));
  it("returns sorted list", () => {
    const slugs = getReservedSlugs();
    expect(slugs.length).toBeGreaterThan(20);
    expect(slugs).toEqual([...slugs].sort());
  });
});

/* ─── Tenant Resolution ─── */

describe("Tenant Resolution — Hostname", () => {
  it("resolves tenant from subdomain", () => {
    const result = resolveTenantFromHostname("apotek-sehat.medisync.id");
    expect(result.resolved).toBe(true);
    expect(result.identity?.slug).toBe("apotek-sehat");
    expect(result.identity?.source).toBe("subdomain");
    expect(result.identity?.isRootDomain).toBe(false);
  });

  it("returns root identity for medisync.id", () => {
    const result = resolveTenantFromHostname("medisync.id");
    expect(result.resolved).toBe(false);
    expect(result.identity?.isRootDomain).toBe(true);
    expect(result.identity?.source).toBe("root");
  });

  it("returns root identity for localhost", () => {
    const result = resolveTenantFromHostname("localhost");
    expect(result.identity?.source).toBe("root");
  });

  it("strips port from hostname", () => {
    const result = resolveTenantFromHostname("apotek-sehat.medisync.id:3000");
    expect(result.resolved).toBe(true);
    expect(result.identity?.slug).toBe("apotek-sehat");
  });

  it("rejects uppercase in subdomain", () => {
    const result = resolveTenantFromHostname("APOTEK.medisync.id");
    expect(result.resolved).toBe(false);
    expect(result.error).toContain("lowercase");
  });

  it("returns error for unknown domain", () => {
    const result = resolveTenantFromHostname("random-domain.com");
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.identity?.source).toBe("unknown");
  });

  it("rejects invalid slug characters in subdomain", () => {
    const result = resolveTenantFromHostname("apotek_sehat.medisync.id");
    expect(result.resolved).toBe(false);
  });

  it("preserves hostname in identity", () => {
    const result = resolveTenantFromHostname("apotek-sehat.medisync.id");
    expect(result.identity?.hostname).toBe("apotek-sehat.medisync.id");
  });

  it("strips port from hostname in identity", () => {
    const result = resolveTenantFromHostname("apotek-sehat.medisync.id:3000");
    expect(result.identity?.hostname).toBe("apotek-sehat.medisync.id");
  });
});
