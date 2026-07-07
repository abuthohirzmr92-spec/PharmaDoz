# React Rules of Hooks — Engineering Playbook

## Purpose

Prevent, detect, and fix Rules of Hooks violations in MEDISYNC React components.

## Rules of Hooks (React Official)

1. **Only call hooks at the top level.** Don't call hooks inside loops, conditions, or nested functions.
2. **Only call hooks from React functions.** Call them from within React functional components and custom hooks.

## Typical Violations in MEDISYNC

### Pattern 1 — Early Return Before Hooks (MOST COMMON)

```tsx
// ❌ WRONG
function MyModal({ open, data }: Props) {
  const [state, setState] = useState("");     // Hook #1
  if (!open || !data) return null;            // EARLY RETURN
  const value = useMemo(() => ..., [data]);   // Hook #2 — SKIPPED when closed
}

// ✅ CORRECT
function MyModal({ open, data }: Props) {
  const [state, setState] = useState("");     // Hook #1
  const value = useMemo(() => {               // Hook #2 — ALWAYS
    if (!data) return defaultValue;
    return compute(data);
  }, [data]);
  if (!open || !data) return null;            // RETURN AFTER ALL HOOKS
}
```

### Pattern 2 — Conditional Custom Hook

```tsx
// ❌ WRONG
function MyComponent({ useFeature }: Props) {
  if (useFeature) {
    const data = useCustomHook();  // Conditional hook call
  }
}

// ✅ CORRECT
function MyComponent({ useFeature }: Props) {
  const data = useCustomHook({ enabled: useFeature });  // Always called
}
```

### Pattern 3 — Hook Inside Callback

```tsx
// ❌ WRONG
function MyComponent() {
  const handleClick = () => {
    const data = useCustomHook();  // Hook inside callback
  };
}

// ✅ CORRECT
function MyComponent() {
  const data = useCustomHook();  // At top level
  const handleClick = () => { /* use data */ };
}
```

### Pattern 4 — Hook Inside useEffect

```tsx
// ❌ WRONG
useEffect(() => {
  const data = useCustomHook();  // Hook inside effect
}, []);

// ✅ CORRECT — extract to custom hook or call at top level
```

## How to Audit

### Step 1 — Find All Early Returns

```bash
grep -n "if.*return null" src/components/**/*.tsx
grep -n "if.*return (false|\[\]|\{\})" src/components/**/*.tsx
```

### Step 2 — For Each Early Return, Check Hook Position

```
For every file with an early return:
  1. Find the LINE NUMBER of the early return
  2. Find the LINE NUMBER of EVERY hook (useState, useEffect, useMemo, useCallback, useReducer, custom hooks)
  3. If ANY hook line number > early return line number → VIOLATION
```

### Step 3 — Verify Parent Mount Pattern

```
If the parent renders:
  <Component open={boolean} />       ← ALWAYS mounted → vulnerable
  {boolean && <Component />}          ← Conditional mount → safe (component unmounts)
```

## How to Trace Hook Order

Add this temporary instrumentation:

```tsx
let hookIndex = 0;
function traceHook(name: string) {
  console.log(`Hook #${++hookIndex}: ${name}`);
}

// In component:
traceHook("useState-1"); const [a, setA] = useState(...)
traceHook("useState-2"); const [b, setB] = useState(...)
traceHook("useMemo-oldValue"); const v = useMemo(...)
```

Compare the hook order output between open and closed states. Must be identical.

## How to Reproduce Hook Mismatch

1. Open the modal/component (full render with all hooks)
2. Close/dismiss it (partial render with early return)
3. Open again (React detects hook count change)
4. **Crash**: "Rendered fewer hooks than expected"

## How to Harden

### Step 1 — Fix the Immediate Violation

Move ALL hooks above the early return. Use null-safe access (`data?.field`) and default values inside hooks to handle the "closed" state.

### Step 2 — Search for Similar Patterns

```bash
# Find ALL components with early returns
grep -rn "if.*!open.*return null" src/components/

# For each match, verify hook position
# Look for useMemo, useEffect, useCallback, useReducer AFTER the return
```

### Step 3 — Verify Parent Mount Pattern

```bash
# Find components that are ALWAYS mounted (most vulnerable)
grep -rn "<ModalName\s" src/components/ | grep -v "{.*&&"
```

### Step 4 — Document Findings

Report every component checked, whether it has a violation, and whether it was fixed.

## Checklist Before Merge

```
□ All hooks are before every conditional return in the fixed component
□ Hook count verified constant (open vs closed state)
□ Manual test: open → close → open (no crash)
□ Hardening audit: searched for similar patterns in all sibling components
□ TypeScript: 0 errors
□ Build: PASS
□ Existing tests: PASS
□ Bug entry updated with hardening results
```
