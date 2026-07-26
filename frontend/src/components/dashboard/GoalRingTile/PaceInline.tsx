/**
 * PaceInline — the rate achieved against the rate needed, as a side note.
 *
 * Was a tile of its own; the milestones took that slot. It reads fine as a
 * secondary block because the goal tile above it already carries the verdict:
 * its on-track badge is derived from the same comparison, so a second badge here
 * would say the same thing twice. What remains is the number and the meter that
 * makes it legible.
 *
 * The trend is the goal projection's slope, not `stats.current_trend`: the
 * projection fits a robust recency-weighted trend while current_trend is a
 * two-point difference over four weeks. Reading the required rate against the
 * slope that actually produces the projected date keeps the two consistent.
 */

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { kgToDisplay, unitLabel } from "../../../lib/units";
import type { GoalProjection } from "../../../lib/types";
import { Meter } from "../tiles";

const DAY_MS = 86_400_000;

/**
 * Weekly loss range most weight-loss guidance describes as typical, in kg.
 * Drawn as context on the meter, not as a recommendation the app makes.
 */
const TYPICAL_LOSS_LOW_KG = 0.5;
const TYPICAL_LOSS_HIGH_KG = 1;

/** Rates below this magnitude (kg/week) are noise rather than a direction. */
const FLAT_THRESHOLD_KG = 0.05;

interface PaceInlineProps {
  goal: GoalProjection | null;
  latestWeight: number | null;
}

/**
 * Weekly change needed to move from `latestWeight` to `goalWeight` by
 * `targetDate`. Negative when weight must come off. `null` when the target date
 * is absent or already past — there is no rate that fixes a deadline gone by.
 */
function requiredRatePerWeek(
  latestWeight: number,
  goalWeight: number,
  targetDate: string,
): number | null {
  const weeks = (new Date(targetDate).getTime() - Date.now()) / (7 * DAY_MS);
  if (weeks <= 0) return null;
  return (goalWeight - latestWeight) / weeks;
}

export function PaceInline({ goal, latestWeight }: PaceInlineProps) {
  const { t } = useTranslation("dashboard");
  const { profile, unit } = useWeightTracker();

  const actual = goal?.trend_per_week ?? null;
  const goalWeight = profile?.goal_weight ?? null;
  const targetDate = profile?.target_date ?? null;

  if (actual == null) {
    return (
      <>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("pace.label")}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("pace.insufficient")}
        </p>
      </>
    );
  }

  const required =
    latestWeight != null && goalWeight != null && targetDate != null
      ? requiredRatePerWeek(latestWeight, goalWeight, targetDate)
      : null;

  // The typical range describes losing weight, so it is only drawn when that is
  // the direction of travel.
  const isLosingContext =
    goalWeight != null && latestWeight != null
      ? goalWeight < latestWeight
      : actual < 0;

  const rate = (value: number): string =>
    `${kgToDisplay(Math.abs(value), unit).toFixed(2)} ${unitLabel(unit)}/wk`;

  const actualMagnitude = kgToDisplay(Math.abs(actual), unit);
  const band = isLosingContext
    ? {
        from: kgToDisplay(TYPICAL_LOSS_LOW_KG, unit),
        to: kgToDisplay(TYPICAL_LOSS_HIGH_KG, unit),
      }
    : null;
  const marker =
    required != null
      ? {
          value: kgToDisplay(Math.abs(required), unit),
          label: t("pace.required", { value: rate(required) }),
        }
      : null;

  const max =
    Math.max(
      actualMagnitude,
      marker?.value ?? 0,
      band?.to ?? 0,
      kgToDisplay(FLAT_THRESHOLD_KG, unit),
    ) * 1.2;

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("pace.label")}</p>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-none">
          {actual < 0 ? "−" : "+"}
          {rate(actual)}
        </p>
      </div>

      <div className="mt-3">
        <Meter
          value={actualMagnitude}
          max={max}
          band={band}
          marker={marker}
          ariaLabel={t("pace.meterLabel", { value: rate(actual) })}
        />
      </div>

      {band && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          {t("pace.typicalRange", {
            from: kgToDisplay(TYPICAL_LOSS_LOW_KG, unit).toFixed(1),
            to: kgToDisplay(TYPICAL_LOSS_HIGH_KG, unit).toFixed(1),
            unit: unitLabel(unit),
          })}
        </p>
      )}

      {targetDate == null && (
        <Link
          to="/settings"
          className="block text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mt-2"
        >
          {t("pace.noTargetDate")}
        </Link>
      )}
      {targetDate != null && required == null && (
        <p className="text-xs text-amber-600 mt-2">{t("pace.targetDatePassed")}</p>
      )}
    </>
  );
}
