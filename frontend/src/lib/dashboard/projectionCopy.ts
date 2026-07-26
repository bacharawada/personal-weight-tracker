/**
 * Phrasing for a goal projection.
 *
 * The API returns a `status` discriminator plus raw numbers rather than a
 * sentence, so the wording lives here: it is translated, and the weights and
 * dates inside it follow the user's display preferences.
 *
 * Moved verbatim out of GoalCard when the dashboard was reworked — the compact
 * goal tile shows plain facts when a date exists and falls back to these
 * sentences for the statuses that have no date to show.
 */

import type { TFunction } from "i18next";
import { GoalStatus } from "../types";
import type { GoalProjection, WeightUnit } from "../types";
import { formatWeight, kgToDisplay, unitLabel } from "../units";

export interface ProjectionCopy {
  /** The projection summary sentence. */
  summary: string;
  /** The optimistic/pessimistic range clause, when one is meaningful. */
  range: string | null;
}

export interface CopyDeps {
  t: TFunction<"dashboard">;
  unit: WeightUnit;
  goalWeightKg: number | null;
  formatDate: (iso: string) => string;
}

/**
 * Phrase a projection: pick the sentence from its `status` and fill in the
 * numbers, converted to the user's unit and date format.
 */
export function projectionCopy(
  projection: GoalProjection,
  { t, unit, goalWeightKg, formatDate }: CopyDeps,
): ProjectionCopy {
  const goal = goalWeightKg != null ? formatWeight(goalWeightKg, unit) : "";
  const rate =
    projection.trend_per_week != null
      ? `${kgToDisplay(Math.abs(projection.trend_per_week), unit).toFixed(1)} ${unitLabel(unit)}/wk`
      : "";
  const date =
    projection.predicted_date != null ? formatDate(projection.predicted_date) : "";

  let summary: string;
  switch (projection.status) {
    case GoalStatus.NotTrendingDown:
      summary = t("goal.status.notTrendingDown", {
        goal,
        weeks: projection.trend_window_weeks ?? 0,
      });
      break;
    case GoalStatus.BeyondHorizon:
      summary = t("goal.status.beyondHorizon", {
        goal,
        rate,
        years: (projection.years_away ?? 0).toFixed(1),
      });
      break;
    case GoalStatus.OnTrack:
      summary = t("goal.status.onTrack", { goal, rate, date });
      break;
    case GoalStatus.BehindTarget:
      summary = t("goal.status.behindTarget", {
        goal,
        rate,
        date,
        count: Math.abs(projection.days_ahead_behind ?? 0),
      });
      break;
    case GoalStatus.Projected:
      summary = t("goal.status.projected", { goal, rate, date });
      break;
    case GoalStatus.NoGoal:
      summary = t("goal.status.noGoal");
      break;
    case GoalStatus.NoData:
      summary = t("goal.status.noData");
      break;
    case GoalStatus.AlreadyReached:
      summary = t("goal.status.alreadyReached");
      break;
    case GoalStatus.InsufficientData:
      summary = t("goal.status.insufficientData");
      break;
    default:
      // A status this build doesn't know about: stay silent rather than
      // surfacing a raw translation key.
      summary = "";
  }

  const { predicted_date_optimistic: earliest, predicted_date_pessimistic: latest } =
    projection;
  let range: string | null = null;
  if (earliest != null && latest != null && earliest !== latest) {
    range = t("goal.range.between", {
      from: formatDate(earliest),
      to: formatDate(latest),
    });
  } else if (earliest != null && latest == null) {
    // The slow bound never crosses the goal: only a floor is meaningful.
    range = t("goal.range.earliest", { date: formatDate(earliest) });
  }

  return { summary, range };
}
