# Invoice Revision — Technical Debt Registry

> 🔒 ARCHITECTURE LOCKED — V3.2.1
> Recorded: Sprint 0.6

---

## TD-REVISION-001: Working State on Item

**Status**: Recorded
**Priority**: P3
**Sprint**: Future

**Description**: `WorkingPurchaseItem` currently uses `_state` and `_original` as top-level fields. In the future, these could be moved into a nested `_working` or `_meta` object for cleaner separation between business data and working state.

**Current**:
```typescript
interface WorkingPurchaseItem {
  _state: WorkingItemState;
  _original: OriginalPurchaseSnapshot | null;
  // ... business fields
}
```

**Future**:
```typescript
interface WorkingPurchaseItem {
  _working: { state: WorkingItemState; original: OriginalPurchaseSnapshot | null };
  // ... business fields
}
```

**Impact**: All consumers of `_state` and `_original` would need migration. Low priority — current design is functional.

---

## TD-REVISION-002: Deep Clone Not Abstracted

**Status**: Recorded
**Priority**: P3
**Sprint**: Future

**Description**: Deep cloning of invoice items → working items happens inline in the Drawer. Should be extracted into a reusable `cloneToWorkingCopy()` helper.

**Location**: `InvoiceRevisionDrawer.tsx` (future implementation)

**Impact**: Low. Only one consumer (Invoice Revision) currently.

---

## TD-REVISION-003: Legacy Modal Removal

**Status**: Recorded
**Priority**: P2
**Sprint**: 6 (Cleanup)

**Description**: `inventory-correction-modal.tsx` is marked @deprecated but still exists. Must be removed after monitoring confirms InvoiceRevisionDrawer is stable.

**Location**: `src/components/inventory/inventory-correction-modal.tsx`

**Impact**: Delete one file, clean one import. No behavioral change.

---

## TD-REVISION-004: Validation Engine vs UI Validation

**Status**: Recorded
**Priority**: P2
**Sprint**: Future

**Description**: `validate-revision.ts` handles UI-level validation only. The Engine handles business-level validation. These two layers could be unified into a single `ValidationPipeline` that composes UI + Engine validation in sequence.

**Current**: UI validates → Adapter → Store → Engine validates separately
**Future**: `ValidationPipeline([uiRules, engineRules])` → single result

**Impact**: Would require Engine to expose validation rules as pure functions. Non-trivial refactor.
