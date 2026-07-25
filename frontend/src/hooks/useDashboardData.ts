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
  getStats,
} from "../lib/api";
import type {
  EnergyBalance,
  GoalProjection,
  Measurement,
  MilestonesProjection,
  PlateauStatus,
  Stats,
} from "../lib/types";

const DAY_MS = 86_400_000;

/**
 * Signed weight change over each headline window, in kg — negative means lost.
 * A window is `null` when no measurement predates it.
 */
export interface WeightDeltas {
  last7Days: number | null;
  last30Days: number | null;
  total: number | null;
}

/** Every server payload the dashboard renders. `null` means "not loaded yet". */
interface DashboardPayloads {
  stats: Stats | null;
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
  stats: null,
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
 * Weight recorded on or before `targetMs`, taken from an ascending series.
 * Returns `null` when the series starts after that instant.
 */
function weightAt(measurements: Measurement[], targetMs: number): number | null {
  let found: number | null = null;
  for (const measurement of measurements) {
    if (new Date(measurement.date).getTime() > targetMs) break;
    found = measurement.weight;
  }
  return found;
}

/**
 * Change between the latest weight and the one recorded a window ago. The
 * comparison uses raw measurements rather than the smoothed series: it answers
 * "what does the scale say versus last week", which is what the headline claims.
 */
function computeDeltas(measurements: Measurement[]): WeightDeltas {
  if (measurements.length === 0) {
    return { last7Days: null, last30Days: null, total: null };
  }
  const latest = measurements[measurements.length - 1];
  const latestMs = new Date(latest.date).getTime();
  const since = (days: number): number | null => {
    const earlier = weightAt(measurements, latestMs - days * DAY_MS);
    return earlier == null ? null : latest.weight - earlier;
  };
  return {
    last7Days: since(7),
    last30Days: since(30),
    total: latest.weight - measurements[0].weight,
  };
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
      getStats(),
      getGoal(),
      getGoalMilestones(),
      getPlateauStatus(),
      getEnergyBalance(),
      getMeasurements(),
    ]).then(([stats, goal, milestones, plateau, energy, measurements]) => {
      if (isCancelled) return;
      const rows = settled(measurements) ?? [];
      setPayloads({
        stats: settled(stats),
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
