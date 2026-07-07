# BUG-INV-REV-001 — Inventory Invoice Revision Crash (React Error #310)

---

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-INV-REV-001 |
| **Status** | RESOLVED |
| **Priority** | P1 |
| **Module** | Inventory |
| **Epic** | Invoice Revision |
| **Date** | 2026-07-07 |
| **Commit** | (pending) |

---

## Symptoms

React Error #310: "Rendered fewer hooks than expected."

Occurs when:
1. Open Inventory → Purchasing
2. Click "Revisi Invoice" on any invoice → modal opens
3. Close the modal
4. Click "Revisi Invoice" again → **CRASH**

Intermittent — depends on hook state from previous render.

---

## Reproduction

1. Navigate to `/inventory` → Tab "Pembelian"
2. Expand any purchase invoice
3. Click "Revisi Invoice" button
4. Modal opens → navigate through steps
5. Close modal (click X or Batal)
6. Click "Revisi Invoice" again
7. **React Error #310** — "Rendered fewer hooks than expected"

---

## Evidence

```
Call Graph:

  InventoryPurchasePanel (line 1464)
      │  <button onClick={...}>Revisi Invoice</button>
      │  State: setCorrectingInvoice(invoice)
      │
      ▼
  InventoryCorrectionModal (line 38)
      │  <InventoryCorrectionModal
      │    open={correctingInvoice !== null}    ← ALWAYS mounted
      │    invoice={correctingInvoice}
      │  />
      │
      ├── useState × 12 (lines 47-57)         ← Hooks #1–#12
      ├── useInventoryStore (line 59)         ← Hook #13... wait, no.
      │
      ├── ⚠️ Line 61: if (!open || !invoice) return null;
      │
      └── useMemo — oldValue (line 68)        ← Hook #14 — SKIPPED when closed!

  Hook Count:
    Modal CLOSED (open=false): 13 hooks (useMemo skipped)
    Modal OPEN   (open=true):  14 hooks (useMemo executed)
    → 13 ≠ 14 → React crashes on next render
```

---

## Architecture Audit

```
1. InventoryPurchasePanel ALWAYS renders InventoryCorrectionModal
   - Line 1305: <InventoryCorrectionModal open={correctingInvoice !== null} ... />
   - NO conditional wrapper — component is mounted permanently

2. InventoryCorrectionModal has early return at line 61:
   - if (!open || !invoice) return null;
   - This return is BEFORE useMemo at line 68

3. When open=false: useMemo is never called → React sees 13 hooks
   When open=true:  useMemo IS called     → React sees 14 hooks
   → Hook count changes between renders → violation

4. Modal components like payment-modal.tsx, hold-cart-dialog.tsx, etc.
   checked for the same pattern — none had hooks after early return.
```

---

## Root Cause

**Rules of Hooks violation.** `useMemo` at line 68 was placed AFTER the conditional early return at line 61. When the modal is closed (`open=false`), the early return prevents the `useMemo` from executing, changing the total hook count from 14 (open) to 13 (closed).

React requires hooks to be called in the exact same order on every render.

---

## Blueprint

Move all hooks BEFORE the early return. The `useMemo` already handles `!selectedItem || !selectedField` gracefully by returning `""`.

```
BEFORE:  useState… → useInventoryStore → if (!open) return → useMemo
AFTER:   useState… → useInventoryStore → useMemo → if (!open) return
```

---

## Implementation

```
File:   src/components/inventory/inventory-correction-modal.tsx

Change: Moved `selectedItem`, `fieldMeta`, and `useMemo` above the
        early return at line 61.

  const selectedItem = invoice?.items.find(...)     // safe: invoice may be null
  const fieldMeta = PURCHASE_REVISABLE_FIELDS.find(...)
  const oldValue = useMemo(() => { ... }, [...])
  if (!open || !invoice) return null;              // AFTER all hooks

Hook count now always 14 regardless of open state.
```

---

## Hardening

Audited 12 modal/dialog components across the project:

| File | Early Return | Hooks After? | Violation? |
|------|:-----------:|:------------:|:----------:|
| `inventory-correction-modal.tsx` | `if (!open\|\|!inv) return` | 0 (fixed) | ✅ RESOLVED |
| `batch-relocate-modal.tsx` | `if (!open\|\|!batch) return` | 0 | ✅ OK |
| `payment-modal.tsx` | `if (!open) return` | 0 | ✅ OK |
| `hold-cart-list.tsx` | `if (!open) return` | 0 | ✅ OK |
| `hold-cart-dialog.tsx` | `if (!open) return` | 0 | ✅ OK |
| `receipt-preview.tsx` | `if (!open) return` | 0 | ✅ OK |
| `tenant-detail-panel.tsx` | `if (!open) return` | 0 | ✅ OK |
| `capital-modal.tsx` | `if (!open) return` | 0 | ✅ OK |
| `inventory-opname-form-modal.tsx` | `if (!open) return` | 0 | ✅ OK |
| `product-match-modal.tsx` | `if (!open\|\|!item) return` | 0 | ✅ OK |
| `inventory-pay-invoice-modal.tsx` | `if (!open) return` | 0 | ✅ OK |
| `mobile-bottom-sheet.tsx` | `if (!open) return` | 0 | ✅ OK |

**1 violation found. 1 fixed. 0 remaining.**

---

## Regression Test

- [x] TypeScript: 0 errors
- [x] Build: PASS
- [x] Existing tests: PASS
- [x] Modal opens correctly
- [x] Modal closes correctly
- [x] Open → close → open — no crash
- [x] Hook count constant across all renders

---

## Validation

Architecture Board verified:
- Root cause confirmed by lifecycle audit
- Fix is minimal — moved code, no logic changed
- Hardening audit found no other violations
- All 12 modal components verified

---

## Lessons Learned

1. **Always place all hooks before any conditional return.** When a component is always mounted by its parent (no `{open && <Modal />}` guard), the internal early return must come AFTER every `useState`, `useEffect`, `useMemo`, `useCallback`, and custom hook.

2. **Audit hardening should be mandatory after every hook fix.** The same pattern existed in only 1 of 12 modals — but without the hardening audit, we wouldn't know.

3. **The parent render pattern determines vulnerability.** Components mounted via `{open && <Modal />}` naturally avoid this bug (component unmounts, no hook mismatch). Components ALWAYS mounted with `open={boolean}` prop are vulnerable to internal early returns.

4. **The `invoice?.items.find()` null-safe pattern** allowed moving the `selectedItem` derivation above the early return without adding conditional logic.
