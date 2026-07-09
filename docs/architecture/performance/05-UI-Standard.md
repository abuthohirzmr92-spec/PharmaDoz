# MEDISYNC — Data Table UI Standard

## Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER                                              │
│  Title + Action Button (Tambah Produk, Import, etc.) │
├──────────────────────────────────────────────────────┤
│  TOOLBAR                                             │
│  [🔍 Search..............] [Filter ▼] [Sort ▼]       │
│  Showing 1-50 of 5,000              [Export] [Bulk]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  TABLE (fixed height = calc(100vh - 320px))          │
│  ┌──────────────────────────────────────────────┐    │
│  │ Column 1    Column 2    Column 3    Actions  │    │
│  ├──────────────────────────────────────────────┤    │
│  │ Row 1       ...         ...         [Edit]   │    │
│  │ Row 2       ...         ...         [Edit]   │    │
│  │ ... (only visible rows rendered)            │    │
│  │ Row 25      ...         ...         [Edit]   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
├──────────────────────────────────────────────────────┤
│  PAGINATION                                          │
│  [◀◀] [◀]  Page 3 of 100  [▶] [▶▶]                 │
│  Go to page: [___]                                    │
└──────────────────────────────────────────────────────┘
```

## Component API

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  fetchRows: (params: QueryParams) => Promise<QueryResult<T>>;
  rowKey: (row: T) => string;
  pageSize?: number;              // default: 50
  serverSearch?: boolean;          // default: false
  serverSort?: boolean;            // default: false
  virtualScroll?: boolean;         // default: true
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
}

interface QueryParams {
  search?: string;
  cursor?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  pageSize: number;
  filters?: Record<string, unknown>;
}

interface QueryResult<T> {
  rows: T[];
  nextCursor?: string;
  prevCursor?: string;
  totalCount: number;
}
```

## Mandatory Rules

1. **Fixed table height** — never grows beyond viewport
2. **Header + toolbar sticky** — always visible
3. **Virtual scroll** — for datasets > 100 rows
4. **Keyboard navigation** — Arrow keys, Enter to select, Escape to clear
5. **Loading skeleton** — not spinner, skeleton rows matching page size
6. **Empty state** — consistent across all modules
7. **Error state** — retry button, error message
8. **Responsive** — columns collapse on mobile (vertical stack or horizontal scroll)
