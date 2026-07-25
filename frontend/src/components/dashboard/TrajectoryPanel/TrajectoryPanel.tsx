/**
 * TrajectoryPanel — the dashboard's hero: where you are and where you're headed.
 *
 * Unifies what used to be scattered across five stat tiles and a chart pinned
 * to the bottom of the page: the current weight, how it moved over the headline
 * windows, and the projection annotated with the date it meets the goal.
 *
 * The chart renders `bare` so the panel owns a single surface rather than
 * stacking two cards.
 */

import { useTranslation } from "react-i18next";
import { useWeightTracker } from "../../../context/WeightTrackerContext";
import { useDisplayPreferences } from "../../../context/DisplayPreferencesContext";
import { formatWeight } from "../../../lib/units";
import type { ChartParams, Measurement } from "../../../lib/types";
import type { WeightDeltas } from "../../../hooks/useDashboardData";
import { WeightChart } from "../../charts/WeightChart";
import { Tile } from "../tiles";
import { DeltaStat } from "./DeltaStat";

interface TrajectoryPanelProps {
  params: ChartParams;
  refreshKey: number;
  latest: Measurement | null;
  deltas: WeightDeltas;
  onPointClick: (point: { date: string; weight: number }) => void;
}

export function TrajectoryPanel({
  params,
  refreshKey,
  latest,
  deltas,
  onPointClick,
}: TrajectoryPanelProps) {
  const { t } = useTranslation("dashboard");
  const { unit } = useWeightTracker();
  const { formatDate } = useDisplayPreferences();

  return (
    <Tile
      label={t("trajectory.currentWeight")}
      action={
        latest && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(latest.date)}
          </span>
        )
      }
    >
      {latest ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mt-1">
            <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-none">
              {formatWeight(latest.weight, unit)}
            </p>
            <div className="flex gap-5 md:gap-8">
              <DeltaStat label={t("trajectory.last7Days")} valueKg={deltas.last7Days} />
              <DeltaStat label={t("trajectory.last30Days")} valueKg={deltas.last30Days} />
              <DeltaStat label={t("trajectory.sinceStart")} valueKg={deltas.total} />
            </div>
          </div>

          <WeightChart
            params={params}
            refreshKey={refreshKey}
            onPointClick={onPointClick}
            showGoalCrossing
            bare
            className="h-[240px] md:h-[340px] mt-3"
          />
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {t("trajectory.noWeight")}
        </p>
      )}
    </Tile>
  );
}
