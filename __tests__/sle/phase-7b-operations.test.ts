import { describe, it, expect } from "vitest";
import { platformHealthHero } from "@/lib/subscription/platform-health-model";

describe("platformHealthHero", () => {
  it("healthy when all subsystems ok", () => {
    const hero = platformHealthHero({ schedulerOk: true, providerOk: true, billingOk: true, databaseOk: true });
    expect(hero.status).toBe("healthy");
    expect(hero.icon).toBe("🟢");
  });
  it("attention when one subsystem failing", () => {
    const hero = platformHealthHero({ schedulerOk: false, providerOk: true, billingOk: true, databaseOk: true });
    expect(hero.status).toBe("attention");
    expect(hero.icon).toBe("🟡");
  });
  it("critical when 2+ failure, shown in items", () => {
    const hero = platformHealthHero({ schedulerOk: false, providerOk: false, billingOk: true, databaseOk: true });
    expect(hero.status).toBe("critical");
    expect(hero.icon).toBe("🔴");
    expect(hero.items.filter((i) => !i.ok)).toHaveLength(2);
  });
});
