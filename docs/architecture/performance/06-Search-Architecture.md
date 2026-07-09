# MEDISYNC — Search Architecture

## Decision Tree

```
Dataset loaded
    │
    ├── totalCount <= 100
    │     → Client-side search (immediate)
    │     → .filter(row => row.field.includes(query))
    │
    └── totalCount > 100
          → Server-side search
          → Repository query: .ilike("field", `%${query}%`)
          → Debounced (300ms)
          → Results replace current page (page reset to 1)
```

## Client Search (Small Datasets)

```typescript
const filtered = useMemo(() => {
  if (!searchQuery) return rows;
  return rows.filter(row => 
    columns.some(col => String(row[col.key]).toLowerCase().includes(searchQuery))
  );
}, [rows, searchQuery, columns]);
```

## Server Search (Large Datasets)

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["products", debouncedQuery, page],
  queryFn: () => productRepo.getProducts({
    search: debouncedQuery,
    cursor: pageToCursor(page),
    pageSize: 50,
  }),
  keepPreviousData: true,
});
```

## Debounce

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
// Usage: const debouncedQuery = useDebounce(query, 300);
```

## Highlight

```tsx
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200">{part}</mark>
      : part
  );
}
```

## Future: Full-Text Search

- PostgreSQL `tsvector` + `ts_query` for product names
- Supabase supports `textSearch()` in PostgREST
- Trigger: `GIN` index on `products.name`
- Migration path: add `search_vector` column, populate via trigger
