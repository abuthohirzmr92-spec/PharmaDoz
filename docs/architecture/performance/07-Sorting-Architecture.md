# MEDISYNC — Sorting Architecture

## Strategy

| Dataset Size | Sort Strategy | Implementation |
|:------------:|:------------:|----------------|
| <100 rows | Client | `[...rows].sort()` in useMemo |
| 100-500 rows | Client | Same, with virtual render |
| 500+ rows | Server | `ORDER BY` in Supabase query |

## Client Sort

```typescript
const sorted = useMemo(() => {
  const arr = [...rows];
  arr.sort((a, b) => {
    const cmp = compare(a[sortKey], b[sortKey]);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return arr;
}, [rows, sortKey, sortDir]);
```

## Server Sort

```typescript
// Repository
let query = client.from("products").select("*");
query = query.order(sortKey, { ascending: sortDir === "asc" });

// Cursor pagination with sort: cursor encodes sort value
const cursor = btoa(JSON.stringify({ id: lastRow.id, sortValue: lastRow[sortKey] }));
```

## Multi-Column Sort

Not supported in V1. Single-column sort with secondary `id` for tie-breaking.

## Default Sort

| Module | Default Sort |
|--------|-------------|
| Products | `name ASC` |
| Inventory | `expired_date ASC` (FEFO) |
| Purchases | `purchase_date DESC` |
| Sales | `created_at DESC` |
| Activity Logs | `created_at DESC` |
