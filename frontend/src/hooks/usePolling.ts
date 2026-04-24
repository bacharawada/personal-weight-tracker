/** Polling hook — watches DB mtime and triggers refresh on change. */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDbMtime } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

export function usePolling() {
  const [refreshKey, setRefreshKey] = useState(0);
  const mtimeRef = useRef(0);

  const bump = useCallback(() => {
    setRefreshKey((k) => {
      console.log("[Polling] bump: refreshKey", k, "→", k + 1);
      return k + 1;
    });
  }, []);

  useEffect(() => {
    // Fetch immediately on mount so the first render has correct data,
    // then poll on the interval.
    async function check() {
      try {
        const { mtime } = await getDbMtime();
        console.log("[Polling] mtime check — got:", mtime, "prev:", mtimeRef.current);
        if (mtime !== mtimeRef.current) {
          mtimeRef.current = mtime;
          bump();
        }
      } catch {
        // Silently ignore polling errors.
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [bump]); // bump is stable (useCallback with [] deps)

  return { refreshKey, bump };
}
