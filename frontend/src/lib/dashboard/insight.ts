/**
 * The one thing worth saying about the data right now.
 *
 * The old dashboard left the synthesis to the reader: nine panels, each true,
 * none of them pointing at what changed. This picks a single headline by walking
 * an explicit priority order, so the page opens on a conclusion.
 *
 * Every rule earns its place by saying something no single tile can. The dose
 * rule joins the medication journal to the trend; the plateau rule reads the
 * current stall against past ones; the pace rule turns "behind target" into the
 * rate that would fix it. Rules that would merely restate a tile are absent.
 *
 * Returns an i18n key plus its parameters, never a built sentence — the wording
 * and the number formatting belong to the render layer.
 */

import type { DoseImpact, GoalProjection, PlateauStatus } from "../types";
import { PlateauState } from "../types";

export interface Insight {
  /** Key under the `dashboard:insight` namespace. */
  key: string;
  params: Record<string, string | number>;
}

/**
 * A dose change counts as working when the trend both kept its direction and
 * gained at least this much magnitude.
 */
const DOSE_EFFECT_RATIO = 1.3;

/** Streaks shorter than this are not worth a headline. */
const STREAK_HEADLINE_DAYS = 7;

/** Rates below this magnitude (kg/week) are noise rather than a direction. */
const FLAT_THRESHOLD_KG = 0.1;

interface InsightSources {
  goal: GoalProjection | null;
  plateau: PlateauStatus | null;
  doseChanges: DoseImpact[];
  streakDays: number;
  /** Formats a kg/week rate for display, unit and sign included. */
  formatRate: (kgPerWeek: number) => string;
  /** Formats an ISO date to the user's preference. */
  formatDate: (iso: string) => string;
}

/**
 * Most recent dose change whose after-slope is meaningfully steeper than its
 * before-slope, in the same direction.
 */
function findEffectiveDoseChange(doseChanges: DoseImpact[]): DoseImpact | null {
  const candidates = doseChanges
    .filter((change) => {
      const { slope_before_per_week: before, slope_after_per_week: after } = change;
      if (before == null || after == null) return false;
      // Same direction, and steeper by a clear margin.
      if (before < 0 !== after < 0) return false;
      return Math.abs(after) >= Math.abs(before) * DOSE_EFFECT_RATIO;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

export function selectInsight({
  goal,
  plateau,
  doseChanges,
  streakDays,
  formatRate,
  formatDate,
}: InsightSources): Insight | null {
  if (goal?.already_reached === true) {
    return { key: "goalReached", params: {} };
  }

  const dose = findEffectiveDoseChange(doseChanges);
  if (
    dose != null &&
    dose.slope_before_per_week != null &&
    dose.slope_after_per_week != null
  ) {
    return {
      key: "doseWorking",
      params: {
        medication: dose.medication,
        date: formatDate(dose.date),
        before: formatRate(dose.slope_before_per_week),
        after: formatRate(dose.slope_after_per_week),
      },
    };
  }

  if (plateau?.state === PlateauState.Plateau && plateau.duration_days != null) {
    // Past plateaus are the reassuring part: they ended.
    if (plateau.avg_duration_days != null && plateau.history.length > 0) {
      return {
        key: "plateauWithHistory",
        params: {
          days: plateau.duration_days,
          count: plateau.history.length,
          avgDays: plateau.avg_duration_days.toFixed(0),
        },
      };
    }
    return { key: "plateau", params: { days: plateau.duration_days } };
  }

  if (plateau?.state === PlateauState.Gaining && plateau.trend_per_week != null) {
    return {
      key: "gaining",
      params: { rate: formatRate(plateau.trend_per_week) },
    };
  }

  if (goal?.on_track === false && goal.predicted_date != null) {
    return {
      key: "behindTarget",
      // `count` rather than `days`: i18next pluralises on that name alone.
      params: {
        date: formatDate(goal.predicted_date),
        count: Math.abs(goal.days_ahead_behind ?? 0),
      },
    };
  }

  if (goal?.on_track === true && goal.predicted_date != null) {
    return {
      key: "onTrack",
      params: { date: formatDate(goal.predicted_date) },
    };
  }

  if (goal?.predicted_date != null && goal.trend_per_week != null) {
    return {
      key: "projected",
      params: {
        date: formatDate(goal.predicted_date),
        rate: formatRate(goal.trend_per_week),
      },
    };
  }

  if (
    plateau?.state === PlateauState.Losing &&
    plateau.trend_per_week != null &&
    Math.abs(plateau.trend_per_week) >= FLAT_THRESHOLD_KG
  ) {
    return {
      key: "losing",
      params: { rate: formatRate(plateau.trend_per_week) },
    };
  }

  if (streakDays >= STREAK_HEADLINE_DAYS) {
    return { key: "streak", params: { days: streakDays } };
  }

  return null;
}
