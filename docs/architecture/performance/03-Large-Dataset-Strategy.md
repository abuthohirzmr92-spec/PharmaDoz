# MEDISYNC — Large Dataset Strategy

## Pagination Strategy: CURSOR-BASED

**Decision: Cursor-based pagination for all modules.**

| Strategy | Verdict | Reason |
|----------|:------:|--------|
| Offset pagination | ❌ | `OFFSET 10000` scans 10000 rows; degrades linearly |
| Cursor pagination | ✅ | `WHERE id > 'cursor' LIMIT 50` uses index; O(log n) |
| Infinite scroll | ✅ (UX) | Composable with cursor pagination for UX |

**Cursor format**: Base64-encoded `{ id, sortValue }` — opaque to client.

## Rendering Strategy: VIRTUAL SCROLL

**Decision: Virtual scrolling via `@tanstack/react-virtual`.**

| Library | Verdict | Reason |
|---------|:------:|--------|
| react-window | ❌ | Abandoned, no v18+ support |
| react-virtuoso | ⚖️ | Good but opinionated; harder to customize |
| @tanstack/react-virtual | ✅ | Headless, framework-agnostic, maintained, tiny |

**How it works**:
1. Container has fixed height (e.g., `calc(100vh - 300px)`)
2. Virtualizer calculates which rows are visible based on scroll position
3. Only visible rows (+ 5 overscan) are rendered as DOM nodes
4. Scrolling reuses existing DOM nodes (position changes, content updates)

**Estimated reduction**:
- 5,000 products → ~25 DOM rows (vs 5,000) → **99.5% reduction**
- 100,000 products → ~25 DOM rows → **99.97% reduction**

## Search Strategy: SERVER-SIDE WITH DEBOUNCE

**Decision: Server-side search for datasets > 500 rows.**

```typescript
// Client
const [query, setQuery] = useState("");
const debouncedQuery = useDebounce(query, 300); // 300ms

// Repository
async getProducts(params: PageParams): Promise<PageResult<Product>> {
  let q = supabase.from("products").select("*", { count: "exact" });
  if (params.search) q = q.ilike("name", `%${params.search}%`);
  if (params.cursor) q = q.gt("id", decodeCursor(params.cursor));
  return q.order("id").limit(params.pageSize);
}
```

## Sort Strategy: SERVER-SIDE

**Decision: Server-side sorting for all modules.**

- Client sends: `{ sortKey, sortDir }`
- Server applies: `.order(sortKey, { ascending: sortDir === "asc" })`
- Cursor includes sort value for stable pagination
- Default sort: `created_at DESC` (newest first)

## Hybrid Strategy: CLIENT FOR SMALL, SERVER FOR LARGE

| Dataset Size | Search | Sort | Pagination | Render |
|:------------:|:------:|:----:|:----------:|:------:|
| <100 rows | Client | Client | Client | All (no virtual needed) |
| 100-500 rows | Client | Client | Client | Virtual |
| 500+ rows | Server | Server | Server (cursor) | Virtual |

Detection: if `repository.count()` > 500 → switch to server mode.
