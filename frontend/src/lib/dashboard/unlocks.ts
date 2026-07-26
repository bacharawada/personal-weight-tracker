/**
 * What the dashboard can honestly show yet.
 *
 * A visual dashboard is cruel to a new account: every module either sits empty
 * or, worse, disappears. These gates let the page swap a module for a tile that
 * keeps its footprint and states what would fill it — the page becomes something
 * to complete rather than something that looks broken.
 *
 * The thresholds mirror what the analyses themselves need. Below three points
 * over a week no slope means anything, and the energy estimate's own
 * documentation is explicit that only a multi-week trend is meaningful.
 */

import type { Measurement, UserProfile } from "../types";

const DAY_MS = 86_400_000;

/** Minimum measurements before a trend is worth fitting. */
export const MIN_TREND_POINTS = 3;
/** Minimum span in days before a trend is worth fitting. */
export const MIN_TREND_DAYS = 7;
/** Minimum span in days before an energy balance is meaningful. */
export const MIN_ENERGY_DAYS = 14;

export interface DashboardGates {
  /** At least one measurement — the page has something to say. */
  hasAnyData: boolean;
  /** Enough points over enough days for a slope. */
  hasTrend: boolean;
  /** Enough history for the energy balance to mean anything. */
  hasEnergy: boolean;
  hasGoal: boolean;
  hasHeight: boolean;
  /** Measurements still missing for `hasTrend`; 0 once met. */
  measurementsToTrend: number;
  /** Days still missing for `hasTrend`; 0 once met. */
  daysToTrend: number;
  /** Days still missing for `hasEnergy`; 0 once met. */
  daysToEnergy: number;
}

/** Calendar days spanned by an ascending series, inclusive. */
function spanDays(measurements: Measurement[]): number {
  if (measurements.length === 0) return 0;
  const first = new Date(measurements[0].date).getTime();
  const last = new Date(measurements[measurements.length - 1].date).getTime();
  return Math.round((last - first) / DAY_MS) + 1;
}

export function computeGates(
  measurements: Measurement[],
  profile: UserProfile | null,
): DashboardGates {
  const points = measurements.length;
  const days = spanDays(measurements);

  return {
    hasAnyData: points > 0,
    hasTrend: points >= MIN_TREND_POINTS && days >= MIN_TREND_DAYS,
    hasEnergy: points >= MIN_TREND_POINTS && days >= MIN_ENERGY_DAYS,
    hasGoal: profile?.goal_weight != null,
    hasHeight: profile?.height_cm != null,
    measurementsToTrend: Math.max(0, MIN_TREND_POINTS - points),
    daysToTrend: Math.max(0, MIN_TREND_DAYS - days),
    daysToEnergy: Math.max(0, MIN_ENERGY_DAYS - days),
  };
}
