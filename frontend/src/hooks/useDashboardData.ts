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

import { useEffect, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import {
  getEnergyBalance,
  getGoal,
  getGoalMilestones,
  getPlateauStatus,
  getStats,
} from "../lib/api";
import type {
  EnergyBalance,
  GoalProjection,
  MilestonesProjection,
  PlateauStatus,
  Stats,
} from "../lib/types";

/** Every server payload the dashboard renders. `null` means "not loaded yet". */
export interface DashboardData {
  stats: Stats | null;
  goal: GoalProjection | null;
  milestones: MilestonesProjection | null;
  plateau: PlateauStatus | null;
  energy: EnergyBalance | null;
}

const EMPTY: DashboardData = {
  stats: null,
  goal: null,
  milestones: null,
  plateau: null,
  energy: null,
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
  const [data, setData] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([
      getStats(),
      getGoal(),
      getGoalMilestones(),
      getPlateauStatus(),
      getEnergyBalance(),
    ]).then(([stats, goal, milestones, plateau, energy]) => {
      if (isCancelled) return;
      setData({
        stats: settled(stats),
        goal: settled(goal),
        milestones: settled(milestones),
        plateau: settled(plateau),
        energy: settled(energy),
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  return data;
}
