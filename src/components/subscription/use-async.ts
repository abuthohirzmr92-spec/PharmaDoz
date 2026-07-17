"use client";

import { useEffect, useState } from "react";

// Per-widget async loader: independent loading/error state so one widget's
// failure never blocks the rest of the dashboard.
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    fn()
      .then((d) => {
        if (alive) setState({ data: d, loading: false, error: null });
      })
      .catch((e) => {
        if (alive) setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Gagal memuat" });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
