/**
 * GoalCard — dashboard panel summarising goal progress and BMI.
 *
 * Combines the server-side goal projection (/api/goal) with the user's
 * profile (height, goal weight) and latest measurement. When no goal or
 * height is configured it shows a quiet prompt linking to Settings.
 *
 * The projection summary is phrased here, not by the backend: the API returns
 * a `status` plus raw numbers, so the sentence is translated and its weights
 * and dates follow the user's display preferences.
 */

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { Target, TriangleAlert, CheckCircle2, Activity } from "lucide-react";
import { GoalStatus } from "../../lib/types";
import type { GoalProjection, Stats, WeightUnit } from "../../lib/types";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../context/DisplayPreferencesContext";
import { formatWeight, kgToDisplay, unitLabel } from "../../lib/units";

interface GoalCardProps {
  goal: GoalProjection | null;
  stats: Stats | null;
}

interface BmiInfo {
  value: number;
  categoryKey: string;
  color: string;
}

function computeBmi(weightKg: number, heightCm: number): BmiInfo {
  const bmi = weightKg / (heightCm / 100) ** 2;
  let categoryKey = "normal";
  let color = "text-green-600";
  if (bmi < 18.5) {
    categoryKey = "underweight";
    color = "text-blue-500";
  } else if (bmi >= 30) {
    categoryKey = "obese";
    color = "text-red-600";
  } else if (bmi >= 25) {
    categoryKey = "overweight";
    color = "text-amber-600";
  }
  return { value: bmi, categoryKey, color };
}

interface ProjectionCopy {
  /** The projection summary sentence. */
  summary: string;
  /** The optimistic/pessimistic range clause, when one is meaningful. */
  range: string | null;
}

interface CopyDeps {
  t: TFunction<"dashboard">;
  unit: WeightUnit;
  goalWeightKg: number | null;
  formatDate: (iso: string) => string;
}

/**
 * Phrase a projection: pick the sentence from its `status` and fill in the
 * numbers, converted to the user's unit and date format.
 */
function projectionCopy(
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

export function GoalCard({ goal, stats }: GoalCardProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  const hasGoal = profile?.goal_weight != null;
  const hasHeight = profile?.height_cm != null;
  const latestWeight = stats?.latest_weight ?? null;

  const bmi =
    hasHeight && latestWeight != null && profile?.height_cm != null
      ? computeBmi(latestWeight, profile.height_cm)
      : null;

  const copy =
    goal != null
      ? projectionCopy(goal, {
          t,
          unit,
          goalWeightKg: profile?.goal_weight ?? null,
          formatDate,
        })
      : null;

  // Nothing configured yet — nudge the user toward Settings.
  if (!hasGoal && !hasHeight) {
    return (
      <Link
        to="/settings"
        className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <Target size={16} />
          {t("goal.setupPrompt")}
        </span>
      </Link>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Goal status */}
      {hasGoal && goal && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {goal.already_reached ? (
              <CheckCircle2 size={20} className="text-green-600" />
            ) : goal.reachable === false ? (
              <TriangleAlert size={20} className="text-amber-600" />
            ) : (
              <Target size={20} style={{ color: "var(--color-accent)" }} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("goal.label")}</p>
              {profile?.goal_weight != null && (
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatWeight(profile.goal_weight, unit)}
                </p>
              )}
              {goal.on_track === true && !goal.already_reached && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                  {t("goal.onTrack")}
                </span>
              )}
              {goal.on_track === false && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                  {t("goal.behind")}
                </span>
              )}
            </div>
            {copy != null && copy.summary !== "" && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
                {copy.summary}
              </p>
            )}
            {copy?.range != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                {copy.range}
              </p>
            )}
            {goal.days_remaining != null && goal.days_remaining > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("goal.daysToGo", { count: goal.days_remaining })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* BMI */}
      {hasHeight && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3">
          <Activity size={20} className="shrink-0 mt-0.5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("bmi.label")}</p>
            {bmi ? (
              <>
                <p className={`text-xl font-bold leading-tight ${bmi.color}`}>
                  {bmi.value.toFixed(1)}
                  <span className="text-sm font-medium ml-2">{t(`bmi.category.${bmi.categoryKey}`)}</span>
                </p>
                {profile?.height_cm != null && latestWeight != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {profile.height_cm} cm · {formatWeight(latestWeight, unit)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t("bmi.addMeasurement")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
