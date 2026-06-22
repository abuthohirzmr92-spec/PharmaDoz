"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Numeric input with clean UX:
 * - Empty when value=0 and focused (ready to type)
 * - No leading zeros
 * - Returns number via onChange
 */
interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
  id?: string;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  className,
  placeholder,
  disabled,
  required,
  style,
  id,
}: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(value > 0 ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from parent when NOT focused
  useEffect(() => {
    if (!focused) {
      setDisplay(value > 0 ? String(value) : "");
    }
  }, [value, focused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Empty
      if (raw === "") {
        setDisplay("");
        onChange(0);
        return;
      }

      // Strip non-digits, remove leading zeros
      const cleaned = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
      const num = Math.max(0, parseInt(cleaned, 10) || 0);

      // Apply min/max
      const clamped = min !== undefined ? Math.max(min, num) : num;
      const final = max !== undefined ? Math.min(max, clamped) : clamped;

      setDisplay(final > 0 ? String(final) : "");
      onChange(final);
    },
    [onChange, min, max],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    if (value === 0) {
      setDisplay("");
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (value > 0) {
      setDisplay(String(value));
    } else {
      setDisplay("0");
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50",
        className,
      )}
      placeholder={placeholder ?? "0"}
      disabled={disabled}
      required={required}
      style={style}
    />
  );
}
