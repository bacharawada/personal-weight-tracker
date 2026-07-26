/**
 * useMediaQuery — subscribes to a CSS media query, re-rendering when it flips.
 *
 * For the rare layout that can't be expressed with breakpoint classes because
 * the DOM structure itself has to change (splitting a row list across two
 * tables, for instance). Prefer Tailwind's responsive variants everywhere CSS
 * can do the job.
 */

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  // Server snapshot: no viewport to measure, so report the narrow layout.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
