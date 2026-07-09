# MEDISYNC — Repository Pagination Strategy

## Principle

**Add pagination methods WITHOUT breaking existing methods.**

Existing `getProducts()` continues to work for small datasets. New `getProductsPaginated(params)` for large datasets.

## Repository Interface Extension

```typescript
interface PaginatedRepository<T> {
  // Existing (unchanged)
  getAll(): Promise<T[]>;
  
  // New (additive)
  getPage(params: PageParams): Promise<PageResult<T>>;
  count(filters?: FilterParams): Promise<number>;
}

interface PageParams {
  search?: string;
  cursor?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  pageSize?: number;
  filters?: Record<string, unknown>;
}

interface PageResult<T> {
  rows: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  totalCount: number;
  hasMore: boolean;
}
```

## Supabase Implementation

```typescript
async getProductsPaginated(params: PageParams): Promise<PageResult<Product>> {
  let query = this.client
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  // Search
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  // Cursor
  if (params.cursor) {
    const { id } = JSON.parse(atob(params.cursor));
    query = query.gt("id", id);
  }

  // Sort
  const sortKey = params.sortKey || "name";
  const sortDir = params.sortDir || "asc";
  query = query.order(sortKey, { ascending: sortDir === "asc" });

  // Limit
  const pageSize = params.pageSize || 50;
  query = query.limit(pageSize + 1); // +1 to check hasMore

  const { data, error, count } = await query;
  if (error) throw error;

  const hasMore = (data || []).length > pageSize;
  const rows = (data || []).slice(0, pageSize);
  const nextCursor = hasMore && rows.length > 0
    ? btoa(JSON.stringify({ id: rows[rows.length - 1].id }))
    : null;

  return { rows, nextCursor, prevCursor: null, totalCount: count ?? 0, hasMore };
}
```

## Backward Compatibility

```typescript
// OLD (still works)
const products = await productRepo.getProducts();

// NEW (additive)
const page = await productRepo.getProductsPaginated({ pageSize: 50 });
```
