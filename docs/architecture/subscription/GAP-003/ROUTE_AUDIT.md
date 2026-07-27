# ROUTE AUDIT — /settings/subscription 404

## Phase 1 — App Router Hierarchy

| File | On Disk | In Git (HEAD) |
|------|:---:|:---:|
| `(tenant)/settings/subscription/layout.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/page.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/plans/page.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/upgrade/page.tsx` | ✅ | ✅ |
| `(tenant)/settings/subscription/upgrade/actions.ts` | ✅ | ✅ |
| `(tenant)/settings/subscription/billing/page.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/billing/actions.ts` | ✅ | ❌ |
| `(tenant)/settings/subscription/usage/page.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/activity/page.tsx` | ✅ | ❌ |
| `(tenant)/settings/subscription/settings/page.tsx` | ✅ | ❌ |

**10 files exist locally. Only 2 exist in the deployed git tree.**

## Phase 2 — Route Map

Expected routes (defined in `subscription/layout.tsx`):
```
/settings/subscription                     → page.tsx (Overview Dashboard)
/settings/subscription/plans               → plans/page.tsx
/settings/subscription/upgrade             → upgrade/page.tsx
/settings/subscription/billing             → billing/page.tsx
/settings/subscription/usage               → usage/page.tsx
/settings/subscription/activity            → activity/page.tsx
/settings/subscription/settings            → settings/page.tsx
```

## Phase 3 — Navigation Targets

| Source | Links to | File |
|--------|----------|------|
| Sidebar Settings group | `/settings/subscription` | `config/tenant-navigation.ts` ✅ (committed) |
| Settings section title | `sectionTitle()` maps `/settings/subscription` → "Langganan" | `settings/layout.tsx` ✅ (committed) |
| Upgrade page | `/settings/subscription/upgrade?to=...` | `plans/page.tsx` ❌ (not in git) |
| Billing page | `/settings/subscription/billing` | internal links in page.tsx ❌ |

## Phase 4 — Root Cause

### ✅ Route exists on disk
### ❌ Route NOT in deployed git tree

**Answer: Route missing from deployment.**

The critical files `layout.tsx` (sub-nav shell) and `page.tsx` (Overview Dashboard) were **never committed** to the preview branch. Without `layout.tsx`, Next.js cannot resolve the route segment. Without `page.tsx`, there is no page to render at `/settings/subscription`.

**Only 2 of 10 files were committed** (`upgrade/actions.ts` and `upgrade/page.tsx` — both from the GAP-003 commit `7aca790`). The other 8 files remain on local disk but are untracked in git.

## Recommended Fix

Stage and commit the remaining 8 subscription route files:

```
src/app/(tenant)/settings/subscription/layout.tsx
src/app/(tenant)/settings/subscription/page.tsx
src/app/(tenant)/settings/subscription/plans/page.tsx
src/app/(tenant)/settings/subscription/billing/page.tsx
src/app/(tenant)/settings/subscription/billing/actions.ts
src/app/(tenant)/settings/subscription/usage/page.tsx
src/app/(tenant)/settings/subscription/activity/page.tsx
src/app/(tenant)/settings/subscription/settings/page.tsx
```

Zero code changes — these files already exist and are validated (`tsc`/`eslint`/`build` all pass).
