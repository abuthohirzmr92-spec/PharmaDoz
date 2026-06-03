"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Reusable hook for numeric inputs with clean UX:
 * - Empty string when focused and value is 0 (ready to type)
 * - Restores "0" on blur if empty
 * - No leading zeros (types "5" not "05")
 * - Returns string for <input value> and number for programmatic use
 */
export function useNumericInput(initialValue: number = 0) {
  const [displayValue, setDisplayValue] = useState(
    initialValue > 0 ? String(initialValue) : "",
  );
  const [numericValue, setNumericValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useRef(false);

  // Sync from parent when initialValue changes externally
  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(initialValue > 0 ? String(initialValue) : "");
      setNumericValue(initialValue);
    }
  }, [initialValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string (user clearing the field)
    if (raw === "") {
      setDisplayValue("");
      setNumericValue(0);
      return;
    }

    // Strip non-digit characters, trim leading zeros
    const cleaned = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
    const num = parseInt(cleaned, 10) || 0;

    setDisplayValue(cleaned === "0" ? "" : cleaned);
    setNumericValue(num);
  }, []);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
    // If value is 0, show empty for clean typing
    if (numericValue === 0 && displayValue === "") {
      // already empty
    } else if (numericValue === 0) {
      setDisplayValue("");
    }
  }, [numericValue, displayValue]);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    // On blur, if empty, show nothing (parent decides if 0 is OK)
    if (displayValue === "" || displayValue === "0") {
      setDisplayValue(numericValue > 0 ? String(numericValue) : "");
    }
  }, [displayValue, numericValue]);

  return {
    /** String value for <input value={...}> */
    inputValue: displayValue,
    /** Number value for calculations */
    numericValue,
    /** Props to spread on <input type="number"> */
    inputProps: {
      value: displayValue,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      ref: inputRef,
      inputMode: "numeric" as const,
      pattern: "[0-9]*",
    },
    /** Force set from external source */
    setValue: useCallback((n: number) => {
      setNumericValue(n);
      setDisplayValue(n > 0 ? String(n) : "");
    }, []),
  };
}
