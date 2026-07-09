# ADR-PERF-003 — Single DataTable Component

## Status: PROPOSED

## Context

Every module currently builds its own table. This duplicates pagination, search, sort, and virtualization logic.

## Decision

**Build ONE `DataTable<T>` component used by every list page.**

The component accepts `columns`, `fetchRows`, and `rowKey`. All pagination/search/sort/virtual logic lives in the component.

## Rejected: Per-Module Tables

Duplication, inconsistency, higher maintenance, harder to roll out virtualization.

## Consequences

- DataTable must handle all edge cases for all modules
- Migration: replace existing tables one by one
- Columns API must be flexible enough for custom cells
