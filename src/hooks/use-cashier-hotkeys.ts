"use client";

import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface HotkeyHandlers {
  onSearchFocus?: () => void;
  onOpenPayment?: () => void;
  onHoldCart?: () => void;
  onEscape?: () => void;
  onResetCart?: () => void;
  onOpenHoldList?: () => void;
}

export interface HotkeyHint {
  key: string;
  label: string;
}

export const HOTKEY_HINTS: HotkeyHint[] = [
  { key: "F2", label: "Cari" },
  { key: "F5", label: "Bayar" },
  { key: "F8", label: "Tahan" },
  { key: "Ctrl+H", label: "Hold" },
  { key: "Esc", label: "Tutup" },
];

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

/**
 * Registers global keyboard shortcuts for the cashier page.
 *
 * F2         → Focus search input
 * F5         → Open payment modal
 * F8         → Hold / park current cart
 * Ctrl+H     → Open hold cart list
 * Ctrl+Del   → Reset cart (with cart items present)
 * Esc        → Close modals / clear search
 *
 * Shortcuts are suppressed when the focus is inside an INPUT or
 * TEXTAREA element, except:
 *  - Escape (always handled)
 *  - Ctrl+Del, Ctrl+H (chord shortcuts work even in inputs)
 */
export function useCashierHotkeys(handlers: HotkeyHandlers): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      /* ---- chord shortcuts (work even inside inputs) ---- */

      if (e.ctrlKey && e.key === "Delete") {
        e.preventDefault();
        handlers.onResetCart?.();
        return;
      }

      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        handlers.onOpenHoldList?.();
        return;
      }

      /* ---- single-key shortcuts ---- */

      switch (e.key) {
        case "F2":
          if (isInput) break;
          e.preventDefault();
          handlers.onSearchFocus?.();
          break;

        case "F5":
          if (isInput) break;
          e.preventDefault();
          handlers.onOpenPayment?.();
          break;

        case "F8":
          if (isInput) break;
          e.preventDefault();
          handlers.onHoldCart?.();
          break;

        case "Escape":
          handlers.onEscape?.();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
