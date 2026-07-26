/**
 * MomentumTile — the rhythm of the last few weeks, and whether it has stalled.
 *
 * Replaces the plateau panel's three lines of prose. The state badge stays
 * (that's the conclusion), but the weekly bars beside it show how the run got
 * there — a plateau after eight losing weeks reads very differently from a
 * plateau after two.
 *
 * The bars are computed from the raw measurements rather than fetched: the
 * derivative endpoint answers a finer-grained question and would cost a request
 * for a series this page already holds.
 */

import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { weeklyRates } from "../../lib/dashboard/series";
import { kgToDisplay, unitLabel } from "../../lib/units";
import { PlateauState } from "../../lib/types";
import type { Measurement, PlateauStatus } from "../../lib/types";
import { MiniBars, Tile } from "./tiles";

/** Weeks of history the bars cover. */
const WEEKS = 9;

interface MomentumTileProps {
  measurements: Measurement[];
  plateau: PlateauStatus | null;
}

export function MomentumTile({ measurements, plateau }: MomentumTileProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();

  const rates = weeklyRates(measurements, WEEKS);
  const state = plateau?.state ?? null;

  if (rates.length === 0 || state == null) {
    return (
      <Tile label={t("momentum.label")} icon={<Activity size={16} />}>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("plateau.insufficientData")}
        </p>
      </Tile>
    );
  }

  const badge =
    state === PlateauState.Plateau
      ? {
          text: t("plateau.plateauBadge", { count: plateau?.duration_days ?? 0 }),
          classes: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
        }
      : state === PlateauState.Losing
        ? {
            text: t("plateau.losingBadge"),
            classes: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
          }
        : {
            text: t("plateau.gainingBadge"),
            classes: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400",
          };

  const losingWeeks = rates.filter((rate) => rate.changeKg < 0).length;
  const historyLine =
    plateau != null && plateau.history_available && plateau.history.length > 0 &&
    plateau.avg_duration_days != null
      ? t("plateau.historySummary", {
          count: plateau.history.length,
          avgDays: plateau.avg_duration_days.toFixed(1),
        })
      : null;

  return (
    <Tile
      label={t("momentum.label")}
      icon={<Activity size={16} />}
      action={
        <span
          title={t("plateau.explainer")}
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.classes}`}
        >
          {badge.text}
        </span>
      }
    >
      <div className="mt-3">
        <MiniBars
          values={rates.map((rate) => kgToDisplay(rate.changeKg, unit))}
          ariaLabel={t("momentum.barsLabel", { count: rates.length })}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        {t("momentum.losingWeeks", { losing: losingWeeks, total: rates.length })}
      </p>
      {plateau?.trend_per_week != null && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("plateau.recentRate")}:{" "}
          <span className="font-semibold">
            {plateau.trend_per_week >= 0 ? "+" : "−"}
            {kgToDisplay(Math.abs(plateau.trend_per_week), unit).toFixed(2)}{" "}
            {unitLabel(unit)}/wk
          </span>
        </p>
      )}
      {historyLine && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{historyLine}</p>
      )}
    </Tile>
  );
}
