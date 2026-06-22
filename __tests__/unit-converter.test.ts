// ---------------------------------------------------------------------------
// V2 Phase 3A — Unit Converter Tests
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import { toBaseUnit, fromBaseUnit, breakdownBaseUnit } from "@/lib/unit-converter";
import type { UnitLevel } from "@/types/unit";

// Shared fixture: Paracetamol
//   Level 1: Tablet  (base, implicit)
//   Level 2: Strip   contains = 10
//   Level 3: Dus     contains = 20
const PARACETAMOL: UnitLevel[] = [
  { level: 2, unitName: "Strip", contains: 10 },
  { level: 3, unitName: "Dus", contains: 20 },
];
const BASE = "Tablet";

// ============================================================================
// toBaseUnit
// ============================================================================

describe("toBaseUnit", () => {
  it("1 Strip = 10 Tablet", () => {
    expect(toBaseUnit(1, "Strip", PARACETAMOL)).toBe(10);
  });

  it("3 Strip = 30 Tablet", () => {
    expect(toBaseUnit(3, "Strip", PARACETAMOL)).toBe(30);
  });

  it("1 Dus = 200 Tablet", () => {
    expect(toBaseUnit(1, "Dus", PARACETAMOL)).toBe(200);
  });

  it("2 Dus = 400 Tablet", () => {
    expect(toBaseUnit(2, "Dus", PARACETAMOL)).toBe(400);
  });

  it("base unit returns same quantity", () => {
    expect(toBaseUnit(5, "Tablet", PARACETAMOL)).toBe(5);
  });

  it("unknown unit returns same quantity", () => {
    expect(toBaseUnit(5, "Botol", PARACETAMOL)).toBe(5);
  });

  it("case insensitive lookup", () => {
    expect(toBaseUnit(2, "dus", PARACETAMOL)).toBe(400);
    expect(toBaseUnit(1, "STRIP", PARACETAMOL)).toBe(10);
  });

  it("empty unitLevels returns same quantity", () => {
    expect(toBaseUnit(10, "Dus", [])).toBe(10);
  });
});

// ============================================================================
// fromBaseUnit
// ============================================================================

describe("fromBaseUnit", () => {
  it("10 Tablet = 1 Strip", () => {
    expect(fromBaseUnit(10, "Strip", PARACETAMOL)).toBe(1);
  });

  it("25 Tablet = 2 Strip", () => {
    expect(fromBaseUnit(25, "Strip", PARACETAMOL)).toBe(2);
  });

  it("200 Tablet = 1 Dus", () => {
    expect(fromBaseUnit(200, "Dus", PARACETAMOL)).toBe(1);
  });

  it("400 Tablet = 2 Dus", () => {
    expect(fromBaseUnit(400, "Dus", PARACETAMOL)).toBe(2);
  });

  it("base unit returns same", () => {
    expect(fromBaseUnit(7, "Tablet", PARACETAMOL)).toBe(7);
  });

  it("unknown unit returns same", () => {
    expect(fromBaseUnit(7, "Botol", PARACETAMOL)).toBe(7);
  });
});

// ============================================================================
// breakdownBaseUnit
// ============================================================================

describe("breakdownBaseUnit", () => {
  it("427 Tablet = 2 Dus + 2 Strip + 7 Tablet", () => {
    const result = breakdownBaseUnit(427, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Dus", quantity: 2 },
      { unitName: "Strip", quantity: 2 },
      { unitName: "Tablet", quantity: 7 },
    ]);
  });

  it("37 Tablet = 3 Strip + 7 Tablet", () => {
    const result = breakdownBaseUnit(37, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Strip", quantity: 3 },
      { unitName: "Tablet", quantity: 7 },
    ]);
  });

  it("200 Tablet = 1 Dus", () => {
    const result = breakdownBaseUnit(200, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Dus", quantity: 1 },
    ]);
  });

  it("10 Tablet = 1 Strip", () => {
    const result = breakdownBaseUnit(10, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Strip", quantity: 1 },
    ]);
  });

  it("5 Tablet = 5 Tablet only", () => {
    const result = breakdownBaseUnit(5, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Tablet", quantity: 5 },
    ]);
  });

  it("0 Tablet = 0 Tablet", () => {
    const result = breakdownBaseUnit(0, PARACETAMOL, BASE);
    expect(result).toEqual([
      { unitName: "Tablet", quantity: 0 },
    ]);
  });

  it("empty unitLevels returns base only", () => {
    const result = breakdownBaseUnit(100, [], BASE);
    expect(result).toEqual([
      { unitName: "Tablet", quantity: 100 },
    ]);
  });
});
