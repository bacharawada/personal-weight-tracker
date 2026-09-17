/**
 * useMetabolism — the BMR / TDEE estimate for the current user.
 *
 * Refetches on the tracker's refresh key, which `saveProfile` bumps, so the
 * numbers follow a profile edit (new height, sex, birth date or activity
 * level) as well as a new weigh-in.
 */

import { useEffect, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import { getMetabolism } from "../lib/api";
import type { Metabolism } from "../lib/types";

export interface MetabolismState {
  /** `null` until the first fetch settles, or after a failed request. */
  metabolism: Metabolism | null;
  isLoading: boolean;
  hasLoadError: boolean;
}

export function useMetabolism(): MetabolismState {
  const { refreshKey } = useWeightTracker();
  const [metabolism, setMetabolism] = useState<Metabolism | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    getMetabolism()
      .then((data) => {
        if (isCancelled) return;
        setMetabolism(data);
        setHasLoadError(false);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        console.error(error);
        setMetabolism(null);
        setHasLoadError(true);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  return { metabolism, isLoading, hasLoadError };
}
