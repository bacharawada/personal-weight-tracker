/**
 * PlateauCard — dashboard panel surfacing the current plateau/losing/gaining
 * status plus a short summary of past plateau periods.
 *
 * Combines the server-side plateau status (/api/stats/plateau) with the
 * user's unit preference. Mirrors GoalCard's layout: a colored state badge,
 * the recent trend rate, and (when available) a one-line history summary.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getPlateauStatus } from "../../lib/api";
import { PlateauState } from "../../lib/types";
import type { PlateauStatus } from "../../lib/types";
import { useWeightTracker } from "../../context/WeightTrackerContext";
import { kgToDisplay, unitLabel } from "../../lib/units";

interface PlateauCardProps {
  refreshKey: number;
}

export function PlateauCard({ refreshKey }: PlateauCardProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();
  const [status, setStatus] = useState<PlateauStatus | null>(null);

  useEffect(() => {
    getPlateauStatus().then(setStatus).catch(console.error);
  }, [refreshKey]);

  // Not enough data yet, or the recent trend itself couldn't be fit
  // (e.g. all measurements on the same day) — show a quiet i18n prompt
  // rather than the card's full layout.
  if (!status || !status.has_data || status.state === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-2">
          <Minus size={16} />
          {t("plateau.insufficientData")}
        </span>
      </div>
    );
  }

  const { state } = status;

  const icon =
    state === PlateauState.Plateau ? (
      <Minus size={20} className="text-amber-600" />
    ) : state === PlateauState.Losing ? (
      <TrendingDown size={20} className="text-green-600" />
    ) : (
      <TrendingUp size={20} className="text-red-600" />
    );

  const badgeLabel =
    state === PlateauState.Plateau
      ? t("plateau.plateauBadge", { count: status.duration_days ?? 0 })
      : state === PlateauState.Losing
        ? t("plateau.losingBadge")
        : t("plateau.gainingBadge");

  const badgeClasses =
    state === PlateauState.Plateau
      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
      : state === PlateauState.Losing
        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
        : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400";

  const rateLabel =
    status.trend_per_week != null
      ? `${status.trend_per_week >= 0 ? "+" : ""}${kgToDisplay(status.trend_per_week, unit).toFixed(2)} ${unitLabel(unit)}/wk`
      : null;

  const historyLine = !status.history_available
    ? t("plateau.historyUnavailable")
    : status.history.length > 0 && status.avg_duration_days != null
      ? t("plateau.historySummary", {
          count: status.history.length,
          avgDays: status.avg_duration_days.toFixed(1),
        })
      : t("plateau.noHistory");

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-start gap-3"
      title={t("plateau.explainer")}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("plateau.cardLabel")}</p>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeClasses}`}
          >
            {badgeLabel}
          </span>
        </div>
        {rateLabel && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-snug">
            {t("plateau.recentRate")}: <span className="font-semibold">{rateLabel}</span>
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
          <History size={12} className="shrink-0" />
          {historyLine}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 italic leading-snug">
          {t("plateau.explainer")}
        </p>
      </div>
    </div>
  );
}
