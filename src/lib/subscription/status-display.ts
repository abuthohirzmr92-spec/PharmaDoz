// ---------------------------------------------------------------------------
// statusDisplay — accessible subscription status (color + icon + text) (PURE)
// ---------------------------------------------------------------------------
// Accessibility policy: never rely on color alone. Returns an icon, a text
// label, and a tone (mapped to color) so every status conveys meaning three
// ways. Derived from lifecycle_state (richer than the access gate).
// ---------------------------------------------------------------------------

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusDisplay {
  label: string;
  icon: string; // emoji glyph (color + icon + text)
  tone: StatusTone;
}

export function statusDisplay(lifecycleState: string | null): StatusDisplay {
  switch (lifecycleState) {
    case "active":
    case "converted":
      return { label: "Aktif", icon: "🟢", tone: "success" };
    case "trial_active":
      return { label: "Trial", icon: "⚪", tone: "info" };
    case "grace_period":
      return { label: "Masa Tenggang", icon: "🟡", tone: "warning" };
    case "read_only":
      return { label: "Hanya-Baca", icon: "🟡", tone: "warning" };
    case "suspended":
      return { label: "Ditangguhkan", icon: "🔴", tone: "danger" };
    case "expired":
    case "trial_expired":
      return { label: "Kedaluwarsa", icon: "🔴", tone: "danger" };
    case "terminated":
    case "archived":
      return { label: "Berakhir", icon: "⚫", tone: "neutral" };
    default:
      return { label: "Tidak diketahui", icon: "⚪", tone: "neutral" };
  }
}
