/** Polling hook — watches DB mtime and triggers refresh on change. */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDbMtime } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

export function usePolling() {
  const [refreshKey, setRefreshKey] = useState(0);
  const mtimeRef = useRef(0);

  const bump = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { mtime } = await getDbMtime();
        if (mtime !== mtimeRef.current) {
          mtimeRef.current = mtime;
          bump();
        }
      } catch {
        // Silently ignore polling errors.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [bump]);

  return { refreshKey, bump };
}
