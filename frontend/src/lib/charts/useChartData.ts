/**
 * Data-fetching hook for the charts.
 *
 * Fetches whenever `deps` change and exposes loading / error state. Rendering
 * concerns (palette, theme, axis overrides) are deliberately NOT part of the
 * dependency list, so re-styling never triggers a network request.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ChartDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useChartData<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): ChartDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always call the latest fetcher without making it a dependency.
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Failed to load chart");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
