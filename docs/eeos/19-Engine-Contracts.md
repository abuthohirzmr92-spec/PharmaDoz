# EEOS v2.1 — Engine Contracts

## Contract Format

Every engine MUST document:

```
ENGINE: {name}
─────────────────
INPUTS:        {required data from prior engines or request}
OUTPUTS:       {data produced for next engines}
GUARANTEES:    {what this engine ALWAYS ensures}
FAILURES:      {what happens on invalid/missing input}
ALLOWED:       {permitted side effects}
FORBIDDEN:     {prohibited behavior}
```

## Example Contract — Architecture Compliance Engine

```
ENGINE: Architecture Compliance
─────────────────────────────────
INPUTS:
  - Architecture Constitution path
  - Blueprint path (if applicable)
  - ADR directory
  - Module under change

OUTPUTS:
  - compliant: boolean
  - violations: string[]
  - adrs_consulted: string[]

GUARANTEES:
  - All 15 Principles verified
  - All 18 Invariants checked
  - Relevant ADRs consulted
  - Blueprint compliance verified (if applicable)

FAILURES:
  - Missing Constitution → BLOCKED
  - Architecture violation → BLOCKED with violation list
  - Cannot locate ADR directory → WARNING

ALLOWED:
  - Reading files from docs/architecture/
  - Reading source files for dependency verification

FORBIDDEN:
  - Modifying any file
  - Implementing code
  - Making architecture decisions (that's the Board's job)
```

## Contract Principles

1. **Explicit inputs** — No engine reads from undeclared sources
2. **Explicit outputs** — No engine produces undeclared artifacts
3. **Deterministic** — Same inputs → same outputs
4. **Modular** — New engines can be added without modifying existing ones
5. **Framework-independent** — No dependency on React, Next.js, Supabase
