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

import { useEffect, useMemo, useRef, useState } from "react";
import { useWeightTracker } from "../context/WeightTrackerContext";
import {
  getEnergyBalance,
  getEnergyChart,
  getGoal,
  getGoalMilestones,
  getMeasurements,
  getMedicationImpact,
  getPlateauStatus,
} from "../lib/api";
import { computeDeltas, type WeightDeltas } from "../lib/dashboard/series";
import type {
  DoseImpact,
  EnergyBalance,
  EnergyPoint,
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
  /** Per-measurement energy balance, for the tile's sparkline. */
  energySeries: EnergyPoint[];
  /** First doses and dose changes, with the trend on either side of each. */
  doseChanges: DoseImpact[];
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
  energySeries: [],
  doseChanges: [],
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
  const { chartParams, refreshKey } = useWeightTracker();
  const [payloads, setPayloads] = useState<DashboardPayloads>(EMPTY);

  // The energy series is the one payload that takes chart params, but depending
  // on the object itself would refetch all six endpoints whenever the palette or
  // theme changes. refreshKey already folds in every param the query actually
  // sends, so the params are read through a ref — kept in sync by an effect
  // declared first, which therefore runs before the fetch below on every commit.
  const chartParamsRef = useRef(chartParams);
  useEffect(() => {
    chartParamsRef.current = chartParams;
  }, [chartParams]);

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([
      getGoal(),
      getGoalMilestones(),
      getPlateauStatus(),
      getEnergyBalance(),
      getEnergyChart(chartParamsRef.current),
      getMedicationImpact(),
      getMeasurements(),
    ]).then(
      ([goal, milestones, plateau, energy, energyChart, doseChanges, measurements]) => {
        if (isCancelled) return;
        const rows = settled(measurements) ?? [];
        setPayloads({
          goal: settled(goal),
          milestones: settled(milestones),
          plateau: settled(plateau),
          energy: settled(energy),
          energySeries: settled(energyChart)?.bars ?? [],
          doseChanges: settled(doseChanges) ?? [],
          measurements: [...rows].sort((a, b) => a.date.localeCompare(b.date)),
        });
      },
    );

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
