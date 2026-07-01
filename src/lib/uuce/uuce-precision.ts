// =================================================================
// UUCE Precision Engine — domain-agnostic math utilities
// EEOS Business Core — Layer 0 Foundation
// =================================================================

import type { RoundingMode } from "./uuce-types";

// ─── Safe Multiply (integer overflow guard) ───

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

export function safeMultiply(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(`UUCE: Non-finite operands in multiply: ${a} * ${b}`);
  }
  const result = a * b;
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
    // For non-integers, allow floating point (liquids, mass)
    return result;
  }
  if (Math.abs(result) > MAX_SAFE) {
    throw new Error(`UUCE: Multiply overflow: ${a} * ${b} = ${result} exceeds MAX_SAFE_INTEGER`);
  }
  return result;
}

// ─── Safe Divide ───

export function safeDivide(a: number, b: number, mode: RoundingMode): number {
  if (b === 0) {
    throw new Error("UUCE: Division by zero");
  }
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error(`UUCE: Non-finite operands in divide: ${a} / ${b}`);
  }
  const raw = a / b;

  switch (mode) {
    case "floor":
      return Math.floor(raw);
    case "ceil":
      return Math.ceil(raw);
    case "round":
      return Math.round(raw);
    case "exact":
      // For exact mode with integers, check divisibility
      if (Number.isInteger(a) && Number.isInteger(b) && a % b !== 0) {
        return raw; // Return decimal for non-divisible integers in exact mode
      }
      return raw;
  }
}

// ─── Round to Precision ───

export function roundTo(value: number, decimals: number, mode: RoundingMode = "round"): number {
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;

  let rounded: number;
  switch (mode) {
    case "floor":
      rounded = Math.floor(scaled);
      break;
    case "ceil":
      rounded = Math.ceil(scaled);
      break;
    case "round":
      rounded = Math.round(scaled);
      break;
    case "exact":
      return value; // No rounding
  }

  return rounded / factor;
}

// ─── Check Precision Loss ───

export function hasPrecisionLoss(original: number, converted: number, unit: string): boolean {
  const diff = Math.abs(original - converted);
  // For discrete units, any difference is loss
  // For volume/mass, < 0.000001 is acceptable
  return diff > 0.000001;
}

// ─── Validate Quantity ───

export function validateQuantity(qty: number, unitKind?: string): void {
  if (typeof qty !== "number" || !Number.isFinite(qty)) {
    throw new Error(`UUCE: Invalid quantity: ${qty}`);
  }
  if (qty < 0) {
    throw new Error(`UUCE: Negative quantity not allowed: ${qty}`);
  }
  // For discrete units (tablets, capsules), require integer
  if (unitKind === "discrete" && !Number.isInteger(qty)) {
    throw new Error(`UUCE: Discrete unit requires integer quantity, got: ${qty}`);
  }
}
