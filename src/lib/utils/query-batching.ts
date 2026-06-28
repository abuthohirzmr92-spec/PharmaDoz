// ---------------------------------------------------------------------------
// Query Batching Utilities
// ---------------------------------------------------------------------------
// Shared helpers for chunked + concurrency-limited Supabase queries.
// Prevents PostgREST URL length limits when using .in() with large arrays.
//
// Usage:
//   import { chunk, mapWithLimit } from "@/lib/utils/query-batching";
//   const chunks = chunk(productIds, 100);
//   const results = await mapWithLimit(chunks, 5, async (c) => { ... });
// ---------------------------------------------------------------------------

/** Default chunk size for .in() queries — keeps URLs under PostgREST limits. */
export const DEFAULT_CHUNK_SIZE = 100;

/** Default max concurrency for parallel chunked queries. */
export const DEFAULT_MAX_CONCURRENCY = 5;

/** Split an array into batches of `size`. */
export function chunk<T>(arr: T[], size: number = DEFAULT_CHUNK_SIZE): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Execute async tasks in parallel with a concurrency limit.
 * Fail-fast: if any task throws, the entire operation rejects immediately.
 * Returns results in the same order as input items.
 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number = DEFAULT_MAX_CONCURRENCY,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]!);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}
