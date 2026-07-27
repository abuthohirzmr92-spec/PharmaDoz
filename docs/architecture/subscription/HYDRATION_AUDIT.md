# HYDRATION AUDIT — /settings/subscription & /settings/integration

## Audit Scope

All Client Components under:
- `src/app/(tenant)/settings/subscription/**`
- `src/app/(tenant)/settings/integration/**`
- Parent layouts: `(tenant)/settings/layout.tsx`, `(tenant)/layout.tsx`
- Shared components: `src/components/subscription/`

## Findings

### 1. Root Layout — Dynamic Rendering (GOOD)

`(tenant)/layout.tsx` calls `cookies()` which forces **dynamic rendering** for the
entire tenant subtree. No static prerendering occurs. The server always renders
with the current auth state. This eliminates the most common class of hydration
mismatches: server-static vs client-dynamic.

**Status: 🟢 HELPS HYDRATION**

### 2. Widget Loading Pattern (GOOD)

All subscription pages use `useAsync` hook with initial state:
```ts
useState({ data: null, loading: true, error: null })
```
The FIRST render (server and client) shows loading skeletons via `WidgetShell`.
Data is fetched only inside `useEffect` → client-side only. The server never
renders with live subscription data — both server and client first render
produce identical skeleton HTML.

**Status: 🟢 PREVENTS MISMATCH**

### 3. `Date.now()` / `new Date()` Analysis

| File | Line | Context | Server-executed? |
|------|------|---------|:---:|
| `subscription/page.tsx` | 22 | Inside `useAsync` callback (daysUntil) | ❌ Client-only |
| `subscription/upgrade/page.tsx` | 52 | Inside `useAsync` callback | ❌ Client-only |
| `subscription/upgrade/page.tsx` | 96 | Inside event handler (applyPromo) | ❌ Client-only |
| `subscription/billing/page.tsx` | 208 | Inside event handler (check) | ❌ Client-only |
| `subscription/activity/page.tsx` | 64 | Inside `useAsync` callback | ❌ Client-only |
| `subscription/settings/page.tsx` | 50 | Inside event handler (save) | ❌ Client-only |

**All 6 instances of `Date.now()` / `new Date()` execute exclusively on the
client** — inside `useAsync` callbacks, `useEffect`, or onClick handlers. Zero
execute during server render.

**Status: 🟢 NO HYDRATION RISK**

### 4. `useSearchParams` / `Suspense`

Not used anywhere in the audited routes.

**Status: 🟢 NOT APPLICABLE**

### 5. `typeof window` / `localStorage` / `sessionStorage`

Not used anywhere in the audited routes.

**Status: 🟢 NOT USED**

### 6. `suppressHydrationWarning`

Not used — and not needed. No application-caused mismatch identified.

**Status: 🟢 NOT REQUIRED**

### 7. `/settings/integration`

Static `"use client"` component with icon imports and JSX. No state, no
date/random/window, no data fetching.

**Status: 🟢 ZERO HYDRATION RISK**

### 8. Browser Extension Attributes

`data-gr-ext-installed` and `data-new-gr-c-s-check-loaded` are injected by
browser extensions (Grammarly, Chrome extensions). These attributes exist only
in the browser DOM, not in the server-rendered HTML. React detects the DOM
difference and issues a hydration warning.

**Status: 🟡 EXTERNAL — NOT ACTIONABLE BY APPLICATION**

## Verdict

| Source | Risk Level |
|--------|:---:|
| Application code (subscription routes) | 🟢 NONE |
| Application code (integration route) | 🟢 NONE |
| Application code (parent layouts) | 🟢 NONE |
| Browser extensions | 🟡 EXTERNAL — ignore |

**Root cause of any hydration warnings: browser extensions, not application code.**

The application uses patterns that **actively prevent** hydration mismatches:
dynamic rendering (cookies-based), identical initial state (loading/null),
and client-only data fetching (useEffect-async).
