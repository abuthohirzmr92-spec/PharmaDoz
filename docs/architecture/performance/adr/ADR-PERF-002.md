# ADR-PERF-002 — Virtual Scrolling via @tanstack/react-virtual

## Status: PROPOSED

## Context

Rendering 5,000+ table rows creates 5,000+ DOM nodes, causing 500ms+ render times.

## Decision

**Use @tanstack/react-virtual for all tables with >100 rows.**

Virtual scroll renders only visible rows (~20) plus 5 overscan. DOM count stays constant regardless of dataset size.

## Rejected: react-window

Abandoned by maintainer. No React 18+ support.

## Rejected: Custom Implementation

Complex edge cases (dynamic row heights, sticky headers, keyboard nav). Off-the-shelf is safer.

## Consequences

- Adds ~5KB to bundle (gzipped)
- Row height must be fixed (or measured) for virtualizer
- Keyboard navigation requires explicit binding
