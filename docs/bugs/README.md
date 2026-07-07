# MEDISYNC — Bug Knowledge Base

## Purpose

This folder is the permanent historical record of every bug discovered, investigated, and resolved in MEDISYNC.

Future engineers (human or AI) must be able to search previous bugs instead of repeating investigations.

## Folder Structure

```
docs/bugs/
├── README.md            ← This file
├── BUG_TEMPLATE.md      ← Template for new bug entries
├── BUG-INV-REV-001.md   ← Inventory Invoice Revision Crash
└── BUG-XXX-NNN.md       ← Future entries
```

## Bug Number Convention

```
BUG-{MODULE}-{NNN}

MODULE codes:
  INV   — Inventory
  CSH   — Cashier
  PRC   — Pricing
  ALC   — Allocation
  CHK   — Checkout
  RPT   — Reports
  DSH   — Dashboard
  AUTH  — Authentication
  FEAT  — Features / Environment
  ARCH  — Architecture

NNN = sequential 3-digit number (001, 002, ...)
```

## Bug Workflow

```
🐞 BUG REPORTED
      │
      ▼
📋 AUDIT — Complete call graph, data flow, reproduction steps
      │
      ▼
🔬 ROOT CAUSE VERIFIED — Evidence-based, not assumed
      │
      ▼
🏗 BLUEPRINT — Minimal fix design, impact analysis
      │
      ▼
🛠 IMPLEMENTATION — Single concern, no scope creep
      │
      ▼
🛡 HARDENING — Search for similar patterns, fix all instances
      │
      ▼
✅ QA — TypeScript, build, tests, manual verification
      │
      ▼
📦 COMMIT — Single atomic commit with descriptive message
      │
      ▼
🚀 PUSH
```

## Status Definition

| Status | Meaning |
|--------|---------|
| `REPORTED` | Bug identified, not yet investigated |
| `AUDITING` | Investigation in progress |
| `ROOT_CAUSE_CONFIRMED` | Root cause found and verified |
| `BLUEPRINT_APPROVED` | Fix design approved by Architecture Board |
| `IMPLEMENTED` | Fix applied, not yet QA'd |
| `RESOLVED` | Fix verified, committed, pushed |
| `WONT_FIX` | Bug acknowledged, intentionally not fixed |
| `DUPLICATE` | Same root cause as another bug |

## Priority Definition

| Priority | Criteria |
|----------|----------|
| **P0** | Crash, data loss, checkout failure, security breach |
| **P1** | Broken feature, incorrect business logic, wrong display |
| **P2** | Cosmetic issue, performance degradation, non-critical |
| **P3** | Enhancement, improvement, nice-to-have |

## Search Convention

To find bugs by module:
```
grep "Module: Inventory" docs/bugs/*.md
```

To find bugs by root cause pattern:
```
grep "Rules of Hooks" docs/bugs/*.md
```

To find unresolved bugs:
```
grep "Status: REPORTED\|Status: AUDITING\|Status: ROOT_CAUSE_CONFIRMED" docs/bugs/*.md
```
