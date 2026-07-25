/**
 * useDashboardData — one fetch pass feeding every dashboard module.
 *
 * Each dashboard card used to run its own effect, so `/api/stats` was requested
 * four times per render. This hook fetches each endpoint once per refresh and
 * hands the payloads down as props instead.
 *
 * Endpoints are settled independently: one failing request leaves its own slot
 * null and every other module still renders, which is how the per-card
 * `.catch(console.error)` behaved before.
 */

import { useEffect, useMemo, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import {
  getEnergyBalance,
  getGoal,
  getGoalMilestones,
  getMeasurements,
  getPlateauStatus,
} from "../lib/api";
import { computeDeltas, type WeightDeltas } from "../lib/dashboard/series";
import type {
  EnergyBalance,
  GoalProjection,
  Measurement,
  MilestonesProjection,
  PlateauStatus,
} from "../lib/types";

/** Every server payload the dashboard renders. `null` means "not loaded yet". */
interface DashboardPayloads {
  goal: GoalProjection | null;
  milestones: MilestonesProjection | null;
  plateau: PlateauStatus | null;
  energy: EnergyBalance | null;
  /** Ascending by date. Empty until the first fetch settles. */
  measurements: Measurement[];
}

export interface DashboardData extends DashboardPayloads {
  /** Most recent measurement, or `null` when the user has none. */
  latest: Measurement | null;
  deltas: WeightDeltas;
}

const EMPTY: DashboardPayloads = {
  goal: null,
  milestones: null,
  plateau: null,
  energy: null,
  measurements: [],
};

/** Unwrap one settled request, logging and nulling out a rejection. */
function settled<T>(result: PromiseSettledResult<T>): T | null {
  if (result.status === "fulfilled") return result.value;
  console.error(result.reason);
  return null;
}

/**
 * Fetch the dashboard payloads, refetching whenever the tracker's refresh key
 * changes (new measurement, profile edit, poll tick).
 */
export function useDashboardData(): DashboardData {
  const { refreshKey } = useWeightTracker();
  const [payloads, setPayloads] = useState<DashboardPayloads>(EMPTY);

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([
      getGoal(),
      getGoalMilestones(),
      getPlateauStatus(),
      getEnergyBalance(),
      getMeasurements(),
    ]).then(([goal, milestones, plateau, energy, measurements]) => {
      if (isCancelled) return;
      const rows = settled(measurements) ?? [];
      setPayloads({
        goal: settled(goal),
        milestones: settled(milestones),
        plateau: settled(plateau),
        energy: settled(energy),
        measurements: [...rows].sort((a, b) => a.date.localeCompare(b.date)),
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const { measurements } = payloads;

  return useMemo(
    () => ({
      ...payloads,
      latest: measurements.length > 0 ? measurements[measurements.length - 1] : null,
      deltas: computeDeltas(measurements),
    }),
    [payloads, measurements],
  );
}
