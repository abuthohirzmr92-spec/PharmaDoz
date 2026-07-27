"use client";

import { useState, useCallback } from "react";
import { useAsync, type AsyncState } from "./use-async";

/**
 * Thin wrapper around useAsync that adds a `refresh()` function.
 *
 * Consolidates the `refreshKey` / `setRefreshKey(k => k + 1)` pattern
 * duplicated across multiple subscription management pages.
 *
 * ```
 * const { data, loading, error, refresh } = useRefreshable(() => fetchData());
 * // Trigger re-fetch: refresh();
 * ```
 */
export function useRefreshable<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> & { refresh: () => void } {
  const [refreshKey, setRefreshKey] = useState(0);
  const state = useAsync(fn, [refreshKey, ...deps]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return { ...state, refresh };
}
